import * as THREE from 'three';
import Application from '../../Application';

/**
 * The PC's keyboard and mouse follow yours: every keycap is cut out of the
 * baked keyboard so it can press down when you hit that key (typing in the room
 * or inside the PC), and the desk mouse slides around with your pointer and
 * clicks its buttons when you click.
 */

// Keycap rows on the baked model, front to back, keyed by the event.code they belong to.
// Within a row the caps are in left-to-right order (main block, nav cluster, numpad).
const ROWS: (string | null)[][] = [
    ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'PrintScreen', 'ScrollLock', 'Pause', null],
    ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace', 'Insert', 'Home', 'PageUp', 'NumLock', 'NumpadDivide', 'NumpadMultiply', 'NumpadSubtract'],
    ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Enter', 'Delete', 'End', 'PageDown', 'Numpad7', 'Numpad8', 'Numpad9', 'NumpadAdd'],
    ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Backslash', 'Numpad4', 'Numpad5', 'Numpad6', 'NumpadAdd'],
    ['ShiftLeft', 'IntlBackslash', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight', 'ArrowUp', 'Numpad1', 'Numpad2', 'Numpad3', 'NumpadEnter'],
    ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'ControlRight', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Numpad0', 'NumpadDecimal'],
];

// Keys typed inside the PC arrive with only `key` (no `code`), so map them back
const KEY_TO_CODE: { [key: string]: string } = {
    ' ': 'Space',
    Enter: 'Enter',
    Backspace: 'Backspace',
    Tab: 'Tab',
    Shift: 'ShiftLeft',
    Control: 'ControlLeft',
    Alt: 'AltLeft',
    Meta: 'MetaLeft',
    Escape: 'Escape',
    CapsLock: 'CapsLock',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    Delete: 'Delete',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    Insert: 'Insert',
    '`': 'Backquote',
    '~': 'Backquote',
    '-': 'Minus',
    _: 'Minus',
    '=': 'Equal',
    '+': 'Equal',
    '[': 'BracketLeft',
    '{': 'BracketLeft',
    ']': 'BracketRight',
    '}': 'BracketRight',
    '\\': 'Backslash',
    '|': 'Backslash',
    ';': 'Semicolon',
    ':': 'Semicolon',
    "'": 'Quote',
    '"': 'Quote',
    ',': 'Comma',
    '<': 'Comma',
    '.': 'Period',
    '>': 'Period',
    '/': 'Slash',
    '?': 'Slash',
    '!': 'Digit1',
    '@': 'Digit2',
    '#': 'Digit3',
    $: 'Digit4',
    '%': 'Digit5',
    '^': 'Digit6',
    '&': 'Digit7',
    '*': 'Digit8',
    '(': 'Digit9',
    ')': 'Digit0',
};
const codeForKey = (key: string) => {
    if (KEY_TO_CODE[key]) return KEY_TO_CODE[key];
    if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
    if (/^[0-9]$/.test(key)) return `Digit${key}`;
    if (/^F\d{1,2}$/.test(key)) return key;
    return null;
};

const KEY_TRAVEL = 9; // how far a cap goes down (world units, ~0.25cm)

type Piece = { geometry: THREE.BufferGeometry; center: THREE.Vector3; min: THREE.Vector3; max: THREE.Vector3 };

export default class DeskInputs {
    application: Application;
    scene: THREE.Scene;
    keys: { [code: string]: THREE.Mesh[] } = {};
    down: { [code: string]: number } = {}; // code -> time it went down
    mouse: THREE.Object3D | null = null;
    mouseButtons: THREE.Mesh[] = [];
    mouseRest = new THREE.Vector3();
    mouseOffset = new THREE.Vector3();
    clicks = [0, 0];

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.setKeyboard();
        this.setMouse();

