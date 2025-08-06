import { quat2 } from "gl-matrix";
import { Controls } from "./const";
import { State } from "./state";

export function updateCar(state: State) {
    const { car, gltf } = state;

    const movement = state.keyboard.isDown(Controls.ACCEL) ? state.deltaTime / 100 : (state.keyboard.isDown(Controls.DECEL) ? state.deltaTime / -50 : 0);
    const diameter = 1.6; // i made this up. please measure it

    car.wheelAngle += (movement / (Math.PI * diameter)) * Math.PI * 2;// factorize if it works
    const w = car.wheelAngle;

    car.pos[0] -= Math.cos(-car.yaw) * movement;
    car.pos[2] -= Math.sin(-car.yaw) * movement;

    let steerTarget = 0;
    if (state.keyboard.isDown(Controls.RIGHT)) {
        steerTarget = -1;
    }
    if (state.keyboard.isDown(Controls.LEFT)) {
        steerTarget = 1;
    }
    car.steer = steerTarget + (car.steer - steerTarget) * Math.pow(0.99, state.deltaTime);

    // Some sort of fudge factor, but apart from slippage or whatever it seems like a linear relationship
    car.yaw += car.steer * 2 * movement / Math.PI / 2;

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