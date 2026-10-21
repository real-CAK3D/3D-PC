import * as THREE from 'three';
import BezierEasing from 'bezier-easing';
import Application from '../../Application';
import { CameraKey } from '../../Camera/Camera';
import UIEventBus from '../../UI/EventBus';
import Entertainment from './Entertainment';
import { FLOOR_Y, shadows } from './props';

// RetroPad button indices (what EmulatorJS's simulateInput takes)
const PAD = { B: 0, Y: 1, SELECT: 2, START: 3, UP: 4, DOWN: 5, LEFT: 6, RIGHT: 7, A: 8, X: 9, L: 10, R: 11 };
const STICK = { RIGHT: 16, LEFT: 17, DOWN: 18, UP: 19 };
// PlayStation names for them: cross = B, circle = A, square = Y, triangle = X
const CROSS = PAD.B;
const CIRCLE = PAD.A;
const SQUARE = PAD.Y;
const TRIANGLE = PAD.X;

/** Two layouts, swapped with B */
export const LAYOUTS: { name: string; keys: { [key: string]: number } }[] = [
    {
        name: 'WASD d-pad',
        keys: { w: PAD.UP, a: PAD.LEFT, s: PAD.DOWN, d: PAD.RIGHT, o: TRIANGLE, j: SQUARE, ' ': CROSS, p: CIRCLE },
    },
    {
        name: 'Arrow d-pad',
        keys: {
            arrowup: PAD.UP,
            arrowleft: PAD.LEFT,
            arrowdown: PAD.DOWN,
            arrowright: PAD.RIGHT,
            w: TRIANGLE,
            a: SQUARE,
            s: CROSS,
            ' ': CROSS,
            d: CIRCLE,
        },
    },
    {
        // right hand on IJKL, left hand on the face buttons: no reaching for the arrows
        name: 'IJKL d-pad',
        keys: { i: PAD.UP, j: PAD.LEFT, k: PAD.DOWN, l: PAD.RIGHT, w: TRIANGLE, a: SQUARE, s: CROSS, ' ': CROSS, d: CIRCLE },
    },
];
// Standard Gamepad API button order -> RetroPad (a real PS/Xbox controller, USB or Bluetooth)
const GAMEPAD: { [button: number]: number } = {
    0: CROSS,
    1: CIRCLE,
    2: SQUARE,
    3: TRIANGLE,
    4: PAD.L,
    5: PAD.R,
    8: PAD.SELECT,
    9: PAD.START,
    12: PAD.UP,
    13: PAD.DOWN,
    14: PAD.LEFT,
    15: PAD.RIGHT,
};
// the same in every layout
const COMMON: { [key: string]: number } = { f: PAD.SELECT, h: PAD.START, q: PAD.L, e: PAD.R };

const ZOOM_EASE = BezierEasing(0.13, 0.99, 0, 1);
const TABLE_SPOT = new THREE.Vector3(-8400, FLOOR_Y + 1400, 3300);

/**
 * Couch gaming: M (or the PS5, or the controller on the coffee table) turns it
 * on. The controller lifts into your hands, the emulator shows up on the TV,
 * and the keyboard / mouse drive the controller. Clicking the screen zooms in.
 */
export default class GameMode {
    application: Application;
    scene: THREE.Scene;
    entertainment: Entertainment;
    controller: THREE.Group;
    on = false;
    layout = 0;
    held = 0; // 0 on the table .. 1 in your hands
    pressed: { [index: number]: boolean } = {};

    constructor(entertainment: Entertainment) {
        this.application = new Application();
        this.scene = this.application.scene;
        this.entertainment = entertainment;

        this.controller = shadows(Entertainment.controller());
        this.controller.position.copy(TABLE_SPOT);
        this.controller.rotation.y = 0.5;
        this.controller.userData.focus = CameraKey.TV;
        this.controller.userData.focusViews = [CameraKey.TV, CameraKey.TV_SCREEN, CameraKey.STEREO];
        this.controller.userData.onClick = () => this.setOn(!this.on);
        this.scene.add(this.controller);

        UIEventBus.on('gameMode', (state: { on: boolean }) => this.setOn(state.on));
        document.addEventListener('keydown', (e) => this.onKey(e, true));
        document.addEventListener('keyup', (e) => this.onKey(e, false));
        document.addEventListener('mousemove', (e) => this.onMouse(e));
        // keys and clicks while the TV frame has focus
        window.addEventListener('message', (event) => {
            const d = event.data;
            if (!d || typeof d.type !== 'string') return;
            if (d.type === 'cak3d-tv-key') this.handleKey(String(d.key), !!d.down);
            if (d.type === 'cak3d-tv-click') this.zoomToScreen();
        });
    }

    setOn(on: boolean) {
        if (on === this.on) return;
        this.on = on;
        const camera = this.application.camera;
        if (on) {
            if (camera.currentKeyframe !== CameraKey.TV_SCREEN) camera.transition(CameraKey.TV, 1800, ZOOM_EASE);
        } else {
            this.releaseAll();
            if (camera.currentKeyframe === CameraKey.TV_SCREEN) camera.transition(CameraKey.TV, 1200);
        }
        // the emulator takes over the TV; putting the controller down brings the channel back
        this.entertainment.tv.showGame(on);
        if (!on) this.entertainment.tune(this.entertainment.channel);
        UIEventBus.dispatch('gameModeState', { on, layout: LAYOUTS[this.layout].name });
    }

    zoomToScreen() {
        if (!this.on) return;
        const camera = this.application.camera;
        if (camera.currentKeyframe !== CameraKey.TV_SCREEN) camera.transition(CameraKey.TV_SCREEN, 1600, ZOOM_EASE);
    }

    /* ----------------------------------------------------------- input */