        const press = (code: string | null, isDown: boolean) => {
            if (!code || !this.keys[code]) return;
            if (isDown) this.down[code] = performance.now();
            else delete this.down[code];
        };
        // typing in the room: real codes. Typing inside the PC: the iframe's key relayed as a
        // CustomEvent (no code), so map the key back.
        document.addEventListener('keydown', (e) => {
            const key = String(e.key || '').replace(/^_AUTO_/, '');
            press(e.code || codeForKey(key), true);
        });
        document.addEventListener('keyup', (e) => {
            const key = String(e.key || '').replace(/^_AUTO_/, '');
            press(e.code || codeForKey(key), false);
        });
        document.addEventListener('mousedown', (e) => (this.clicks[e.button === 2 ? 1 : 0] = performance.now()));
    }

    /* ------------------------------------------------------------ keyboard */

    setKeyboard() {
        const keyboard = this.scene.getObjectByName('keyboard') as THREE.Mesh | undefined;
        if (!keyboard) return;
        const pieces = splitPieces(keyboard, (p) => p.min.y > -440 && p.max.x - p.min.x < 600);
        // rows by the height of the cap tops (the board is tilted, each row sits a bit lower)
        const tops = Array.from(new Set(pieces.map((p) => Math.round(p.max.y / 5) * 5))).sort((a, b) => b - a);
        const rows: Piece[][] = tops.map(() => []);
        for (const p of pieces) rows[tops.indexOf(Math.round(p.max.y / 5) * 5)].push(p);
        rows.forEach((row, r) => {
            const names = ROWS[r];
            if (!names) return;
            row.sort((a, b) => a.min.x - b.min.x).forEach((p, i) => {
                const code = names[i];
                const mesh = new THREE.Mesh(p.geometry, keyboard.material);
                this.scene.add(mesh);
                if (!code) return;
                (this.keys[code] = this.keys[code] || []).push(mesh);
            });
        });
    }

    /* --------------------------------------------------------------- mouse */

    setMouse() {
        const mouse = this.scene.getObjectByName('mouse') as THREE.Mesh | undefined;
        if (!mouse) return;
        this.mouse = mouse;
        this.mouseRest.copy(mouse.position);
        // the two small pieces on top are the buttons; cut them out so they can click
        const buttons = splitPieces(mouse, (p) => p.max.x - p.min.x < 120).sort((a, b) => a.min.x - b.min.x);
        for (const b of buttons) {
            const m = new THREE.Mesh(b.geometry, mouse.material);
            this.scene.add(m);
            this.mouseButtons.push(m);
        }
    }

    update() {
        const now = performance.now();
        // caps go down while held; a quick tap still shows for a moment
        for (const code in this.keys) {
            const t = this.down[code];
            const held = t !== undefined && now - t < 2000;
            for (const cap of this.keys[code]) {
                const target = held ? -KEY_TRAVEL : 0;
                cap.position.y += (target - cap.position.y) * 0.6;
            }
            if (t !== undefined && now - t > 2000) delete this.down[code];
        }

        if (!this.mouse) return;
        // the desk mouse drifts with your pointer (a few cm on the mouse pad)
        const sizes = this.application.sizes;
        const m = this.application.mouse;
        const tx = THREE.MathUtils.clamp((m.x / sizes.width - 0.5) * 360, -170, 170);
        const tz = THREE.MathUtils.clamp((m.y / sizes.height - 0.5) * 300, -140, 140);
        this.mouseOffset.x += (tx - this.mouseOffset.x) * 0.25;
        this.mouseOffset.z += (tz - this.mouseOffset.z) * 0.25;
        this.mouse.position.copy(this.mouseRest).add(this.mouseOffset);
        this.mouseButtons.forEach((b, i) => {
            const pressed = now - this.clicks[i] < 120;
            b.position.set(this.mouseOffset.x, pressed ? -6 : 0, this.mouseOffset.z);
        });
    }
}

/**
 * Cut the connected pieces of `mesh` that pass `keep` out into their own
 * world-space geometries (removing them from `mesh`).
 */
function splitPieces(mesh: THREE.Mesh, keep: (p: Piece) => boolean): Piece[] {
    mesh.updateMatrixWorld(true);
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    const index = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);

    // union-find over vertices joined by triangles or sharing a position
    const parent = Array.from({ length: pos.count }, (_, i) => i);
    const find = (a: number): number => (parent[a] === a ? a : (parent[a] = find(parent[a])));
    const union = (a: number, b: number) => (parent[find(a)] = find(b));
    const seen: { [k: string]: number } = {};
    for (let i = 0; i < pos.count; i++) {
        const k = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
        if (seen[k] !== undefined) union(i, seen[k]);
        else seen[k] = i;
    }
    for (let f = 0; f < index.length; f += 3) {
        union(index[f], index[f + 1]);
        union(index[f], index[f + 2]);
    }

    // world-space bounds per piece
    const v = new THREE.Vector3();
    const bounds: { [root: number]: { min: THREE.Vector3; max: THREE.Vector3 } } = {};
    for (let i = 0; i < pos.count; i++) {
        const r = find(i);
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        const b = (bounds[r] = bounds[r] || { min: new THREE.Vector3(Infinity, Infinity, Infinity), max: new THREE.Vector3(-Infinity, -Infinity, -Infinity) });
        b.min.min(v);
        b.max.max(v);
    }
    const chosen = new Set<number>();
    for (const r in bounds) {
        const b = bounds[r];
        const piece = { geometry: new THREE.BufferGeometry(), center: b.min.clone().add(b.max).multiplyScalar(0.5), min: b.min, max: b.max };
        if (keep(piece)) chosen.add(Number(r));
    }

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const out: { [root: number]: { p: number[]; n: number[]; uv: number[] } } = {};
    const keepTris: number[] = [];
    const n = new THREE.Vector3();
    for (let f = 0; f < index.length; f += 3) {
        const r = find(index[f]);
        if (!chosen.has(r)) {
            keepTris.push(index[f], index[f + 1], index[f + 2]);
            continue;
        }
        const o = (out[r] = out[r] || { p: [], n: [], uv: [] });
        for (let k = 0; k < 3; k++) {
            const i = index[f + k];
            v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
            o.p.push(v.x, v.y, v.z);
            if (geo.attributes.normal) {
                n.fromBufferAttribute(geo.attributes.normal as THREE.BufferAttribute, i).applyMatrix3(normalMatrix).normalize();
                o.n.push(n.x, n.y, n.z);
            }
            if (geo.attributes.uv) o.uv.push(geo.attributes.uv.getX(i), geo.attributes.uv.getY(i));
        }
    }
    geo.setIndex(keepTris);

    return Object.keys(out).map((r) => {
        const o = out[Number(r)];
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3));
        if (o.n.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3));
        if (o.uv.length) g.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
        const b = bounds[Number(r)];
        return { geometry: g, center: b.min.clone().add(b.max).multiplyScalar(0.5), min: b.min, max: b.max };
    });
}
