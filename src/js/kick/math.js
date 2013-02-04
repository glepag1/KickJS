define(["./math/Vec2", "./math/Vec3", "./math/Vec4", "./math/Mat2", "./math/Mat3", "./math/Mat4", "./math/Quat", "./math/Frustum", "./math/Aabb"],
    function (vec2, vec3, vec4, mat2, mat3, mat4, quat, frustum, aabb) {
        return {
            Vec2: vec2,
            Vec3: vec3,
            Vec4: vec4,
            Mat2: mat2,
            Mat3: mat3,
            Mat4: mat4,
            Quat: quat,
            Frustum: frustum,
            Aabb: aabb
        };
    }
);