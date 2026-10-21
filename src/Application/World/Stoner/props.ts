import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeBufferGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Shared builders for the stoner props. Everything is procedural (no extra
 * downloads): geometry is built from primitives and the textures are drawn
 * on canvases at startup.
 *
 * Scene units: the desk is ~2530 units tall (a ~75cm desk), so 1cm ~= 34.
 */
export const CM = 34;
export const FLOOR_Y = -2978;
export const DESK_Y = -450;

// Random with a fixed seed so the scene looks the same on every load
let seed = 420;
export const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
};
export const range = (a: number, b: number) => a + (b - a) * rand();

export function canvasTexture(
    w: number,
    h: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    draw(ctx, w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 4;
    return texture;
}

/* ---------------------------------------------------------------- textures */

let weedTex: THREE.Texture | null = null;
export function weedTexture() {
    if (weedTex) return weedTex;
    weedTex = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#5d8a3a';
        ctx.fillRect(0, 0, w, h);
        // calyx specks
        for (let i = 0; i < 900; i++) {
            const g = 90 + Math.floor(rand() * 90);
            ctx.fillStyle = `rgb(${Math.floor(g * 0.55)},${g},${Math.floor(g * 0.35)})`;
            ctx.beginPath();
            ctx.arc(rand() * w, rand() * h, range(1, 5), 0, Math.PI * 2);
            ctx.fill();
        }
        // purple hues
        for (let i = 0; i < 80; i++) {
            ctx.fillStyle = `rgba(120,60,150,${range(0.2, 0.5)})`;
            ctx.beginPath();
            ctx.arc(rand() * w, rand() * h, range(2, 6), 0, Math.PI * 2);
            ctx.fill();
        }
        // orange pistils
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 160; i++) {
            ctx.strokeStyle = `rgb(${200 + rand() * 50},${100 + rand() * 50},30)`;
            const x = rand() * w;
            const y = rand() * h;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + range(-8, 8), y + range(-8, 8), x + range(-12, 12), y + range(-12, 12));
            ctx.stroke();
        }
        // trichomes
        for (let i = 0; i < 1400; i++) {
            ctx.fillStyle = `rgba(240,245,235,${range(0.4, 0.9)})`;
            ctx.fillRect(rand() * w, rand() * h, 1.2, 1.2);
        }
    });
    weedTex.wrapS = weedTex.wrapT = THREE.RepeatWrapping;
    return weedTex;
}

export function woodTexture(base = '#5a3a22') {
    const tex = canvasTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 140; i++) {
            ctx.strokeStyle = `rgba(${rand() < 0.5 ? '30,15,5' : '120,80,45'},${range(0.08, 0.3)})`;
            ctx.lineWidth = range(1, 4);
            const y = rand() * h;
            ctx.beginPath();
            ctx.moveTo(0, y);
            for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
            ctx.stroke();
        }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

export function fabricTexture(base: string, stripe: string) {
    const tex = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        // corduroy ribs
        for (let x = 0; x < w; x += 6) {
            ctx.fillStyle = stripe;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(x, 0, 2, h);
        }
        ctx.globalAlpha = 1;
        for (let i = 0; i < 3000; i++) {
            ctx.fillStyle = `rgba(0,0,0,${range(0, 0.12)})`;
            ctx.fillRect(rand() * w, rand() * h, 2, 2);
        }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

/** Wrap-around label for cans and bottles */
export function labelTexture(bg: string, fg: string, title: string, sub: string) {
    return canvasTexture(512, 256, (ctx, w, h) => {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, bg);
        grad.addColorStop(1, shade(bg, -40));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = shade(bg, 40);
        ctx.fillRect(0, h * 0.08, w, h * 0.05);
        ctx.fillRect(0, h * 0.87, w, h * 0.05);
        for (const offset of [0, w / 2]) {
            ctx.save();
            ctx.translate(offset + w / 4, h / 2);
            ctx.fillStyle = fg;
            ctx.textAlign = 'center';
            ctx.font = 'bold italic 46px Arial Black, Arial, sans-serif';
            ctx.fillText(title, 0, -4, w / 2 - 20);
            ctx.font = 'bold 22px Arial, sans-serif';
            ctx.fillText(sub, 0, 34, w / 2 - 30);
            ctx.restore();
        }
    });
}

