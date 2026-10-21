import * as THREE from 'three';
import { canvasTexture, CM, mat, RoundedBoxGeometry } from './props';

/**
 * DualSense-style controller with real, separate buttons. The group's
 * `userData.buttons` maps a button name to its mesh, and `userData.sticks`
 * holds the two thumbsticks, so GameMode can press, light and tilt them.
 *
 * Built with the face up (+y) and the grips toward -z (the player's side).
 */
export type ButtonName =
    | 'up'
    | 'down'
    | 'left'
    | 'right'
    | 'triangle'
    | 'circle'
    | 'cross'
    | 'square'
    | 'l1'
    | 'r1'
    | 'l2'
    | 'r2'
    | 'share'
    | 'options'
    | 'ps'
    | 'pad';

const TOP = 3.25 * CM;

function symbol(draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
    return canvasTexture(64, 64, (ctx, w) => {
        ctx.fillStyle = '#1c1c22';
        ctx.fillRect(0, 0, w, w);
        ctx.lineWidth = 6;
        draw(ctx, w);
    });
}

const SYMBOLS = {
    triangle: () =>
        symbol((ctx, s) => {
            ctx.strokeStyle = '#40e0a0';
            ctx.beginPath();
            ctx.moveTo(s / 2, s * 0.2);
            ctx.lineTo(s * 0.8, s * 0.75);
            ctx.lineTo(s * 0.2, s * 0.75);
            ctx.closePath();
            ctx.stroke();
        }),
    circle: () =>
        symbol((ctx, s) => {
            ctx.strokeStyle = '#ff5a6e';
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s * 0.28, 0, Math.PI * 2);
            ctx.stroke();
        }),
    cross: () =>
        symbol((ctx, s) => {
            ctx.strokeStyle = '#7ab4ff';
            ctx.beginPath();
            ctx.moveTo(s * 0.25, s * 0.25);
            ctx.lineTo(s * 0.75, s * 0.75);
            ctx.moveTo(s * 0.75, s * 0.25);
            ctx.lineTo(s * 0.25, s * 0.75);
            ctx.stroke();
        }),
    square: () =>
        symbol((ctx, s) => {
            ctx.strokeStyle = '#ff8ad8';
            ctx.strokeRect(s * 0.25, s * 0.25, s * 0.5, s * 0.5);
        }),
};

export function buildController() {
    const g = new THREE.Group();
    const white = mat.std('#f2f2f4', 0.35);
    const black = mat.std('#16161a', 0.4);
    const buttons: { [name: string]: THREE.Mesh } = {};

    const body = new THREE.Mesh(new RoundedBoxGeometry(16 * CM, 3.2 * CM, 7 * CM, 3, 1.4 * CM), white);
    body.position.y = 1.6 * CM;
    g.add(body);
    for (const sx of [-1, 1]) {
        const grip = new THREE.Mesh(new RoundedBoxGeometry(4.5 * CM, 3 * CM, 8 * CM, 3, 1.4 * CM), black);
        grip.position.set(sx * 6 * CM, 1.5 * CM, -2.5 * CM);
        grip.rotation.y = sx * 0.3;
        g.add(grip);
    }
    const lightBar = new THREE.Mesh(new THREE.BoxGeometry(6.4 * CM, 0.25 * CM, 0.3 * CM), mat.glow('#3d8bff'));
    lightBar.position.set(0, 3.2 * CM, 2.6 * CM);
    g.add(lightBar);

    const add = (name: ButtonName, mesh: THREE.Mesh, x: number, z: number, y = TOP) => {
        mesh.position.set(x * CM, y, z * CM);
        mesh.userData.restY = y;
        mesh.userData.button = name;
        g.add(mesh);
        buttons[name] = mesh;
    };

    // touchpad (clickable too)
    add('pad', new THREE.Mesh(new THREE.BoxGeometry(6 * CM, 0.2 * CM, 3 * CM), mat.std('#202026', 0.3)), 0, 1);

    // d-pad: four separate arms
    const arm = () => new THREE.Mesh(new THREE.BoxGeometry(0.9 * CM, 0.35 * CM, 0.9 * CM), mat.std('#2a2a30', 0.4));
    add('up', arm(), -4.6, 0.1);
    add('down', arm(), -4.6, -1.7);
    add('left', arm(), -5.5, -0.8);
    add('right', arm(), -3.7, -0.8);

    // face buttons with their symbols on top
    const face = (name: 'triangle' | 'circle' | 'cross' | 'square') => {
        const tex = SYMBOLS[name]();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * CM, 0.5 * CM, 0.35 * CM, 20), [
            mat.std('#1c1c22', 0.4),
            // the glow follows the symbol, so a pressed button lights its own shape
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0 }),
            mat.std('#1c1c22', 0.4),
        ]);
        return m;
    };
    add('triangle', face('triangle'), 4.6, 0.1);
    add('cross', face('cross'), 4.6, -1.7);
    add('square', face('square'), 3.7, -0.8);
    add('circle', face('circle'), 5.5, -0.8);

    // small buttons
    const pill = () => new THREE.Mesh(new THREE.BoxGeometry(0.4 * CM, 0.25 * CM, 0.9 * CM), mat.std('#1c1c22', 0.4));
    add('share', pill(), -3.4, 1.9);
    add('options', pill(), 3.4, 1.9);
    add('ps', new THREE.Mesh(new THREE.CylinderGeometry(0.45 * CM, 0.45 * CM, 0.3 * CM, 20), mat.std('#101014', 0.3, 0.4)), 0, -2.6);

    // shoulders and triggers on the far edge
    const bumper = () => new THREE.Mesh(new RoundedBoxGeometry(3 * CM, 0.6 * CM, 1 * CM, 2, 0.25 * CM), mat.std('#e8e8ec', 0.35));
    add('l1', bumper(), -5.4, 3.5, 2.7 * CM);
    add('r1', bumper(), 5.4, 3.5, 2.7 * CM);
    const trigger = () => new THREE.Mesh(new RoundedBoxGeometry(2.6 * CM, 1.2 * CM, 1 * CM, 2, 0.4 * CM), mat.std('#e8e8ec', 0.35));
    add('l2', trigger(), -5.4, 3.7, 1.4 * CM);
    add('r2', trigger(), 5.4, 3.7, 1.4 * CM);

    // thumbsticks (they tilt, they don't press)
    const sticks: THREE.Object3D[] = [];
    for (const sx of [-1, 1]) {
        const pivot = new THREE.Object3D();
        pivot.position.set(sx * 2.3 * CM, TOP - 0.2 * CM, -2.6 * CM);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * CM, 0.35 * CM, 0.8 * CM, 12), black);
        post.position.y = 0.4 * CM;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.85 * CM, 0.8 * CM, 0.35 * CM, 24), mat.std('#202026', 0.6));
        cap.position.y = 0.85 * CM;
        pivot.add(post, cap);
        g.add(pivot);
        sticks.push(pivot);
    }

    g.userData.buttons = buttons;
    g.userData.sticks = sticks;
    return g;
}

/** Push a button down (and light its symbol), or let it back up */
export function setButton(mesh: THREE.Mesh | undefined, down: boolean) {
    if (!mesh) return;
    const rest = mesh.userData.restY as number;
    mesh.position.y = down ? rest - 0.18 * CM : rest;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial && m.map) m.emissiveIntensity = down ? 0.6 : 0;
    }
}
