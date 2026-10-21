import * as THREE from 'three';
import { canvasTexture, CM, RoundedBoxGeometry } from './props';
import { StashItem, StashModel } from './stash';

/**
 * Little hardware props for the drawers. Each one is built lying in the XY
 * plane with its face (screen / silkscreen) pointing +z, sized in real cm.
 */
export function gadget(model: StashModel, item: StashItem): THREE.Group {
    switch (model) {
        case 'pi':
            return raspberryPi(item);
        case 'cyd':
            return cheapYellowDisplay(item);
        case 'gameboy':
            return gameBoy(item);
        case 'watch':
            return smartWatch(item);
        case 'stopwatch':
            return stopwatch(item);
        case 'card':
            return birthdayCard();
    }
}

const std = (color: THREE.ColorRepresentation, roughness = 0.6, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
const metal = std('#c9ccd2', 0.3, 0.9);
const black = std('#141414', 0.5);

function box(w: number, h: number, d: number, m: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    return mesh;
}

/** Box whose +z face shows `face` and every other side is `body` */
function faced(w: number, h: number, d: number, body: THREE.Material, face: THREE.Texture) {
    const f = new THREE.MeshStandardMaterial({ map: face, roughness: 0.4 });
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [body, body, body, body, f, body]);
}

/** Screen texture: dark panel with a title, a subtitle and a small glyph */
function screen(w: number, h: number, bg: string, fg: string, title: string, sub: string, glyph?: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
    const tex = canvasTexture(w, h, (ctx) => {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        if (glyph) glyph(ctx, w, h);
        ctx.fillStyle = fg;
        ctx.textAlign = 'center';
        ctx.font = `bold ${Math.round(h * 0.16)}px "Courier New", monospace`;
        ctx.fillText(title, w / 2, h * 0.78, w * 0.9);
        ctx.font = `${Math.round(h * 0.09)}px "Courier New", monospace`;
        ctx.fillText(sub, w / 2, h * 0.92, w * 0.9);
    });
    return tex;
}

function raspberryPi(item: StashItem) {
    const g = new THREE.Group();
    const W = 8.5 * CM;
    const H = 5.6 * CM;
    const T = 0.16 * CM;
    const silk = canvasTexture(340, 224, (ctx, w, h) => {
        ctx.fillStyle = '#1f7a3a';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(200,230,180,0.35)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) {
            ctx.beginPath();
            const y = (i * 37) % h;
            ctx.moveTo(0, y);
            ctx.lineTo(w * 0.4, y + 12);
            ctx.lineTo(w, y + 12);
            ctx.stroke();
        }
        ctx.fillStyle = '#e8f5e0';
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillText('Raspberry Pi 4', 18, h - 22);
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.fillText(item.name, 18, h - 46);
        // mounting holes
        ctx.fillStyle = '#c9a23a';
        for (const [x, y] of [
            [12, 12],
            [w - 60, 12],
            [12, h - 12],
            [w - 60, h - 12],
        ]) {
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    g.add(faced(W, H, T, std('#1f7a3a'), silk));
    const top = T / 2;
    // SoC, RAM, USB/Ethernet stack, GPIO header
    g.add(box(1.5 * CM, 1.5 * CM, 0.25 * CM, metal, -0.6 * CM, 0.2 * CM, top + 0.12 * CM));
    g.add(box(1.4 * CM, 1 * CM, 0.12 * CM, black, 1.2 * CM, 0.2 * CM, top + 0.06 * CM));
    g.add(box(1.7 * CM, 1.3 * CM, 1.4 * CM, metal, W / 2 - 0.85 * CM, -1.5 * CM, top + 0.7 * CM));
    g.add(box(1.7 * CM, 1.3 * CM, 1.4 * CM, metal, W / 2 - 0.85 * CM, 0.2 * CM, top + 0.7 * CM));
    g.add(box(2 * CM, 1.6 * CM, 1.3 * CM, metal, W / 2 - 1 * CM, 1.9 * CM, top + 0.65 * CM));
    const header = box(5 * CM, 0.5 * CM, 0.25 * CM, black, -0.8 * CM, H / 2 - 0.4 * CM, top + 0.12 * CM);
    g.add(header);
    const pins = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06 * CM, 0.06 * CM, 0.6 * CM), std('#d4af37', 0.3, 0.9), 40);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 40; i++) {
        m.makeTranslation(-3.2 * CM + (i % 20) * 0.254 * CM, H / 2 - 0.27 * CM - Math.floor(i / 20) * 0.254 * CM, top + 0.45 * CM);
        pins.setMatrixAt(i, m);
    }
    g.add(pins);
    return g;
}