function shade(hex: string, amt: number) {
    const n = parseInt(hex.slice(1), 16);
    const c = (v: number) => Math.max(0, Math.min(255, v + amt));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/**
 * Seven-leaflet cannabis leaf as a canvas path, centered on the stem joint,
 * tip at (0, -1). Scale the context to size it.
 */
export function leafPath(ctx: CanvasRenderingContext2D) {
    const leaflets: [number, number][] = [
        [0, 1],
        [26, 0.86],
        [-26, 0.86],
        [54, 0.66],
        [-54, 0.66],
        [92, 0.36],
        [-92, 0.36],
    ];
    ctx.beginPath();
    for (const [ang, len] of leaflets) {
        const a = THREE.MathUtils.degToRad(-90 + ang);
        const steps = 24;
        const pts: [number, number][] = [];
        for (const side of [1, -1]) {
            for (let k = 0; k <= steps; k++) {
                const t = side === 1 ? k / steps : 1 - k / steps;
                const w = len * 0.095 * Math.sin(Math.PI * Math.pow(t, 0.85)) * (1 + 0.18 * Math.abs(Math.sin(t * 55)));
                pts.push([t * len, side * w]);
            }
        }
        pts.forEach(([x, y], i) => {
            const px = x * Math.cos(a) - y * Math.sin(a);
            const py = x * Math.sin(a) + y * Math.cos(a);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        });
        ctx.closePath();
    }
    ctx.rect(-0.02, 0, 0.04, 0.38);
}

/* --------------------------------------------------------------- materials */

export const mat = {
    std: (color: THREE.ColorRepresentation, roughness = 0.7, metalness = 0) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    glass: (color: THREE.ColorRepresentation, opacity = 0.45) =>
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.08,
            metalness: 0.1,
            transparent: true,
            opacity,
            depthWrite: false,
            side: THREE.DoubleSide,
        }),
    glow: (color: THREE.ColorRepresentation) => new THREE.MeshBasicMaterial({ color }),
};

const paperMat = mat.std('#f1ead8', 0.9);
const bluntMat = mat.std('#5b3a1e', 0.85);
const ashMat = mat.std('#8b8a86', 1);
const emberMat = new THREE.MeshStandardMaterial({
    color: '#ff5a1a',
    emissive: '#ff4400',
    emissiveIntensity: 1.6,
});

/* ----------------------------------------------------------------- objects */

/**
 * Click it and the camera comes over for a close look (DeskStash handles it).
 * `dir` is the side to look from; by default, from the middle of the room.
 * `group` makes several clickable parts count as one thing.
 */
export function inspectable<T extends THREE.Object3D>(obj: T, dir?: THREE.Vector3, group?: THREE.Object3D): T {
    obj.userData.inspect = true;
    if (dir) obj.userData.inspectDir = dir.clone().normalize();
    if (group) obj.userData.inspectGroup = group;
    return obj;
}

export function shadows<T extends THREE.Object3D>(obj: T, cast = true, receive = true): T {
    obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = cast;
            child.receiveShadow = receive;
        }
    });
    return obj;
}

/**
 * A blunt or joint lying along +x. Returns the group and the local position of
 * its lit tip (for smoke).
 */
export function smokable(kind: 'blunt' | 'joint', lit = true) {
    const group = new THREE.Group();
    const length = kind === 'blunt' ? 11 * CM : 8.5 * CM;
    const r = kind === 'blunt' ? 0.75 * CM : 0.45 * CM;
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(r, kind === 'blunt' ? r * 0.92 : r * 0.55, length, 16),
        kind === 'blunt' ? bluntMat : paperMat
    );
    body.rotation.z = Math.PI / 2;
    group.add(body);

    if (kind === 'joint') {
        // twisted end and a crutch
        const twist = new THREE.Mesh(new THREE.ConeGeometry(r * 1.05, r * 3, 10), paperMat);
        twist.rotation.z = -Math.PI / 2;
        twist.position.x = length / 2 + r * 1.4;
        group.add(twist);
    } else {
        // spiral seam lines on the wrap
        const seam = mat.std('#3f2712', 0.9);
        for (let i = -4; i <= 4; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.005, r * 0.04, 4, 20), seam);
            ring.rotation.y = Math.PI / 2 + 0.35;
            ring.position.x = (i * length) / 10;
            group.add(ring);
        }
    }

    const tip = new THREE.Vector3(-length / 2 - r * 0.4, 0, 0);
    if (lit) {
        const ash = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r, r * 1.6, 12), ashMat);
        ash.rotation.z = Math.PI / 2;
        ash.position.x = -length / 2 - r * 0.6;
        group.add(ash);
        const ember = new THREE.Mesh(new THREE.SphereGeometry(r * 0.9, 12, 8), emberMat);
        ember.scale.set(0.5, 1, 1);
        ember.position.x = -length / 2 - r * 0.05;
        group.add(ember);
        tip.x = -length / 2 - r * 1.4;
    }
    return { group, tip, length, radius: r };
}

