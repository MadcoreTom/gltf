import { vec3 } from "gl-matrix";
import { GltfAnimationChannel } from "./schema";

abstract class AnimationChannel<T> {
    public constructor(public readonly gltfChannel: GltfAnimationChannel, private readonly time: Float32Array, protected readonly value: Float32Array) {
        console.log("New channel", time, time[0])
    }

    protected abstract getValue(time: number): T;
    protected abstract lerpValues(before: number, after: number, lerp: number): T;

    public getValueAtTime(time: number): T {
        let before = -1;
        let after = -1;
        for (let i = 0; i < this.time.length -1; i++) {
            if (time >= this.time[i] && time < this.time[i+1]) {
                // console.log("found", time, [...this.time])
                // the problem is here
                after = i+1;
                before = i;
                // i = this.time.length;
            }
        }

        if (after <0) {
            return this.getValue(this.time.length - 1);
        } else if (before <0) {
            return this.getValue(0);
        }  else {
            const timeRange = this.time[after] - this.time[before];
            const lerpVal = (time - this.time[before]) / timeRange;
            return this.lerpValues(before, after, lerpVal);
        }
    }
}

export class AnimationChannelVec3 extends AnimationChannel<vec3> {

    protected getValue(idx: number): vec3 {
        return vec3.fromValues(
            this.value[idx * 3 + 0],
            this.value[idx * 3 + 1],
            this.value[idx * 3 + 2]
        )
    }

    protected lerpValues(i, j, v): vec3 {
        const u = 1 - v;
        return vec3.fromValues(
            this.value[i * 3 + 0] * u + this.value[j * 3 + 0] * v,
            this.value[i * 3 + 1] * u + this.value[j * 3 + 1] * v,
            this.value[i * 3 + 2] * u + this.value[j * 3 + 2] * v
        )
    }
}


export type Animation = {
    // rotation?:AnimationChannel,
    scale?: AnimationChannelVec3,
    // translation?:AnimationChannel,
}