function cheapYellowDisplay(item: StashItem) {
    const g = new THREE.Group();
    const W = 8.6 * CM;
    const H = 5 * CM;
    g.add(box(W, H, 0.16 * CM, std('#f2c21b', 0.5)));
    const tex = screen(320, 240, '#0b1a2a', '#7dffb0', item.name, 'ESP32-2432S028', (ctx, w, h) => {
        // scan frame + paw
        ctx.strokeStyle = '#7dffb0';
        ctx.lineWidth = 4;
        const s = h * 0.22;
        const cx = w / 2;
        const cy = h * 0.36;
        for (const [dx, dy] of [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
        ]) {
            ctx.beginPath();
            ctx.moveTo(cx + dx * s * 1.4, cy + dy * s);
            ctx.lineTo(cx + dx * s * 1.4, cy + dy * s * 0.5);
            ctx.moveTo(cx + dx * s * 1.4, cy + dy * s);
            ctx.lineTo(cx + dx * s * 0.9, cy + dy * s);
            ctx.stroke();
        }
        ctx.fillStyle = '#7dffb0';
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.25, s * 0.4, s * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();
        for (const [dx, dy] of [
            [-0.45, -0.3],
            [-0.15, -0.55],
            [0.15, -0.55],
            [0.45, -0.3],
        ]) {
            ctx.beginPath();
            ctx.arc(cx + dx * s, cy + dy * s, s * 0.13, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    const display = new THREE.Mesh(
        new THREE.PlaneGeometry(6.1 * CM, 4.6 * CM),
        new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.6 })
    );
    display.position.set(-0.6 * CM, 0, 0.36 * CM);
    g.add(box(6.3 * CM, 4.8 * CM, 0.4 * CM, black, -0.6 * CM, 0, 0.16 * CM));
    g.add(display);
    g.add(box(1 * CM, 0.8 * CM, 0.4 * CM, metal, W / 2 - 0.6 * CM, 1.2 * CM, 0.25 * CM));
    return g;
}

function gameBoy(item: StashItem) {
    const g = new THREE.Group();
    const W = 9 * CM;
    const H = 14.8 * CM;
    const D = 3.2 * CM;
    const shell = std('#c9c6bd', 0.55);
    g.add(new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 3, 0.6 * CM), shell));
    const front = D / 2;
    // screen bezel and screen
    g.add(box(7.6 * CM, 6.4 * CM, 0.1 * CM, std('#4a4a58', 0.4), 0, 3.2 * CM, front + 0.02 * CM));
    const tex = screen(240, 216, '#9bbc0f', '#0f380f', item.name.toUpperCase(), 'v1.0  press start', (ctx, w, h) => {
        const cx = w / 2;
        const cy = h * 0.36;
        const r = h * 0.22;
        ctx.fillStyle = '#306230';
        ctx.beginPath();
        ctx.arc(cx, cy, r, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#8bac0f';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#0f380f';
        ctx.fillRect(cx - r, cy - 3, r * 2, 6);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9bbc0f';
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
    });
    const lcd = new THREE.Mesh(
        new THREE.PlaneGeometry(4.8 * CM, 4.3 * CM),
        new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35 })
    );
    lcd.position.set(0, 3.2 * CM, front + 0.09 * CM);
    g.add(lcd);
    // d-pad
    const pad = std('#222222', 0.5);
    g.add(box(2.4 * CM, 0.8 * CM, 0.4 * CM, pad, -2 * CM, -2.6 * CM, front + 0.15 * CM));
    g.add(box(0.8 * CM, 2.4 * CM, 0.4 * CM, pad, -2 * CM, -2.6 * CM, front + 0.15 * CM));
    // A / B
    const ab = std('#9c2a5c', 0.4);
    for (const [x, y] of [
        [2.6, -2.2],
        [1.4, -2.9],
    ]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * CM, 0.55 * CM, 0.4 * CM, 20), ab);
        b.rotation.x = Math.PI / 2;
        b.position.set(x * CM, y * CM, front + 0.15 * CM);
        g.add(b);
    }
    // start / select
    for (const x of [-0.8, 0.6]) {
        const b = box(1 * CM, 0.25 * CM, 0.2 * CM, std('#77757a', 0.5), x * CM, -5 * CM, front + 0.08 * CM);
        b.rotation.z = 0.45;
        g.add(b);
    }
    return g;
}

