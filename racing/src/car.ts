import { quat2 } from "gl-matrix";
import { Controls } from "./const";
import { State } from "./state";

export function updateCar(state: State) {
    const { car, gltf } = state;

    car.wheelAngle += state.keyboard.isDown(Controls.ACCEL) ? state.deltaTime / 100 : 0;
    const w = car.wheelAngle;

    let steerTarget = 0;
    if(state.keyboard.isDown(Controls.RIGHT)){
        steerTarget = 1;
    }
    if(state.keyboard.isDown(Controls.LEFT)){
        steerTarget = -1;
    }
    // car.steer = car.steer * 0.9; // TODO framerate dependennt
car.steer = steerTarget + (car.steer - steerTarget) * Math.pow(0.99, state.deltaTime);

    const fr = gltf.getNodeByName("fr");
    if (fr) {
        fr.rotation = quat2.rotateY(quat2.create(), quat2.create(), car.steer * 0.6);
        quat2.rotateZ(fr.rotation, fr.rotation, w);
    }
    const bl = gltf.getNodeByName("bl");
    if (bl) {
        bl.rotation = quat2.rotateZ(quat2.create(), quat2.create(), w);
        quat2.rotateY(bl.rotation, bl.rotation, Math.PI);
    }
    const br = gltf.getNodeByName("br");
    if (br) {
        br.rotation = quat2.rotateZ(quat2.create(), quat2.create(), w);
    }
    const fl = gltf.getNodeByName("fl");
    if (fl) {
        fl.rotation = quat2.rotateY(quat2.create(), quat2.create(), car.steer * 0.6);
        quat2.rotateZ(fl.rotation, fl.rotation, w);
        quat2.rotateY(fl.rotation, fl.rotation, Math.PI);
    }
}