/** Glass or ceramic ashtray with ash, a couple of roaches and a resting blunt */
export function ashtray(color: THREE.ColorRepresentation = '#3b3b45', withBlunt: 'blunt' | 'joint' | null = 'blunt') {
    const group = new THREE.Group();
    const R = 6.5 * CM;
    const H = 2.4 * CM;
    const profile = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(R * 0.9, 0),
        new THREE.Vector2(R, H * 0.4),
        new THREE.Vector2(R, H),
        new THREE.Vector2(R * 0.82, H),
        new THREE.Vector2(R * 0.72, H * 0.35),
        new THREE.Vector2(0, H * 0.35),
    ];
    const dish = new THREE.Mesh(
        new THREE.LatheGeometry(profile, 40),
        new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.2, side: THREE.DoubleSide })
    );
    group.add(dish);

    // ash pile
    const ash = new THREE.Mesh(new THREE.SphereGeometry(R * 0.55, 16, 8), ashMat);
    ash.scale.set(1, 0.12, 1);
    ash.position.y = H * 0.38;
    group.add(ash);

    // roaches
    for (let i = 0; i < 3; i++) {
        const roach = smokable(i === 0 ? 'blunt' : 'joint', false);
        roach.group.scale.set(0.3, 1, 1);
        roach.group.position.set(range(-R * 0.4, R * 0.4), H * 0.5, range(-R * 0.4, R * 0.4));
        roach.group.rotation.y = rand() * Math.PI;
        group.add(roach.group);
    }

    // the one still burning, resting on the rim
    let smokePoint: THREE.Vector3 | null = null;
    if (withBlunt) {
        const s = smokable(withBlunt);
        s.group.position.set(R * 0.95 + s.length * 0.3, H * 1.05, 0);
        s.group.rotation.z = -0.08;
        group.add(s.group);
        group.updateMatrixWorld(true);
        smokePoint = s.tip.clone().applyMatrix4(s.group.matrix);
    }
    return { group, smokePoint, radius: R };
}

/** One sticky nug: a cluster of textured lumps */
export function nug(size = 2 * CM) {
    const parts: THREE.BufferGeometry[] = [];
    const lumps = 5 + Math.floor(rand() * 4);
    for (let i = 0; i < lumps; i++) {
        const g = new THREE.IcosahedronGeometry(size * range(0.35, 0.55), 1);
        g.scale(1, range(1.1, 1.5), 1);
        g.translate(range(-0.3, 0.3) * size, range(0, 0.6) * size, range(-0.3, 0.3) * size);
        parts.push(g);
    }
    const geo = mergeBufferGeometries(parts) as THREE.BufferGeometry;
    const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({ map: weedTexture(), roughness: 0.95, color: '#c8e0b0' })
    );
    mesh.rotation.set(range(0, 0.5), rand() * Math.PI * 2, range(-0.4, 0.4));
    return mesh;
}

/** Scatter of crumbs/shake on a surface */
export function shake(count: number, spread: number) {
    const geo = new THREE.IcosahedronGeometry(0.25 * CM, 0);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: weedTexture() }), count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
        const s = range(0.4, 1.2);
        m.compose(
            new THREE.Vector3(range(-1, 1) * spread, 0.1 * CM, range(-1, 1) * spread * 0.6),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6, rand() * 6, rand() * 6)),
            new THREE.Vector3(s, s * 0.5, s)
        );
        mesh.setMatrixAt(i, m);
    }
    return mesh;
}