function smartWatch(item: StashItem) {
    const g = new THREE.Group();
    const body = std('#1c1c22', 0.3, 0.5);
    g.add(new THREE.Mesh(new RoundedBoxGeometry(4 * CM, 4.6 * CM, 1.1 * CM, 3, 0.8 * CM), body));
    const now = new Date();
    const time = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
    const tex = screen(200, 230, '#000000', '#5bd1ff', item.name, time, (ctx, w, h) => {
        ctx.strokeStyle = '#a35bff';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.38, h * 0.24, -Math.PI / 2, Math.PI * 1.1);
        ctx.stroke();
        ctx.strokeStyle = '#5bd16a';
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.38, h * 0.16, -Math.PI / 2, Math.PI * 0.6);
        ctx.stroke();
    });
    const face = new THREE.Mesh(
        new THREE.PlaneGeometry(3.3 * CM, 3.9 * CM),
        new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.7 })
    );
    face.position.z = 0.56 * CM;
    g.add(face);
    // crown and straps
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * CM, 0.3 * CM, 0.4 * CM, 12), metal);
    crown.rotation.z = Math.PI / 2;
    crown.position.x = 2.1 * CM;
    g.add(crown);
    const strap = std('#5b2a8a', 0.8);
    g.add(box(2.4 * CM, 5 * CM, 0.35 * CM, strap, 0, 4.8 * CM, -0.2 * CM));
    g.add(box(2.4 * CM, 5 * CM, 0.35 * CM, strap, 0, -4.8 * CM, -0.2 * CM));
    return g;
}

function stopwatch(item: StashItem) {
    const g = new THREE.Group();
    const R = 3.2 * CM;
    const tex = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f4f1e6';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1b1b1b';
        for (let i = 0; i < 60; i++) {
            const a = (i / 60) * Math.PI * 2;
            const r0 = i % 5 === 0 ? w * 0.38 : w * 0.43;
            ctx.lineWidth = i % 5 === 0 ? 4 : 2;
            ctx.beginPath();
            ctx.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0);
            ctx.lineTo(w / 2 + Math.cos(a) * w * 0.47, h / 2 + Math.sin(a) * w * 0.47);
            ctx.stroke();
        }
        ctx.fillStyle = '#c43d3d';
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillText('TORQUE', w / 2, h * 0.36);
        ctx.fillText('TIMER', w / 2, h * 0.46);
        ctx.fillStyle = '#1b1b1b';
        ctx.font = 'bold 18px "Courier New", monospace';
        ctx.fillText('00:42.0', w / 2, h * 0.7);
        // hand
        ctx.strokeStyle = '#c43d3d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2);
        ctx.lineTo(w / 2 + w * 0.3, h / 2 - w * 0.22);
        ctx.stroke();
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 1.4 * CM, 48), [
        metal,
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3 }),
        metal,
    ]);
    body.rotation.x = Math.PI / 2; // dial faces +z
    g.add(body);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(R, 0.25 * CM, 10, 48), metal);
    bezel.position.z = 0.7 * CM;
    g.add(bezel);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * CM, 0.35 * CM, 1 * CM, 16), metal);
    stem.position.y = R + 0.4 * CM;
    g.add(stem);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8 * CM, 0.15 * CM, 8, 24), metal);
    ring.position.y = R + 1.5 * CM;
    g.add(ring);
    return g;
}

/** Zayne's birthday invite: a card, a bit open, with a big 14 on the front */
function birthdayCard() {
    const g = new THREE.Group();
    const W = 10 * CM;
    const H = 14 * CM;
    const front = canvasTexture(256, 360, (ctx, w, h) => {
        const bg = ctx.createLinearGradient(0, 0, w, h);
        bg.addColorStop(0, '#3a0ca3');
        bg.addColorStop(1, '#f72585');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        // confetti
        const colors = ['#ffd23d', '#5bff8a', '#4cc9f0', '#ffffff', '#ff8a3d'];
        for (let i = 0; i < 90; i++) {
            ctx.fillStyle = colors[i % colors.length];
            ctx.save();
            ctx.translate((i * 97) % w, (i * 53) % h);
            ctx.rotate(i);
            ctx.fillRect(-4, -2, 8, 4);
            ctx.restore();
        }
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 34px Arial, sans-serif';
        ctx.fillText("YOU'RE INVITED", w / 2, 60);
        ctx.font = 'bold 170px Impact, "Arial Black", sans-serif';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#1b1510';
        ctx.strokeText('14', w / 2, 230);
        ctx.fillStyle = '#ffd23d';
        ctx.fillText('14', w / 2, 230);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 38px Arial, sans-serif';
        ctx.fillText("ZAYNE'S", w / 2, 290);
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillText('BIRTHDAY', w / 2, 326);
    });
    const paper = std('#fff8ee', 0.8);
    const cover = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12 * CM), [
        paper,
        paper,
        paper,
        paper,
        new THREE.MeshStandardMaterial({ map: front, roughness: 0.5 }),
        paper,
    ]);
    g.add(cover);
    // the inside page peeking out behind the cover, plus an envelope
    const inside = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12 * CM), paper);
    inside.position.set(0.6 * CM, -0.4 * CM, -0.25 * CM);
    inside.rotation.z = -0.06;
    g.add(inside);
    const envelope = new THREE.Mesh(new THREE.BoxGeometry(W * 1.15, H * 0.8, 0.2 * CM), std('#ffd23d', 0.7));
    envelope.position.set(1.4 * CM, -1.5 * CM, -0.6 * CM);
    envelope.rotation.z = 0.12;
    g.add(envelope);
    return g;
}
