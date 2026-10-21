import * as THREE from 'three';
import { canvasTexture, CM, mat, RoundedBoxGeometry } from './props';

/**
 * DualSense controller with real, separate buttons, modeled on the actual pad:
 * white shell with flared grips, a black center section holding the two black
 * thumbsticks and the PS button, a white touchpad with light bars down both
 * sides, the d-pad on the left, △ ○ ✕ □ on the right (grey symbols), Create /
 * Options at the touchpad's top corners, and L1/L2 · R1/R2 on the top edge.
 *
 * `userData.buttons` maps a button name to its mesh and `userData.sticks` holds
 * [left, right] thumbstick pivots, so GameMode can press, light and tilt them.
 * The pad's face is up (+y) and its grips point toward -z (the player).
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
    | 'pad'
    | 'mute';

const T = 2.6 * CM; // shell thickness: the top face sits at y = T

function symbol(draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
    return canvasTexture(64, 64, (ctx, w) => {
        ctx.fillStyle = '#e4e4ea';
        ctx.fillRect(0, 0, w, w);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#8c8c96';
        draw(ctx, w);
    });
}

const SYMBOLS = {
    triangle: () =>
        symbol((ctx, s) => {
            ctx.beginPath();
            ctx.moveTo(s / 2, s * 0.22);
            ctx.lineTo(s * 0.78, s * 0.72);
            ctx.lineTo(s * 0.22, s * 0.72);
            ctx.closePath();
            ctx.stroke();
        }),
    circle: () =>
        symbol((ctx, s) => {
            ctx.beginPath();
            ctx.arc(s / 2, s / 2, s * 0.26, 0, Math.PI * 2);
            ctx.stroke();
        }),
    cross: () =>
        symbol((ctx, s) => {
            ctx.beginPath();
            ctx.moveTo(s * 0.27, s * 0.27);
            ctx.lineTo(s * 0.73, s * 0.73);
            ctx.moveTo(s * 0.73, s * 0.27);
            ctx.lineTo(s * 0.27, s * 0.73);
            ctx.stroke();
        }),
    square: () =>
        symbol((ctx, s) => {
            ctx.strokeRect(s * 0.28, s * 0.28, s * 0.44, s * 0.44);
        }),
};

/** Top-view outline (x = player's right, y = away from the player), in cm */
function shellShape() {
    const s = new THREE.Shape();
    s.moveTo(-6.6, 3.6);
    s.lineTo(6.6, 3.6);
    s.quadraticCurveTo(8.1, 3.5, 8.2, 1.6);
    // right grip flares down and out, then rounds off
    s.quadraticCurveTo(8.4, -3.2, 7.4, -6.0);
    s.quadraticCurveTo(6.4, -7.4, 4.8, -6.6);
    s.quadraticCurveTo(3.8, -5.6, 3.4, -3.4);
    // the dip between the grips
    s.quadraticCurveTo(0, -2.2, -3.4, -3.4);
    s.quadraticCurveTo(-3.8, -5.6, -4.8, -6.6);
    s.quadraticCurveTo(-6.4, -7.4, -7.4, -6.0);
    s.quadraticCurveTo(-8.4, -3.2, -8.2, 1.6);
    s.quadraticCurveTo(-8.1, 3.5, -6.6, 3.6);
    return s;
}

/** The black center section: below the touchpad, between the grips */
function centerShape() {
    const s = new THREE.Shape();
    s.moveTo(-3.6, 0.9);
    s.lineTo(3.6, 0.9);
    s.quadraticCurveTo(4.1, -1.4, 3.3, -3.25);
    s.quadraticCurveTo(0, -2.1, -3.3, -3.25);
    s.quadraticCurveTo(-4.1, -1.4, -3.6, 0.9);
    return s;
}

/** Extrude a top-view shape (cm) into a slab lying flat, top at y = top */
function slab(shape: THREE.Shape, depth: number, top: number, material: THREE.Material, bevel = 0.5) {
    // the outline is in cm (scaled up below) but depth is along z (not scaled), so bevelSize is in cm
    // and bevelThickness in world units
    const geo = new THREE.ExtrudeGeometry(shape, { depth: depth * CM, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel * CM, bevelSegments: 4, curveSegments: 24 });
    geo.scale(CM, CM, 1);
    // shape y (away from the player) -> world -z after this rotation; extrusion -> +y
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.y = top - depth * CM - bevel * CM;
    return mesh;
}