/** Four-piece grinder */
export function grinder(color = '#7a3fd1') {
    const group = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.8 });
    const r = 3.2 * CM;
    const heights = [1.2, 1.4, 1.2];
    let y = 0;
    heights.forEach((h, i) => {
        const piece = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h * CM, 36), metal);
        piece.position.y = y + (h * CM) / 2;
        y += h * CM + 0.08 * CM;
        group.add(piece);
        if (i === heights.length - 1) {
            const knurl = new THREE.Mesh(
                new THREE.CylinderGeometry(r * 1.01, r * 1.01, h * CM * 0.6, 36, 1, true),
                new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.6, metalness: 0.6, wireframe: true })
            );
            knurl.position.copy(piece.position);
            group.add(knurl);
        }
    });
    return group;
}

/** Pack of rolling papers with a couple of loose sheets */
export function papers() {
    const group = new THREE.Group();
    const cover = canvasTexture(256, 160, (ctx, w, h) => {
        ctx.fillStyle = '#b48a57';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#6b4a24';
        ctx.lineWidth = 6;
        ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.fillStyle = '#3d2610';
        ctx.textAlign = 'center';
        ctx.font = 'bold 44px Georgia, serif';
        ctx.fillText('CAK3D', w / 2, 76);
        ctx.font = 'bold 20px Georgia, serif';
        ctx.fillText('KING SIZE SLIM', w / 2, 108);
        ctx.font = '14px Georgia, serif';
        ctx.fillText('natural unrefined', w / 2, 132);
    });
    const plain = mat.std('#b48a57', 0.9);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(11 * CM, 0.5 * CM, 4.5 * CM), [
        plain,
        plain,
        new THREE.MeshStandardMaterial({ map: cover, roughness: 0.9 }),
        plain,
        plain,
        plain,
    ]);
    pack.position.y = 0.25 * CM;
    group.add(pack);
    for (let i = 0; i < 2; i++) {
        const sheet = new THREE.Mesh(new THREE.PlaneGeometry(10.8 * CM, 4.4 * CM), paperMat.clone());
        (sheet.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        sheet.rotation.x = -Math.PI / 2;
        sheet.rotation.z = range(-0.6, 0.6);
        sheet.position.set(range(-4, 4) * CM, 0.05 * CM, (6 + i * 3.5) * CM);
        group.add(sheet);
    }
    return group;
}

export function lighter(color: THREE.ColorRepresentation) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new RoundedBoxGeometry(2.5 * CM, 1.2 * CM, 8 * CM, 2, 0.4 * CM),
        new THREE.MeshStandardMaterial({ color, roughness: 0.3 })
    );
    body.position.y = 0.6 * CM;
    group.add(body);
    const head = new THREE.Mesh(
        new THREE.BoxGeometry(2.3 * CM, 1 * CM, 1.6 * CM),
        new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.9, roughness: 0.3 })
    );
    head.position.set(0, 0.6 * CM, 4.6 * CM);
    group.add(head);
    return group;
}

/** Soda can; tipped cans lie on their side */
export function can(bg: string, fg: string, title: string, sub: string, tipped = false) {
    const group = new THREE.Group();
    const r = 3.3 * CM;
    const h = 12.2 * CM;
    const metal = new THREE.MeshStandardMaterial({ color: '#cfcfd4', metalness: 0.9, roughness: 0.25 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), [
        new THREE.MeshStandardMaterial({ map: labelTexture(bg, fg, title, sub), metalness: 0.5, roughness: 0.35 }),
        metal,
        metal,
    ]);
    group.add(body);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.88, 0.2 * CM, 6, 32), metal);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = h / 2;
    group.add(lip);
    if (tipped) {
        group.rotation.z = Math.PI / 2;
        group.position.y = r;
        group.rotation.y = rand() * Math.PI;
    } else {
        group.position.y = h / 2;
    }
    const outer = new THREE.Group();
    outer.add(group);
    return outer;
}

