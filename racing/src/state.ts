import { vec3 } from "gl-matrix"
import { GltfWrapper } from "../../core/wrapper"
import { Controls } from "./const"
import { Keyboard } from "./keyboard"

export type State = {
    time: number,
    deltaTime: number,
    keyboard: Keyboard<Controls>,
    car: {
        wheelAngle: number,
        steer: number,
        pos: vec3,
        yaw: number
    },
    gltf: GltfWrapper,
    track: GltfWrapper,
    camera: vec3
}

export function initState(keyboard: Keyboard<Controls>, gltf: GltfWrapper,track:GltfWrapper): State {
    return {
        time: 0,
        deltaTime: 1,
        keyboard,
        car: {
            wheelAngle: 0,
            steer: 0,
            pos: [0, 0, 0],
            yaw: Math.PI
        },
        gltf,
        camera: [-6, 5, 0],
        track
    }
}