    onKey(e: KeyboardEvent, down: boolean) {
        // keys typed on the PC come through as events from its iframe; leave those alone
        // @ts-ignore
        if (e.inComputer || this.application.camera.currentKeyframe === CameraKey.MONITOR) return;
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        if (this.handleKey(e.key, down)) e.preventDefault();
    }

    /** Returns true if the key did something */
    handleKey(rawKey: string, down: boolean): boolean {
        const key = rawKey.toLowerCase();
        if (key === 'm') {
            if (down) this.setOn(!this.on);
            return true;
        }
        if (!this.on) return false;
        if (down && key === 'b') {
            this.layout = (this.layout + 1) % LAYOUTS.length;
            this.releaseAll();
            UIEventBus.dispatch('gameModeState', { on: true, layout: LAYOUTS[this.layout].name });
            return true;
        }
        // L is the legend, except in the IJKL layout where it's d-pad right (use ; there)
        const legendKey = LAYOUTS[this.layout].keys.l !== undefined ? ';' : 'l';
        if (down && key === legendKey) {
            UIEventBus.dispatch('toggleLegend', {});
            return true;
        }
        if (down && key === 'g') {
            // PS button: back to the game library
            const win = this.entertainment.tv.emulator.contentWindow as any;
            if (win && win.cak3dHome) win.cak3dHome();
            return true;
        }
        const index = key in COMMON ? COMMON[key] : LAYOUTS[this.layout].keys[key];
        if (index === undefined) return false;
        this.press(index, down);
        return true;
    }

    press(index: number, down: boolean, value = 1) {
        if (!!this.pressed[index] === down && value === 1) return;
        this.pressed[index] = down;
        const win = this.entertainment.tv.emulator.contentWindow as any;
        if (win && win.cak3dInput) win.cak3dInput(index, down ? value : 0);
    }

    releaseAll() {
        Object.keys(this.pressed).forEach((i) => this.press(Number(i), false));
    }

    /** The mouse is the left stick: distance from the middle of the screen */
    onMouse(e: MouseEvent) {
        if (!this.on) return;
        // @ts-ignore
        if (e.inComputer) return;
        const sizes = this.application.sizes;
        const x = THREE.MathUtils.clamp((e.clientX / sizes.width - 0.5) * 2.4, -1, 1);
        const y = THREE.MathUtils.clamp((e.clientY / sizes.height - 0.5) * 2.4, -1, 1);
        const dead = 0.15;
        const axis = (v: number) => (Math.abs(v) < dead ? 0 : Math.round(((Math.abs(v) - dead) / (1 - dead)) * 0x7fff));
        this.stick(STICK.RIGHT, x > 0 ? axis(x) : 0);
        this.stick(STICK.LEFT, x < 0 ? axis(x) : 0);
        this.stick(STICK.DOWN, y > 0 ? axis(y) : 0);
        this.stick(STICK.UP, y < 0 ? axis(y) : 0);
    }

    pads: { [key: string]: boolean } = {};

    /** A plugged-in or paired controller drives the game too */
    pollGamepad() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (const pad of Array.from(pads)) {
            if (!pad) continue;
            pad.buttons.forEach((b, i) => {
                if (i === 16) {
                    // PS / Xbox button: back to the library
                    if (b.pressed && !this.pads[`ps${pad.index}`]) this.handleKey('g', true);
                    this.pads[`ps${pad.index}`] = b.pressed;
                    return;
                }
                const index = GAMEPAD[i];
                if (index === undefined) return;
                const id = `${pad.index}:${i}`;
                if (b.pressed !== !!this.pads[id]) {
                    this.pads[id] = b.pressed;
                    this.press(index, b.pressed);
                }
            });
            const axis = (v: number) => (Math.abs(v) < 0.15 ? 0 : Math.round(Math.min(1, Math.abs(v)) * 0x7fff));
            const [x, y] = pad.axes;
            this.stick(STICK.RIGHT, x > 0 ? axis(x) : 0);
            this.stick(STICK.LEFT, x < 0 ? axis(x) : 0);
            this.stick(STICK.DOWN, y > 0 ? axis(y) : 0);
            this.stick(STICK.UP, y < 0 ? axis(y) : 0);
        }
    }

    stick(index: number, value: number) {
        this.pressed[index] = value > 0;
        const win = this.entertainment.tv.emulator.contentWindow as any;
        if (win && win.cak3dInput) win.cak3dInput(index, value);
    }

    /* ---------------------------------------------------------- update */

    update() {
        const dt = Math.min(this.application.time.delta, 50) / 1000;
        // walking away from the couch puts the controller down
        const camera = this.application.camera;
        const view = camera.currentKeyframe || camera.targetKeyframe;
        if (this.on && view && [CameraKey.TV, CameraKey.TV_SCREEN, CameraKey.STEREO].indexOf(view) < 0) this.setOn(false);
        this.held += ((this.on ? 1 : 0) - this.held) * Math.min(1, dt * 4);
        const cam = this.application.camera.instance;
        if (this.on) this.pollGamepad();
        if (this.held < 0.01) {
            this.controller.position.copy(TABLE_SPOT);
            this.controller.rotation.set(0, 0.5, 0);
            return;
        }
        // lift off the table into your hands: just below the middle of the view
        const hands = new THREE.Vector3(0, -640, -2300).applyMatrix4(cam.matrixWorld);
        const k = easeInOut(this.held);
        this.controller.position.copy(TABLE_SPOT).lerp(hands, k);
        this.controller.position.y += Math.sin(k * Math.PI) * 300;
        const grip = cam.quaternion.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.9, Math.PI, 0)));
        const rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.5, 0));
        this.controller.quaternion.copy(rest).slerp(grip, k);
    }
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
