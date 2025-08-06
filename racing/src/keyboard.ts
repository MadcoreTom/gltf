export class Keyboard<ENUM extends number> {
    private readonly keys: { [control: number]: boolean } = {};
    public constructor(elem: HTMLElement | Window, private readonly mapping: { [key: string]: ENUM }) {
        elem.addEventListener("keydown", evt => this.handle((evt as KeyboardEvent).code, true));
        elem.addEventListener("keyup", evt => this.handle((evt as KeyboardEvent).code, false));
    }

    private handle(code: string, down: boolean) {
        const c = this.mapping[code];
        if (c !== undefined) {
            this.keys[c] = down;
        }
    }

    public isDown(control: ENUM) {
        return !!this.keys[control];
    }

    public isTyped(control: ENUM) {
        const v = !!this.keys[control];
        this.keys[control] = false;
        return v;
    }
}