/** Long-neck bottle built from a lathe profile */
export function bottle(glassColor: string, labelBg: string, labelFg: string, title: string, tipped = false) {
    const group = new THREE.Group();
    const s = CM;
    const pts = [
        [0, 0],
        [3.1, 0],
        [3.2, 0.6],
        [3.2, 14],
        [2.8, 16.5],
        [1.4, 19.5],
        [1.25, 23.5],
        [1.4, 24.2],
        [1.2, 24.6],
        [0, 24.6],
    ].map(([x, y]) => new THREE.Vector2(x * s, y * s));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), mat.glass(glassColor, 0.7));
    group.add(glass);
    // liquid inside
    const beer = new THREE.Mesh(
        new THREE.CylinderGeometry(2.95 * s, 2.95 * s, 9 * s, 24),
        new THREE.MeshStandardMaterial({ color: '#c98a1c', transparent: true, opacity: 0.55, roughness: 0.2 })
    );
    beer.position.y = 4.8 * s;
    group.add(beer);
    const label = new THREE.Mesh(
        new THREE.CylinderGeometry(3.23 * s, 3.23 * s, 7 * s, 32, 1, true),
        new THREE.MeshStandardMaterial({ map: labelTexture(labelBg, labelFg, title, 'LAGER'), roughness: 0.6 })
    );
    label.position.y = 7 * s;
    group.add(label);
    const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(1.45 * s, 1.45 * s, 0.6 * s, 16),
        new THREE.MeshStandardMaterial({ color: '#b8a24a', metalness: 0.8, roughness: 0.3 })
    );
    cap.position.y = 24.7 * s;
    group.add(cap);

    const outer = new THREE.Group();
    if (tipped) {
        group.rotation.z = Math.PI / 2;
        group.position.y = 3.2 * s;
    }
    outer.add(group);
    return outer;
}

/** Mason jar of nugs */
export function stashJar() {
    const group = new THREE.Group();
    const r = 4.5 * CM;
    const h = 12 * CM;
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true), mat.glass('#cfe8ff', 0.25));
    jar.position.y = h / 2;
    group.add(jar);
    const lid = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.9, r * 0.9, 1.4 * CM, 32),
        new THREE.MeshStandardMaterial({ color: '#c9a23a', metalness: 0.8, roughness: 0.35 })
    );
    lid.position.y = h + 0.7 * CM;
    group.add(lid);
    for (let i = 0; i < 9; i++) {
        const n = nug(2.4 * CM);
        n.position.set(range(-0.5, 0.5) * r, (0.15 + Math.floor(i / 3) * 0.28) * h, range(-0.5, 0.5) * r);
        group.add(n);
    }
    return group;
}

/** Glass beaker bong */
export function bong() {
    const group = new THREE.Group();
    const s = CM;
    const pts = [
        [0, 0],
        [7, 0],
        [7.2, 0.8],
        [6.4, 4],
        [3.2, 11],
        [2.4, 13],
        [2.4, 38],
        [2.8, 38.6],
        [0, 38.6],
    ].map(([x, y]) => new THREE.Vector2(x * s, y * s));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), mat.glass('#b38cff', 0.35));
    group.add(glass);
    const water = new THREE.Mesh(
        new THREE.CylinderGeometry(5.2 * s, 6.8 * s, 3.4 * s, 32),
        new THREE.MeshStandardMaterial({ color: '#7fb3ff', transparent: true, opacity: 0.35, roughness: 0.1 })
    );
    water.position.y = 1.9 * s;
    group.add(water);
    // downstem + bowl
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * s, 0.6 * s, 11 * s, 12), mat.glass('#e0e0ff', 0.5));
    stem.position.set(2.6 * s, 6.5 * s, 0);
    stem.rotation.z = 0.75;
    group.add(stem);
    const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6 * s, 0.7 * s, 2.2 * s, 16, 1, true),
        mat.glass('#5bff9b', 0.6)
    );
    bowl.position.set(6.4 * s, 10.6 * s, 0);
    bowl.rotation.z = 0.75;
    group.add(bowl);
    const ice = new THREE.Mesh(new THREE.TorusGeometry(2.4 * s, 0.25 * s, 6, 24), mat.glass('#ffffff', 0.5));
    ice.rotation.x = Math.PI / 2;
    ice.position.y = 22 * s;
    group.add(ice);
    return group;
}

export { RoundedBoxGeometry, mergeBufferGeometries };
