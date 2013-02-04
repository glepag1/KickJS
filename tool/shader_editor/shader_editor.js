var ShaderEditor = function () {
    "use strict";

    var KICK = window.KICK,
        _engine,
        _meshRenderer,
        previousShaderError = false,
        _light,
        lastValidMaterial,
        _ambientLight,
        camera,
        _lightTransform,
        shader = null,
        thisObj = this,
        isRotating = true,
        meshsetting,
        setMesh = function (url) {
            _meshRenderer.mesh = new KICK.mesh.Mesh(_engine, {dataURI: url});
        },
        setMeshByName = function (name) {
            _meshRenderer.mesh = _engine.project.loadByName(name);
        },
        logFn = function (output, clear) {
            if (window.log) {
                if (clear) {
                    window.log.clearConsole();
                }
                window.log.log(output);
            } else {
                console.log(output);
            }
        },
        convertOldUniformData = function (material) {
            var name;
            material.uniformData = {};
            for (name in material.uniforms) {
                if (material.uniforms.hasOwnProperty(name)) {
                    material.uniformData[name] = material.uniforms[name].value;
                }
            }
            delete material.uniforms;
        },
        loadMaterial = function (shaderData) {
            var i,
                textures = shaderData.textureData,
                uniform,
                missingAttributes,
                textureMapping,
                textureConf,
                t,
                activeUniforms,
                materialUniform;
            shaderData.shader.uid = 0; // set shader uid to 0 (to avoid conflicts)
            shader = new KICK.material.Shader(_engine, shaderData.shader);
            shader.faceCulling = KICK.core.Constants.GL_NONE;
            missingAttributes = _meshRenderer.mesh.verify(shader);
            if (missingAttributes) {
                logFn("Missing mesh vertex attributes.");
                return;
            }
            textureMapping = {};
            thisObj.textures = [];
            for (i = 0; i < textures.length; i++) {
                textureConf = textures[i];
                t = new KICK.texture.Texture(_engine);
                textureMapping[textureConf.uid] = t;
                thisObj.updateTexture(t, textureConf);
                thisObj.textures.push(t);
            }
            if (shaderData.material.uniforms) {
                convertOldUniformData(shaderData.material);
            }
            activeUniforms = shader.activeUniforms;
            for (i = 0; i < activeUniforms.length; i++) {
                uniform = activeUniforms[i];
                if (uniform.type === KICK.core.Constants.GL_SAMPLER_2D || uniform.type === KICK.core.Constants.GL_SAMPLER_CUBE) {
                    materialUniform = shaderData.material.uniformData[uniform.name];
                    if (materialUniform) {
                        if (materialUniform.ref) {
                            shaderData.material.uniformData[uniform.name] = textureMapping[materialUniform.ref];
                        }
                    } else { // recover from broken data (texture reference not saved)
                        if (thisObj.textures.length > 0) {
                            shaderData.material.uniformData[uniform.name] = thisObj.textures[0]; // potentially this doesn't work - but since majority of all textures are 2D textures this should be ok
                        }
                    }
                }
            }
            shaderData.material.shader = shader;
            console.log(shaderData.material);
            if (_meshRenderer.material) {
                _meshRenderer.material.destroy();
            }
            _meshRenderer.material = new KICK.material.Material(_engine, shaderData.material);
            lastValidMaterial = _meshRenderer.material.toJSON();
        },
        addRotatorComponent = function (gameObject) {
            var time = _engine.time,
                transform = gameObject.transform,
                rotationSpeed = 0.05,
                rotation = transform.localRotationEuler;
            gameObject.addComponent({
                update: function () {
                    if (isRotating) {
                        rotation[1] += time.deltaTime * rotationSpeed;
                        transform.localRotationEuler = rotation;
                    } else {
                        transform.localRotationEuler = [0, 0, 0];
                    }
                }
            });
        };

    this.textures = [];

    Object.defineProperties(this,
        {
            engine: {
                get: function () { return _engine; }
            },
            mesh: {
                get: function () {
                    return _meshRenderer.mesh;
                },
                set: function (value) {
                    _meshRenderer.mesh = value;
                }
            },
            material: {
                get: function () {
                    return _meshRenderer.material;
                }
            }
        });

    this.updateSettings = function (settings) {
        _ambientLight.color = settings.lightAmbient;
        _light.intensity = settings.lightintensity;
        _light.color = settings.lightcolor;
        _lightTransform.rotationEuler = settings.lightrot;
        isRotating = settings.rotatemesh === "on";
        var cameraTransform = camera.gameObject.transform;
        if (settings.projection === "perspective") {
            camera.fieldOfView = 60;
            camera.perspective = true;
            camera.near = 0.1;
            camera.far = 10;
            cameraTransform.localPosition = [0, 0, 2];
        } else {
            camera.perspective = false;
            camera.near = -1;
            camera.far = 1;
            cameraTransform.localPosition = [0, 0, 0];
        }
        if (meshsetting !== settings.meshsetting) {
            meshsetting = settings.meshsetting;
            switch (meshsetting) {
            case "cube":
                setMesh("kickjs://mesh/cube/?length=0.5");
                break;
            case "sphere":
                setMesh('kickjs://mesh/uvsphere/');
                break;
            case "teapot":
                setMeshByName('Teapot');
                break;
            case "head":
                setMeshByName('Head');
                break;
            default:
                setMesh('kickjs://mesh/plane/');
                break;
            }
        }
    };

    /**
     * @method updateTexture
     * @param texture
     * @param config
     * @return {KICK.texture.Texture}
     */
    this.updateTexture = function (texture, config, fnSetImageSrc) {
        var name,
            img = new Image(),
            loadImageUsingProxy = function () {
                var imgProxied = new Image();
                imgProxied.onload = function () {
                    try {
                        texture.setImage(imgProxied, config.dataURI);
                    } catch (e) {
                        logFn("Error loading texture " + config.dataURI.substring(0, 100));
                    }
                };
                console.log("Loading using proxy " + thisObj.getWrappedImageSource(config.dataURI));
                imgProxied.src = thisObj.getWrappedImageSource(config.dataURI);
                if (fnSetImageSrc) {
                    fnSetImageSrc(thisObj.getWrappedImageSource(config.dataURI));
                }
            },
            loadImageUsingProxyAfter5Sec = setTimeout(loadImageUsingProxy, 5000);
        console.log(config.dataURI);
        for (name in config) {
            if (config.hasOwnProperty(name)) {
                if (typeof name === 'string' && name !== "dataURI" && name !== "uid") {
                    try {
                        texture[name] = config[name];
                    } catch (ignore) {
                        // ignore
                    }
                }
            }
        }

        img.onload = function () {
            clearTimeout(loadImageUsingProxyAfter5Sec);
            try {
                texture.setImage(img, config.dataURI);
            } catch (e) {
                console.log("Exception when loading image - trying to load using image proxy", e);
                loadImageUsingProxy();
            }
        };
        img.onerror = function (e) {
            clearTimeout(loadImageUsingProxyAfter5Sec);
            console.log("Error using image - trying to load using image proxy", e);
            loadImageUsingProxy();
        };
        img.crossOrigin = "anonymous"; // Ask for a CORS image
        img.src = config.dataURI;
        if (fnSetImageSrc) {
            fnSetImageSrc(config.dataURI);
        }
    };

    this.getWrappedImageSource = function (imgSrc) {
        if (!imgSrc) {
            return "";
        }
        var origin = location.origin;
        if (!origin) {
            origin = location.protocol + "//" + location.host;
        }
        if (imgSrc.indexOf("http") === 0 && imgSrc.indexOf(origin + "/") === -1) {
            return origin + "/images/imageProxy?url=" + encodeURIComponent(imgSrc);
        } else {
            return imgSrc;
        }
    };

    this.loadMaterial = loadMaterial; // expose

    this.canvasResized = function () {
        _engine.canvasResized();
    };

    this.initKick = function (onComplete, shader) {
        try {
            _engine = new KICK.core.Engine('canvas', {
                preserveDrawingBuffer: true,
                checkCanvasResizeInterval: 0
            });
            var initEngine = function () {
                var cameraObject = _engine.activeScene.createGameObject(),
                    gameObject,
                    ambientlightGameObject,
                    lightGameObject;
                camera = new KICK.scene.Camera({
                    clearColor: [0, 0, 0, 1],
                    perspective: false,
                    near: -1,
                    far: 1
                });
                cameraObject.addComponent(camera);

                gameObject = _engine.activeScene.createGameObject();
                _meshRenderer = new KICK.scene.MeshRenderer();
                setMesh("kickjs://mesh/plane/");
                if (shader) {
                    // load saved content
                    loadMaterial(shader);
                }

                gameObject.addComponent(_meshRenderer);
                addRotatorComponent(gameObject);

                ambientlightGameObject = _engine.activeScene.createGameObject();
                _ambientLight = new KICK.scene.Light({type: KICK.scene.Light.TYPE_AMBIENT});
                _ambientLight.color = [0.1, 0.1, 0.1];
                ambientlightGameObject.addComponent(_ambientLight);

                lightGameObject = _engine.activeScene.createGameObject();
                _light = new KICK.scene.Light({type: KICK.scene.Light.TYPE_DIRECTIONAL});
                lightGameObject.addComponent(_light);
                _lightTransform = lightGameObject.transform;
                onComplete();
            };
            _engine.project.loadProjectByURL('project.json', initEngine);
        } catch (e) {
            debugger;
            logFn(e);
        }
    };

    function addMissingUniforms() {
        var material = _meshRenderer.material,
            name,
            missingUniform,
            defaultUniform,
            i,
            isFound,
            texture;
        for (name in shader.lookupUniform) {
            if (shader.lookupUniform.hasOwnProperty(name)) {
                if (name.substring(0, 1) !== "_" && !material.getUniform(name)) {
                    missingUniform = shader.lookupUniform[name];
                    switch (missingUniform.type) {
                    case KICK.core.Constants.GL_SAMPLER_2D:
                    case KICK.core.Constants.GL_SAMPLER_CUBE:
                        for (i = 0; i < thisObj.textures; i++) {
                            if (thisObj.textures[i].textureType === missingUniform.type) {
                                defaultUniform = thisObj.textures[i];
                            }
                        }
                        isFound = defaultUniform;
                        if (!isFound) {
                            if (missingUniform.type === KICK.core.Constants.GL_SAMPLER_2D) {
                                texture = _engine.project.load(_engine.project.ENGINE_TEXTURE_WHITE);
                            } else {
                                texture = _engine.project.load(_engine.project.ENGINE_TEXTURE_CUBEMAP_WHITE);
                            }
                            if (thisObj.textures.indexOf(texture) < 0) {
                                thisObj.textures.push(texture);
                            }
                            defaultUniform = texture;
                        }
                        break;
                    }
                    if (defaultUniform) {
                        material.setUniform(name, defaultUniform);
                    }
                }
            }
        }
    }

    this.apply = function (vs, fs) {
        if (!previousShaderError) {
            lastValidMaterial = _meshRenderer.material.toJSON();
            if (!lastValidMaterial.uniformData){
                debugger;
            }
            console.log("backup of shader ", lastValidMaterial);
        }
        shader.vertexShaderSrc = vs;
        shader.fragmentShaderSrc = fs;
        shader.errorLog = logFn;
        var missingAttributes,
            shaderCompiledSuccessfully = shader.apply(),
            onError = function () {
                previousShaderError = true;
                console.log(KICK.material.Shader.getPrecompiledSource(_engine, vs));
                console.log(KICK.material.Shader.getPrecompiledSource(_engine, fs));
                document.body.style.backgroundColor = 'pink';
            };


        if (!shaderCompiledSuccessfully) {
            onError();
            return;
        } else {
            addMissingUniforms();
        }
        missingAttributes = _meshRenderer.mesh.verify(shader);
        if (missingAttributes) {
            logFn("Missing attributes in mesh " + JSON.stringify(missingAttributes));
            onError();
            return;
        }
        if (previousShaderError) {
            logFn("Shader compiled ok", true);
            document.body.style.backgroundColor = 'white';
            previousShaderError = false;
            if (lastValidMaterial) {
                console.log(_engine.project.toJSON());
                console.log("Restore of ", lastValidMaterial);
                console.log("Restore of ", JSON.parse(JSON.stringify(lastValidMaterial)));
                // restore material
                delete lastValidMaterial.uid;
                lastValidMaterial.shader = shader;
                _meshRenderer.material = new KICK.material.Material(_engine, lastValidMaterial);
            }
        }
    };
};

var shaderEditor = new ShaderEditor();