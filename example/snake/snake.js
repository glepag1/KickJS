requirejs.config({
    baseUrl: '.',
    paths: {
        kick: location.search === "?local" ? "../../src/js/kick" :
            (location.search === "?debug" ? '../../build/kick-debug' : '../../build/kick')
    }
});

requirejs(['kick'],
    function (kick) {
        "use strict";
        var initSnake = function () {

            var vec3 = kick.math.Vec3,
                mat4 = kick.math.Mat4,
                constants = kick.core.Constants,
                gameController;

            function SnakeFood(snakeLevelComponent, snakes) {
                var position = [10, 0, 10],
                    transform,
                    levelSize = snakeLevelComponent.size;
                this.activated = function () {
                    var engine = kick.core.Engine.instance,
                        shader = engine.project.load(engine.project.ENGINE_SHADER_DIFFUSE),
                        material = new kick.material.Material({
                            shader: shader,
                            name: "SnakeFood material",
                            uniformData: {
                                mainColor: [108/255, 93/255, 36/255, 1]
                            }
                        }),
                        mesh = engine.project.load(engine.project.ENGINE_MESH_UVSPHERE);
                    transform = this.gameObject.transform;

                    var meshRenderer = new kick.scene.MeshRenderer();
                    meshRenderer.mesh = mesh;
                    meshRenderer.material = material;
                    this.gameObject.addComponent(meshRenderer);
                    transform.localPosition = position;
                    transform.localScale = [.5,.5,.5];
                };

                this.respawn = function(){
                    do{
                        position[0] = parseInt(Math.random()*levelSize-levelSize*0.5);
                        position[2] = parseInt(Math.random()*levelSize-levelSize*0.5);
                        console.log(position[0],position[2]);
                        var isIntersection = snakeLevelComponent.isIntersecting(position);
                        if (!isIntersection ){
                            for (var i = snakes.length-1;i>=0;i--){
                                isIntersection = isIntersection || snakes[i].isIntersecting(position,true);
                            }
                        }
                    } while (isIntersection );

                    transform.localPosition = position;
                };

                this.isIntersecting = function(testPosition){
                    return Math.abs(testPosition[0]-position[0])<0.1 &&
                        Math.abs(testPosition[2]-position[2])<0.1;
                }
            }

            function SnakeTail(tailPosition){
                var _tail,
                    transform,
                    position = vec3.clone(tailPosition);

                this.activated = function (){
                    transform = this.gameObject.transform;
                    transform.localPosition = position;
                };

                this.move = function(newPosition){
                    if (_tail){
                        _tail.move(position);
                    }
                    vec3.copy(position, newPosition);
                    if (transform){
                        transform.localPosition = position;
                    }
                };

                Object.defineProperties(this,{
                        position:{
                            get:function(){
                                return position;
                            }
                        },
                        tail:{
                            get:function(){
                                return _tail;
                            },
                            set:function(newValue){
                                _tail = newValue;
                            }
                        }
                    }
                );
            }

            function SnakeComponent(engine,keyLeft,keyRight,initialLength,initialMovePosition,initialMoveDirection, color){
                var meshRenderer,
                    time,
                    transform,
                    input,
                    snakeTail,
                    _score = 0,
                    moveDirection = vec3.clone(initialMoveDirection || [1,0,0]),
                    position = vec3.clone(initialMovePosition || [0,0,0]),
                    scene = engine.activeScene,
                    currentMovement = 0, // limits movement to not go backwards
                    shader = engine.project.load(engine.project.ENGINE_SHADER_DIFFUSE),
                    material = new kick.material.Material({
                        shader:shader,
                        name:"Snake material",
                        uniformData:{
                            mainColor: color
                        }
                    }),
                    mesh = new kick.mesh.Mesh(
                        {
                            dataURI:"kickjs://mesh/cube/?length=0.45",
                            name:"Snake body"
                        }),
                    rotateLeft = function(){
                        if (currentMovement==-1){
                            return;
                        }
                        currentMovement--;
                        if (moveDirection[0]){
                            moveDirection[2] = -moveDirection[0];
                            moveDirection[0] = 0;
                        } else {
                            moveDirection[0] = moveDirection[2];
                            moveDirection[2] = 0;
                        }
                    },
                    rotateRight = function(){
                        if (currentMovement==1){
                            return;
                        }
                        currentMovement++;
                        if (moveDirection[0]){
                            moveDirection[2] = moveDirection[0];
                            moveDirection[0] = 0;
                        } else {
                            moveDirection[0] = -moveDirection[2];
                            moveDirection[2] = 0;
                        }
                    };
                Object.defineProperties(this,{
                    position:{
                        get:function(){
                            return position;
                        }
                    },
                    score:{
                        get:function(){
                            return _score;
                        },
                        set:function(newValue){
                            _score = newValue;
                        }
                    }
                });
                this.move = function(){
                    if (snakeTail){
                        snakeTail.move(position);
                    }
                    vec3.add(position,position,moveDirection);
                    transform.position = position;
                    currentMovement = 0;
                    return position;
                };

                this.isIntersecting = function(aPosition, includeHead){
                    var vec3Equal = function(v1,v2){
                        for (var i=0;i<3;i++){
                            var diff = v1[i]-v2[i];
                            if (Math.abs(diff)>constants._EPSILON){
                                return false;
                            }
                        }
                        return true;
                    };
                    if (includeHead){
                        if (vec3Equal(aPosition, position)){
                            return true;
                        }
                    }
                    var tail = snakeTail;
                    while (tail){
                        if (vec3Equal(aPosition, tail.position)){
                            return true;
                        }
                        tail = tail.tail;
                    }
                    return false;
                };
                this.activated = function (){
                    input = engine.keyInput;
                    transform = this.gameObject.transform;
                    transform.position = position;
                    time = engine.time;
                    meshRenderer = new kick.scene.MeshRenderer();
                    this.gameObject.addComponent(meshRenderer);
                    meshRenderer.material = material;
                    meshRenderer.mesh = mesh;
                };

                var addTail = function(tailPosition){
                    var gameObject = scene.createGameObject({
                        name:"SnakeComponent"
                    });
                    var meshRenderer = new kick.scene.MeshRenderer();
                    gameObject.addComponent(meshRenderer);
                    meshRenderer.mesh = mesh;
                    meshRenderer.material = material;
                    var tail = new SnakeTail(tailPosition);
                    gameObject.addComponent(tail);
                    if (!snakeTail){
                        snakeTail = tail;
                    } else {
                        var tailChild = snakeTail;
                        while (tailChild.tail){
                            tailChild = tailChild.tail;
                        }
                        tailChild.tail = tail;
                    }
                };

                this.update = function(){
                    if (input.isKeyDown(keyLeft)){
                        rotateLeft();
                    } else if (input.isKeyDown(keyRight)){
                        rotateRight();
                    } else if (input.isKeyDown(keyLeft+1)){
                        this.die();
                    }
                };

                this.grow = function(){
                    addTail(position); // start by positioning the tail at the head - on next move the tail will be located correct
                };

                this.reset = function(){
                    this.respawn();
                    _score = 0;
                };

                this.respawn = function(){
                    // remove children
                    var tailChild = snakeTail;
                    do {
                        tailChild.gameObject.destroy();
                        tailChild = tailChild.tail;
                    } while (tailChild);
                    snakeTail = null;

                    vec3.copy(moveDirection, initialMoveDirection || [1,0,0]);
                    vec3.copy(position, initialMovePosition || [0,0,0]);

                    transform.position = position;
                    init();
                };

                this.die = function(){
                    this.respawn();
                };

                var init = function(){
                    var childPosition = vec3.clone(position),
                        tailDirection = vec3.multiply(vec3.create(),[-1,-1,-1],moveDirection);
                    for (var i=0;i<initialLength;i++){
                        vec3.add(childPosition,childPosition,tailDirection);
                        addTail(childPosition);
                    }
                };
                init();
            }

            function SnakeLevelComponent(){
                var meshRenderer,
                    shader,
                    material,
                    size = 60,
                    sizeHalf = size/2,
                    thisObj = this;

                Object.defineProperty(this,"size",{value:size});

                this.deactivated = function(){
                    console.log("wat");
                };

                this.activated = function (){
                    var engine = kick.core.Engine.instance;
                    meshRenderer = thisObj.gameObject.getComponentOfType(kick.scene.MeshRenderer);

                    shader = engine.project.load(engine.project.ENGINE_SHADER_DIFFUSE);
                    console.log("Level uid "+thisObj.uid);
                    console.log("Mesh renderer "+meshRenderer.uid);
                    material = new kick.material.Material({
                        shader:shader,
                        name:"Snake level material",
                        uniformData:{
                            mainColor: [56/255,67/255,51/255,1]
                        }
                    });

                    meshRenderer.material = material;

                    var scaleWidthMatrix = mat4.scale(mat4.create(), mat4.create(),[size+1,1,1]);
                    var scaleHeightMatrix = mat4.scale(mat4.create(), mat4.create(),[1,1,size]);
                    var wideCube = kick.mesh.MeshDataFactory.createCubeData(0.5).transform(scaleWidthMatrix);
                    var tallCube = kick.mesh.MeshDataFactory.createCubeData(0.5).transform(scaleHeightMatrix);
                    var meshData = new kick.mesh.MeshData({
                        meshType:wideCube.meshType,
                        vertex:[],
                        normal:[],
                        indices:[],
                        uv1:[]
                    });
                    var translateUpMatrix         = mat4.translate(mat4.create(),mat4.create(),[0,0,-size/2]);
                    var translateDownHeightMatrix = mat4.translate(mat4.create(),mat4.create(),[0,0,size/2]);
                    meshData = meshData.combine(wideCube.transform(translateUpMatrix));
                    meshData = meshData.combine(wideCube.transform(translateDownHeightMatrix));
                    var translateLeftMatrix        = mat4.translate(mat4.create(),mat4.create(),[-size/2,0,0]);
                    var translateRightHeightMatrix = mat4.translate(mat4.create(),mat4.create(),[size/2,0,0]);
                    meshData = meshData.combine(tallCube.transform(translateLeftMatrix));
                    meshData = meshData.combine(tallCube.transform(translateRightHeightMatrix));

                    meshRenderer.mesh = new kick.mesh.Mesh({name:"Level",meshData:meshData});
                };

                this.isIntersecting = function(position){
                    var x = position[0],
                        z = position[2];
                    return x == sizeHalf || x == -sizeHalf || z == sizeHalf || z == -sizeHalf;
                };
            }

            function GameController(engine,level){
                var keyCodeA = 65,
                    keyCodeZ = 90,
                    keyCodeM = 65+12,
                    keyCodeK = 65+10,
                    timeSinceMove = 0,
                    timeSinceGrow = 0,
                    time = engine.time,
                    activeScene = engine.activeScene,
                    _gameSpeed = 125,
                    _growSpeed = 1500,
                    food;
                Object.defineProperties(this,{
                    gameSpeed:{
                        get:function(){return _gameSpeed},
                        set:function(newValue){_gameSpeed = newValue;}
                    }
                });
                var addSnake = function(moveLeft,moveRight, movePos, moveDir,color){
                    var snakeGameObject = activeScene.createGameObject({name:"SnakeHead"});
                    var snakeComponent = new SnakeComponent(engine,moveLeft,moveRight,7,movePos,moveDir,color);
                    snakeGameObject.addComponent(snakeComponent);
                    return snakeComponent;
                };

                var snakes = [
                    addSnake(keyCodeA,keyCodeZ,[-5,0,-15],[1,0,0],[62/255,90/255,96/255,1]),
                    addSnake(keyCodeM,keyCodeK,[5,0,15],[-1,0,0],[77/255,63/255,96/255,1])
                ];

                this.getSnakes = function(){
                    return snakes;
                };

                this.activated = function(){
                    engine.paused = true;
                    food = this.gameObject.scene.findComponentsOfType(SnakeFood)[0];
                };
                this.update = function(){
                    var snakeLength =snakes.length,
                        snake,
                        i,j,
                        testForSelfIntersection,
                        deadSnakes = [],
                        snakePosition,
                        deltaTime = time.deltaTime;
                    timeSinceMove += deltaTime;
                    timeSinceGrow += deltaTime;
                    if (timeSinceGrow >= _growSpeed){
                        for (i=0;i<snakeLength;i++){
                            snake = snakes[i];
                            snake.grow();
                        }
                        timeSinceGrow = 0;
                    }
                    if (timeSinceMove >= _gameSpeed){
                        // move snakes
                        for (i=0;i<snakeLength;i++){
                            snake = snakes[i];
                            snake.move();
                        }

                        // intersection test
                        for (i=0;i<snakeLength;i++){
                            snake = snakes[i];
                            snakePosition = snake.position;
                            // test for intersection with other snakes (including self)
                            for (j=0;j<snakeLength;j++){
                                testForSelfIntersection = i===j;
                                if (snakes[j].isIntersecting(snakePosition,!testForSelfIntersection)){
                                    if (!kick.core.Util.contains(deadSnakes,snake)){
                                        deadSnakes.push(snake);
                                    }
                                    break;
                                }
                            }
                            // test for level intersection
                            if (level.isIntersecting(snakePosition)){
                                if (!kick.core.Util.contains(deadSnakes,snake)){
                                    deadSnakes.push(snake);
                                }
                            }

                            // test for intersection with food
                            if (food.isIntersecting(snakePosition)){
                                snake.score += 10;
                                food.respawn();
                            }
                        }
                        for (i=0;i<deadSnakes.length;i++){
                            snake = deadSnakes[i];
                            snake.die();
                            snake.score -= 1;
                        }
                        timeSinceMove = 0;
                        updateScore(snakes);
                    }
                };
            }

            function initLights(){
                var ambientlightGameObject = engine.activeScene.createGameObject();
                ambientlightGameObject.name = "ambient light";
                var ambientLight = new kick.scene.Light({type :kick.scene.Light.TYPE_AMBIENT});
                ambientLight.color = [0.5,0.5,0.5];
                ambientlightGameObject.addComponent(ambientLight);

                var lightGameObject = engine.activeScene.createGameObject();
                lightGameObject.name = "directional light";
                var light = new kick.scene.Light(
                    {
                        type:kick.scene.Light.TYPE_DIRECTIONAL,
                        color:[1,1,1],
                        intensity:1.5
                    }
                );
                lightGameObject.transform.localRotationEuler = [-70,20,0];
                lightGameObject.addComponent(light);
            }

            var engine;
            var camera;
            function initKick() {
                engine = new kick.core.Engine('canvas',{
                    enableDebugContext: location.search === "?debug" // debug enabled if query == debug
                });
                initLights();
                var activeScene = engine.activeScene;
                var cameraObject = activeScene.createGameObject({name:"Camera"});
                camera = new kick.scene.Camera({
                    clearColor: [124/255,163/255,137/255,1],
                    fieldOfView: 90
                });
                cameraObject.addComponent(camera);

                var cameraTransform = cameraObject.transform;
                cameraTransform.localPosition = [0,40,0];
                cameraTransform.localRotationEuler = [-90,0,0];

                var levelGameObject = activeScene.createGameObject({name:"Level"});
                var levelComponent = new SnakeLevelComponent();
                var meshRenderer = new kick.scene.MeshRenderer();
                levelGameObject.addComponent(meshRenderer);
                levelGameObject.addComponent(levelComponent);

                gameController = new GameController(engine,levelComponent);
                levelGameObject.addComponent(gameController);

                var foodGameObject = activeScene.createGameObject({name:"Food"});
                var foodComponent = new SnakeFood(levelComponent,gameController.getSnakes());
                foodGameObject.addComponent(foodComponent);
            }
            initKick();

            function documentResized(){
                var canvas = document.getElementById('canvas');
                canvas.width = window.innerWidth;
                canvas.height = Math.max(600,(window.innerHeight)-canvas.offsetTop);
                engine.canvasResized();
            }
            documentResized();


            var playerScores = [
                document.getElementById('player1score'),
                document.getElementById('player2score')
            ];
            function updateScore(snakes){
                for (var i=0;i<snakes.length;i++){
                    playerScores[i].innerHTML = snakes[i].score;
                }
            }

            window.YUI().use('slider','panel', function (Y) {
                var xSlider = new Y.Slider({
                    min   : 225,
                    max   : 25,
                    value: gameController.gameSpeed
                });
                xSlider.render( ".snakespeed" );

                function updateInput( e ) {
                    gameController.gameSpeed = parseInt( e.newVal );
                }

                var xInput = Y.one( "#horiz_value" );
                xSlider.on( "valueChange", updateInput, xInput );

                var panel = new Y.Panel({
                    srcNode: "#panelContent",
                    width: 250,
                    y: 100,
                    x: 5,
                    buttons:[],
                    centered: false,
                    visible: true,
                    modal:false,
                    headerContent: "Snake"
                });

                panel.render();
            });

            function playButtonClicked(){
                var isPaused = engine.paused;
                this.innerHTML = (!isPaused)?"Play":"Stop";
                if (isPaused){
                    var snakes = gameController.getSnakes();
                    for (var i=0;i<snakes.length;i++){
                        snakes[i].reset();
                    }
                    engine.paused = false;
                } else {
                    engine.paused = true;
                }
            }

            function toogleCamera(){
                if (camera.perspective){
                    camera.perspective = false;
                    camera.near = -100;
                    camera.far = 100;
                    camera.top = 35;
                    camera.bottom = -35;
                    camera.left = -35;
                    camera.right = 35;
                } else {
                    camera.perspective = true;
                    camera.near = 0.1;
                    camera.far = 100;
                }
            }

            function keyListener(e){
                if (e.keyCode==80){ // p
                    toogleCamera();
                }
            }

            function toogleFullscreen(){
                if (engine.isFullScreenSupported()){
                    engine.setFullscreen(true);
                } else {
                    alert("Fullscreen is not supported in this browser");
                }
            }

            window.onresize = documentResized;
            document.getElementById('playButton').addEventListener('click',playButtonClicked,false);
            document.getElementById('fullscreen').addEventListener('click',toogleFullscreen,false);
            document.addEventListener('keyup',keyListener,true);
        };

        initSnake();
    });