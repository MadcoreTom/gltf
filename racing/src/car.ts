import { quat2 } from "gl-matrix";
import { Controls } from "./const";
import { State } from "./state";

const SPEED = 1 / 30; // max speed
const MAX_STEER = 0.75; // limit of left/right steering (radians)
const STEER_RATE = 0.995; // rate that wheels reach the target steering direction

export function updateCar(state: State) {
    const { car, gltf } = state;

    let target = 0;
    let rate = 0.999;
    if (state.keyboard.isDown(Controls.ACCEL)) {
        target = 1;
    } else if (state.keyboard.isDown(Controls.DECEL)) {
        target = -0.5;
    } else {
        rate = 0.9995;
    }
    target = Math.pow(Math.cos(car.steer * 5), 2) * target; // slows down the taget vel more if you're steering sharply
    car.vel = target + (car.vel - target) * Math.pow(rate, state.deltaTime);

    const movement = car.vel * SPEED * state.deltaTime;
    const diameter = 1.6; // i made this up. please measure it

    car.wheelAngle += (movement / (Math.PI * diameter)) * Math.PI * 2;// factorize if it works
    const w = car.wheelAngle;

    car.pos[0] -= Math.cos(-car.yaw) * movement;
    car.pos[2] -= Math.sin(-car.yaw) * movement;
    
    // maximum steering is reduced by the speed
    const maxSteer = MAX_STEER / (1+car.vel*3)

    let steerTarget = 0;
    if (state.keyboard.isDown(Controls.RIGHT)) {
        steerTarget = -maxSteer;
    }
    if (state.keyboard.isDown(Controls.LEFT)) {
        steerTarget = maxSteer;
    }
    car.steer = steerTarget + (car.steer - steerTarget) * Math.pow(STEER_RATE, state.deltaTime);

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