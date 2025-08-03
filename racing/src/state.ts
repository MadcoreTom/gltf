import { GltfWrapper } from "../../core/wrapper"
import { Controls } from "./const"
import { Keyboard } from "./keyboard"

export type State = {
    time: number,
    deltaTime: number,
    keyboard: Keyboard<Controls>,
    car: {
        wheelAngle: number,
        steer: number
    },
    gltf:GltfWrapper
}

export function initState(keyboard: Keyboard<Controls>, gltf:GltfWrapper): State {
    return {
        time: 0,
        deltaTime: 1,
        keyboard,
        car: {
            wheelAngle: 0,
            steer: 0
        },
        gltf
    }
}