define(["./scene/Camera", "./scene/Component", "./scene/EngineUniforms", "./scene/GameObject", "./scene/Light", "./scene/MeshRenderer", "./scene/Scene", "./scene/SceneLights", "./scene/Transform", "./scene/Skybox"],
    function (Camera, Component, EngineUniforms, GameObject, Light, MeshRenderer, Scene, SceneLights, Transform, Skybox) {
        "use strict";

        return {
            Camera: Camera,
            Component: Component,
            EngineUniforms: EngineUniforms,
            GameObject: GameObject,
            Light: Light,
            MeshRenderer: MeshRenderer,
            Scene: Scene,
            SceneLights: SceneLights,
            Transform: Transform,
            Skybox: Skybox
        };
    });