export function buildController() {
    const g = new THREE.Group();
    const white = mat.std('#f2f2f5', 0.38);
    const black = mat.std('#141418', 0.42);
    const buttons: { [name: string]: THREE.Mesh } = {};

    g.add(slab(shellShape(), 1.6, T, white, 0.5));
    g.add(slab(centerShape(), 0.1, T + 0.12 * CM, black, 0.05));

    // z here: negative = away from the player (top of the pad), positive = toward the grips
    const add = (name: ButtonName, mesh: THREE.Mesh, x: number, z: number, y = T + 0.2 * CM) => {
        mesh.position.set(x * CM, y, z * CM);
        mesh.userData.restY = y;
        mesh.userData.button = name;
        g.add(mesh);
        buttons[name] = mesh;
    };

    // white touchpad with the light bars down both sides
    add('pad', new THREE.Mesh(new RoundedBoxGeometry(6.6 * CM, 0.3 * CM, 2.7 * CM, 2, 0.25 * CM), mat.std('#f7f7fa', 0.3)), 0, -2.3);
    for (const sx of [-1, 1]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22 * CM, 0.32 * CM, 2.5 * CM), mat.glow('#3d8bff'));
        bar.position.set(sx * 3.5 * CM, T + 0.18 * CM, -2.3 * CM);
        g.add(bar);
    }

    // d-pad: four separate arrow buttons, on the left
    const arrow = (len: number, wid: number) => new THREE.Mesh(new RoundedBoxGeometry(wid * CM, 0.35 * CM, len * CM, 2, 0.15 * CM), mat.std('#e4e4ea', 0.35));
    add('up', arrow(1.0, 0.8), -5.3, -1.85);
    add('down', arrow(1.0, 0.8), -5.3, 0.25);
    add('left', arrow(0.8, 1.0), -6.35, -0.8);
    add('right', arrow(0.8, 1.0), -4.25, -0.8);

    // face buttons on the right: △ top, ✕ bottom, □ left, ○ right
    const face = (name: 'triangle' | 'circle' | 'cross' | 'square') => {
        const tex = SYMBOLS[name]();
        const side = mat.std('#e4e4ea', 0.3);
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.52 * CM, 0.52 * CM, 0.35 * CM, 24), [
            side,
            new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0 }),
            side,
        ]);
        // a cylinder's cap maps the texture's up to +x; turn it so △ points at the top edge
        m.rotation.y = Math.PI / 2;
        return m;
    };
    add('triangle', face('triangle'), 5.3, -1.9);
    add('cross', face('cross'), 5.3, 0.3);
    add('square', face('square'), 4.2, -0.8);
    add('circle', face('circle'), 6.4, -0.8);

    // Create / Options at the touchpad's top corners
    const pill = () => new THREE.Mesh(new RoundedBoxGeometry(0.45 * CM, 0.3 * CM, 0.95 * CM, 2, 0.2 * CM), black);
    add('share', pill(), -4.1, -3.0);
    add('options', pill(), 4.1, -3.0);

    // PS button and mic mute in the black center
    add('ps', new THREE.Mesh(new THREE.CylinderGeometry(0.5 * CM, 0.5 * CM, 0.25 * CM, 24), mat.std('#2a2a30', 0.25, 0.4)), 0, 1.55);
    add('mute', new THREE.Mesh(new RoundedBoxGeometry(1.0 * CM, 0.25 * CM, 0.35 * CM, 2, 0.15 * CM), mat.std('#2a2a30', 0.3)), 0, 2.35);

    // bumpers on the top edge, triggers behind and below them
    const bumper = () => new THREE.Mesh(new RoundedBoxGeometry(3.2 * CM, 0.7 * CM, 1.0 * CM, 2, 0.3 * CM), white);
    add('l1', bumper(), -5.6, -4.05, T - 0.2 * CM);
    add('r1', bumper(), 5.6, -4.05, T - 0.2 * CM);
    const trigger = () => new THREE.Mesh(new RoundedBoxGeometry(2.8 * CM, 1.3 * CM, 1.4 * CM, 2, 0.5 * CM), white);
    add('l2', trigger(), -5.6, -4.3, T - 1.5 * CM);
    add('r2', trigger(), 5.6, -4.3, T - 1.5 * CM);

    // black thumbsticks in the center section (they tilt, they don't press)
    const sticks: THREE.Object3D[] = [];
    for (const sx of [-1, 1]) {
        const pivot = new THREE.Object3D();
        pivot.position.set(sx * 2.25 * CM, T, 0.75 * CM);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * CM, 0.4 * CM, 0.9 * CM, 16), black);
        post.position.y = 0.45 * CM;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * CM, 0.85 * CM, 0.4 * CM, 28), black);
        cap.position.y = 0.95 * CM;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.88 * CM, 0.09 * CM, 8, 28), mat.std('#24242a', 0.6));
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 1.16 * CM;
        pivot.add(post, cap, rim);
        g.add(pivot);
        sticks.push(pivot);
    }

    // the shell above is drawn with the grips toward +z; turn it so the grips face -z (the player) and
    // the d-pad ends up on the player's left
    const outer = new THREE.Group();
    g.rotation.y = Math.PI;
    outer.add(g);
    outer.userData.buttons = buttons;
    outer.userData.sticks = sticks;
    return outer;
}

/** Push a button down (and light its symbol), or let it back up */
export function setButton(mesh: THREE.Mesh | undefined, down: boolean) {
    if (!mesh) return;
    const rest = mesh.userData.restY as number;
    mesh.position.y = down ? rest - 0.18 * CM : rest;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial && m.emissiveMap) m.emissiveIntensity = down ? 0.5 : 0;
    }
}
