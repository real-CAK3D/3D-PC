import * as THREE from 'three';
import Application from '../../Application';
import {
    ashtray,
    canvasTexture,
    CM,
    DESK_Y,
    FLOOR_Y,
    grinder,
    inspectable,
    leafPath,
    lighter,
    mat,
    nug,
    range,
    shadows,
    shake,
    RoundedBoxGeometry,
} from './props';

// Room bounds: the desk sits in the back-right corner
export const ROOM = {
    left: -14500,
    right: 5700,
    back: -1600,
    front: 11000,
    ceiling: 6200,
};
const LED_COLOR = '#b04dff';
// the window in the left wall
export const WINDOW = { z: 5200, y: FLOOR_Y + 3600, width: 3600, height: 2600 };

/**
 * Walls, floor, purple LED strips along the ceiling edge, the lighting for the
 * new props, and the smoking setup on the desk.
 */
export default class Room {
    application: Application;
    scene: THREE.Scene;
    smokePoints: THREE.Vector3[] = [];
    lava: Lava | null = null;
    ledMode = 0;
    ledStrip: THREE.MeshBasicMaterial;
    ledGlow: THREE.MeshBasicMaterial;
    ledLights: THREE.PointLight[] = [];

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        const renderer = this.application.renderer.instance;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.setLights();
        this.setShell();
        this.setLeds();
        this.setDecor();
        this.setDeskSession();
        this.setLavaLamp();
        this.setGrowLight();
        this.setLedRemote();

        // the old grey backdrop sits a hair under the new floor and z-fights with it; the room replaces it
        const backdrop = this.scene.getObjectByName('Background');
        if (backdrop) backdrop.visible = false;

        // baked models cast shadows onto the new floor
        ['desk', 'chair_base', 'chair_seat', 'computer', 'monitor_base', 'plant'].forEach((name) => {
            const obj = this.scene.getObjectByName(name);
            if (obj) obj.castShadow = true;
        });
    }

    setLights() {
        this.scene.add(new THREE.HemisphereLight('#cdbaff', '#2b1a3c', 0.5));

        const sun = new THREE.DirectionalLight('#ffe2c2', 0.55);
        sun.position.set(-9000, 15000, 9000);
        sun.target.position.set(-4000, FLOOR_Y, 3000);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        const cam = sun.shadow.camera as THREE.OrthographicCamera;
        cam.left = -14000;
        cam.right = 14000;
        cam.top = 14000;
        cam.bottom = -14000;
        cam.near = 1000;
        cam.far = 45000;
        sun.shadow.bias = -0.0005;
        this.scene.add(sun, sun.target);

        // purple wash from the LED strips
        const glow = (x: number, z: number) => {
            const light = new THREE.PointLight(LED_COLOR, 0.55, 11000, 1.6);
            this.ledLights.push(light);
            light.position.set(x, ROOM.ceiling - 500, z);
            this.scene.add(light);
        };
        [-12000, -6500, -1000, 4200].forEach((x) => glow(x, ROOM.back + 500));
        [2500, 6500, 10000].forEach((z) => glow(ROOM.right - 500, z));
        [3000, 8500].forEach((z) => glow(ROOM.left + 500, z));
    }

    setShell() {
        const width = ROOM.right - ROOM.left;
        const depth = ROOM.front - ROOM.back;
        const height = ROOM.ceiling - FLOOR_Y;

        // Plank floor
        const floorTex = canvasTexture(1024, 1024, (ctx, w, h) => {
            const planks = 8;
            for (let i = 0; i < planks; i++) {
                const shade = 70 + Math.floor(range(0, 30));
                ctx.fillStyle = `rgb(${shade + 25},${shade},${shade - 25})`;
                ctx.fillRect(0, (i * h) / planks, w, h / planks);
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                ctx.fillRect(0, (i * h) / planks, w, 3);
                const seam = range(0.2, 0.8) * w;
                ctx.fillRect(seam, (i * h) / planks, 3, h / planks);
                for (let g = 0; g < 18; g++) {
                    ctx.fillStyle = `rgba(30,15,5,${range(0.05, 0.18)})`;
                    ctx.fillRect(0, (i * h) / planks + range(4, h / planks - 4), w, range(1, 3));
                }
            }
        });
        floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(width / 9000, depth / 9000);
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(width, depth),
            new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(ROOM.left + width / 2, FLOOR_Y, ROOM.back + depth / 2);
        floor.receiveShadow = true;
        this.scene.add(floor);

        const wallMat = new THREE.MeshStandardMaterial({ color: '#2c2338', roughness: 0.95 });
        const back = new THREE.Mesh(new THREE.PlaneGeometry(width, height), wallMat);
        back.position.set(ROOM.left + width / 2, FLOOR_Y + height / 2, ROOM.back);
        back.receiveShadow = true;
        this.scene.add(back);

        // Left wall: single-sided and facing in, so the camera orbiting outside sees straight through it.
        // Built around the window opening (WINDOW) so you can see outside.
        const leftPiece = (z0: number, z1: number, y0: number, y1: number) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, y1 - y0), wallMat);
            m.rotation.y = Math.PI / 2;
            m.position.set(ROOM.left, (y0 + y1) / 2, (z0 + z1) / 2);
            m.receiveShadow = true;
            this.scene.add(m);
        };
        const wz0 = WINDOW.z - WINDOW.width / 2;
        const wz1 = WINDOW.z + WINDOW.width / 2;
        const wy0 = WINDOW.y - WINDOW.height / 2;
        const wy1 = WINDOW.y + WINDOW.height / 2;
        leftPiece(ROOM.back, wz0, FLOOR_Y, ROOM.ceiling);
        leftPiece(wz1, ROOM.front, FLOOR_Y, ROOM.ceiling);
        leftPiece(wz0, wz1, FLOOR_Y, wy0);
        leftPiece(wz0, wz1, wy1, ROOM.ceiling);

        const right = new THREE.Mesh(new THREE.PlaneGeometry(depth, height), wallMat);
        right.rotation.y = -Math.PI / 2;
        right.position.set(ROOM.right, FLOOR_Y + height / 2, ROOM.back + depth / 2);
        right.receiveShadow = true;
        this.scene.add(right);

        // Baseboards and wall caps so the walls read as having thickness
        const trim = new THREE.MeshStandardMaterial({ color: '#1e1826', roughness: 0.6 });
        const board = (w: number, h: number, d: number, x: number, y: number, z: number) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trim);
            m.position.set(x, y, z);
            this.scene.add(m);
        };
        board(width, 300, 60, ROOM.left + width / 2, FLOOR_Y + 150, ROOM.back + 30);
        board(60, 300, depth, ROOM.right - 30, FLOOR_Y + 150, ROOM.back + depth / 2);
        board(width + 300, 120, 300, ROOM.left + width / 2 + 150, ROOM.ceiling + 60, ROOM.back - 150);
        board(300, 120, depth, ROOM.right + 150, ROOM.ceiling + 60, ROOM.back + depth / 2);
    }

    setLeds() {
        const width = ROOM.right - ROOM.left;
        const depth = ROOM.front - ROOM.back;
        const strip = (this.ledStrip = new THREE.MeshBasicMaterial({ color: '#e2b8ff' }));

        // soft purple bloom painted on the wall under the strip
        const glowTex = canvasTexture(16, 256, (ctx, w, h) => {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, 'rgba(190,110,255,0.95)');
            g.addColorStop(0.12, 'rgba(160,70,255,0.35)');
            g.addColorStop(1, 'rgba(120,40,220,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        });
        const glowMat = (this.ledGlow = new THREE.MeshBasicMaterial({
            map: glowTex,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }));

        const y = ROOM.ceiling - 80;
        const backStrip = new THREE.Mesh(new THREE.BoxGeometry(width, 70, 70), strip);
        backStrip.position.set(ROOM.left + width / 2, y, ROOM.back + 40);
        const rightStrip = new THREE.Mesh(new THREE.BoxGeometry(70, 70, depth), strip);
        rightStrip.position.set(ROOM.right - 40, y, ROOM.back + depth / 2);
        this.scene.add(backStrip, rightStrip);

        const glowH = 2000;
        const backGlow = new THREE.Mesh(new THREE.PlaneGeometry(width, glowH), glowMat);
        backGlow.position.set(ROOM.left + width / 2, y - glowH / 2, ROOM.back + 40);
        const rightGlow = new THREE.Mesh(new THREE.PlaneGeometry(depth, glowH), glowMat);
        rightGlow.rotation.y = -Math.PI / 2;
        rightGlow.position.set(ROOM.right - 40, y - glowH / 2, ROOM.back + depth / 2);
        const leftGlow = new THREE.Mesh(new THREE.PlaneGeometry(depth, glowH), glowMat);
        leftGlow.rotation.y = Math.PI / 2;
        leftGlow.position.set(ROOM.left + 40, y - glowH / 2, ROOM.back + depth / 2);
        const leftStrip = new THREE.Mesh(new THREE.PlaneGeometry(depth, 70), strip);
        leftStrip.rotation.y = Math.PI / 2;
        leftStrip.position.set(ROOM.left + 50, y, ROOM.back + depth / 2);
        this.scene.add(leftGlow, leftStrip);
        // and a little spill onto the ceiling edge of the floor below the strips
        this.scene.add(backGlow, rightGlow);
    }

    setDecor() {
        // Poster over the couch
        const poster = canvasTexture(700, 1000, (ctx, w, h) => {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#2a0f45');
            g.addColorStop(1, '#0d1f12');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            for (let r = 520; r > 0; r -= 40) {
                ctx.strokeStyle = `rgba(${r % 80 ? '170,90,255' : '90,220,120'},0.25)`;
                ctx.lineWidth = 14;
                ctx.beginPath();
                ctx.arc(w / 2, h * 0.45, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.save();
            ctx.translate(w / 2, h * 0.5);
            ctx.scale(300, 300);
            ctx.fillStyle = '#5fd36a';
            ctx.shadowColor = '#9dff9d';
            ctx.shadowBlur = 0.1;
            leafPath(ctx);
            ctx.fill();
            ctx.restore();
            ctx.fillStyle = '#f3e7ff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 110px Impact, "Arial Black", sans-serif';
            ctx.fillText('STAY LIFTED', w / 2, h - 120);
            ctx.font = 'bold 34px Arial, sans-serif';
            ctx.fillStyle = '#b98cff';
            ctx.fillText('CAK3D_Creations', w / 2, h - 60);
            ctx.strokeStyle = '#f3e7ff';
            ctx.lineWidth = 10;
            ctx.strokeRect(5, 5, w - 10, h - 10);
        });
        const posterMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(2800, 4000),
            new THREE.MeshStandardMaterial({ map: poster, roughness: 0.6 })
        );
        posterMesh.position.set(-7800, 2400, ROOM.back + 40);
        this.scene.add(inspectable(posterMesh, new THREE.Vector3(0, 0, 1)));

        // Neon sign on the right wall
        const neon = canvasTexture(1024, 512, (ctx, w, h) => {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            ctx.font = 'italic bold 170px "Brush Script MT", "Segoe Script", cursive';
            for (const [blur, color] of [
                [60, 'rgba(176,77,255,0.9)'],
                [25, 'rgba(220,160,255,0.9)'],
                [0, '#fbefff'],
            ] as [number, string][]) {
                ctx.shadowBlur = blur;
                ctx.shadowColor = color;
                ctx.fillStyle = color;
                ctx.fillText('puff puff pass', w / 2, h * 0.42);
            }
            ctx.font = 'bold 70px Arial, sans-serif';
            ctx.shadowBlur = 30;
            ctx.shadowColor = '#5bff8a';
            ctx.fillStyle = '#d9ffe2';
            ctx.fillText('4 : 2 0', w / 2, h * 0.8);
        });
        const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(5200, 2600),
            new THREE.MeshBasicMaterial({ map: neon, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
        );
        sign.rotation.y = -Math.PI / 2;
        sign.position.set(ROOM.right - 50, 3000, 5200);
        this.scene.add(inspectable(sign, new THREE.Vector3(-1, 0, 0)));

        // Tie-dye rug under the coffee table
        const rug = canvasTexture(512, 512, (ctx, w, h) => {
            const colors = ['#6a2bb8', '#2bb85a', '#b82b8c', '#e0b42b', '#2b6ab8'];
            for (let r = w / 2, i = 0; r > 0; r -= 18, i++) {
                ctx.fillStyle = colors[i % colors.length];
                ctx.beginPath();
                for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.1) {
                    const rr = r + Math.sin(a * 6 + i) * 8;
                    const x = w / 2 + Math.cos(a) * rr;
                    const y = h / 2 + Math.sin(a) * rr;
                    if (a === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.fill();
            }
        });
        const rugMesh = new THREE.Mesh(
            new THREE.CircleGeometry(4200, 64),
            new THREE.MeshStandardMaterial({ map: rug, roughness: 1 })
        );
        rugMesh.rotation.x = -Math.PI / 2;
        rugMesh.position.set(-7800, FLOOR_Y + 12, 3600);
        rugMesh.receiveShadow = true;
        this.scene.add(rugMesh);
    }

    /** Ashtray, grinder, nugs and a lighter next to the mouse */
    setDeskSession() {
        const tray = ashtray('#2c2a33', 'blunt');
        tray.group.position.set(1480, DESK_Y, 1390);
        tray.group.rotation.y = 2.6;
        this.scene.add(inspectable(shadows(tray.group), new THREE.Vector3(0.2, 0.8, 1)));
        if (tray.smokePoint) this.smokePoints.push(tray.group.localToWorld(tray.smokePoint.clone()));

        const g = grinder('#7a3fd1');
        g.position.set(2180, DESK_Y, 1380);
        this.scene.add(inspectable(shadows(g), new THREE.Vector3(0, 0.8, 1)));

        for (let i = 0; i < 5; i++) {
            const n = nug(range(1.8, 2.6) * CM);
            n.position.set(1880 + range(-150, 150), DESK_Y, 1440 + range(-90, 120));
            this.scene.add(shadows(n));
        }
        const crumbs = shake(60, 260);
        crumbs.position.set(1950, DESK_Y, 1420);
        this.scene.add(crumbs);

        const l = lighter('#3dff8a');
        l.position.set(2240, DESK_Y, 1050);
        l.rotation.y = 0.9;
        this.scene.add(inspectable(shadows(l), new THREE.Vector3(0, 0.8, 1)));
    }

    /** A lava lamp that actually works: click it to switch it on/off, wax heats, rises, cools and sinks */
    setLavaLamp() {
        const group = new THREE.Group();
        group.position.set(-3020, DESK_Y, 1150);
        const metal = new THREE.MeshStandardMaterial({ color: '#4b2a7a', metalness: 0.8, roughness: 0.3 });
        const s = CM;

        const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2 * s, 6.5 * s, 13 * s, 32), metal);
        base.position.y = 6.5 * s;
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6 * s, 2.6 * s, 6 * s, 32), metal);
        cap.position.y = 13 * s + 26 * s + 3 * s;
        // little rocker switch on the base
        const toggle = new THREE.Mesh(new THREE.BoxGeometry(1.2 * s, 0.8 * s, 0.8 * s), mat.std('#111111', 0.5));
        toggle.position.set(0, 3 * s, 5.6 * s);
        group.add(base, cap, toggle);

        // glass profile (radius by height), also used to keep the wax inside
        const profile = [
            [3.3, 0],
            [5, 8],
            [4.2, 18],
            [2.7, 26],
        ];
        const glassMat = new THREE.MeshStandardMaterial({
            color: '#c38cff',
            emissive: '#7a2bd1',
            emissiveIntensity: 0.6,
            transparent: true,
            opacity: 0.55,
            roughness: 0.1,
            depthWrite: false,
        });
        const glass = new THREE.Mesh(
            new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x * s, y * s)), 32),
            glassMat
        );
        glass.position.y = 13 * s;
        group.add(glass);
        const radiusAt = (h: number) => {
            const hc = h / s;
            for (let k = 1; k < profile.length; k++) {
                if (hc <= profile[k][1]) {
                    const [r0, h0] = profile[k - 1];
                    const [r1, h1] = profile[k];
                    return (r0 + ((hc - h0) / (h1 - h0)) * (r1 - r0)) * s;
                }
            }
            return profile[profile.length - 1][0] * s;
        };

        const waxMat = new THREE.MeshStandardMaterial({ color: '#ff5bd1', emissive: '#ff3dbb', emissiveIntensity: 0.9 });
        const blobs: LavaBlob[] = [];
        // a puddle of wax that always sits at the bottom
        const pool = new THREE.Mesh(new THREE.SphereGeometry(3 * s, 20, 10), waxMat);
        pool.scale.set(1, 0.35, 1);
        pool.position.y = 13 * s + 0.8 * s;
        group.add(pool);
        for (let i = 0; i < 6; i++) {
            const r = range(0.9, 1.6) * s;
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), waxMat);
            group.add(mesh);
            blobs.push({
                mesh,
                r,
                h: range(1, 20) * s,
                v: 0,
                heat: range(0, 1) < 0.5 ? 1 : 0,
                angle: range(0, Math.PI * 2),
                drift: range(0.2, 0.7),
            });
        }

        const light = new THREE.PointLight('#ff5bd1', 0.8, 5000, 1.6);
        light.position.y = 26 * s;
        group.add(light);
        this.scene.add(inspectable(shadows(group, true, false), new THREE.Vector3(0.2, 0.2, 1)));

        this.lava = { on: true, power: 1, blobs, glassMat, waxMat, light, radiusAt, bottom: 13 * s, height: 26 * s, toggle };
        group.userData.onClick = () => {
            if (this.lava) this.lava.on = !this.lava.on;
        };
    }

    /** Multi-spectrum LED grow panel hanging over the plant; click to switch it */
    setGrowLight() {
        const y = 3400;
        const group = new THREE.Group();
        group.position.set(3650, y, -50);

        const W = 2600;
        const D = 1700;
        const frame = new THREE.Mesh(new THREE.BoxGeometry(W, 140, D), mat.std('#1a1a1d', 0.45, 0.6));
        group.add(frame);
        // heat sink fins on top
        for (let i = 0; i < 14; i++) {
            const fin = new THREE.Mesh(new THREE.BoxGeometry(W - 200, 120, 30), mat.std('#2a2a2e', 0.4, 0.7));
            fin.position.set(0, 120, -D / 2 + 120 + (i * (D - 240)) / 13);
            group.add(fin);
        }

        // the diode grid: mostly red and blue with some white and far-red, like a real full spectrum board
        const cols = 24;
        const rows = 16;
        const diodes = new THREE.InstancedMesh(
            new THREE.SphereGeometry(26, 6, 4),
            new THREE.MeshBasicMaterial({ color: '#ffffff' }),
            cols * rows
        );
        const palette = ['#ff2a4a', '#ff2a4a', '#ff2a4a', '#3a5bff', '#3a5bff', '#ffffff', '#ff6a00', '#c040ff'];
        const m = new THREE.Matrix4();
        const c = new THREE.Color();
        for (let i = 0; i < cols * rows; i++) {
            const cx = (i % cols) - (cols - 1) / 2;
            const cz = Math.floor(i / cols) - (rows - 1) / 2;
            m.makeTranslation((cx * (W - 200)) / cols, -75, (cz * (D - 200)) / rows);
            diodes.setMatrixAt(i, m);
            diodes.setColorAt(i, c.set(palette[(i * 7 + Math.floor(i / cols)) % palette.length]));
        }
        group.add(diodes);

        // soft magenta glow under the panel and a faint beam down onto the plant
        const glow = new THREE.Mesh(
            new THREE.PlaneGeometry(W * 1.1, D * 1.1),
            new THREE.MeshBasicMaterial({
                color: '#ff3dcc',
                transparent: true,
                opacity: 0.55,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            })
        );
        glow.rotation.x = Math.PI / 2;
        glow.position.y = -90;
        group.add(glow);
        const beamH = y - FLOOR_Y - 80; // all the way down to the floor
        const beam = new THREE.Mesh(
            new THREE.CylinderGeometry(W * 0.42, W * 0.7, beamH, 32, 1, true),
            new THREE.MeshBasicMaterial({
                color: '#ff4ddb',
                transparent: true,
                opacity: 0.07,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                side: THREE.DoubleSide,
            })
        );
        beam.position.y = -beamH / 2 - 80;
        group.add(beam);

        const spot = new THREE.SpotLight('#ff4ddb', 1.6, 7000, 0.75, 0.6, 1.2);
        spot.position.set(0, -100, 0);
        spot.target.position.set(0, -4000, 0);
        group.add(spot, spot.target);

        // hanging ratchet cords
        const cord = mat.std('#111111', 0.8);
        const len = ROOM.ceiling - y;
        for (const [sx, sz] of [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
        ]) {
            const line = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, len, 6), cord);
            line.position.set(sx * (W / 2 - 100), len / 2, sz * (D / 2 - 100));
            group.add(line);
        }
        this.scene.add(group);

        let on = true;
        inspectable(frame, new THREE.Vector3(-0.6, -0.3, 1), group);
        frame.userData.onClick = () => {
            on = !on;
            diodes.visible = glow.visible = beam.visible = on;
            spot.intensity = on ? 1.6 : 0;
        };
    }

    /** RGB remote on the coffee table: click to cycle the LED strip colors */
    setLedRemote() {
        const remote = new THREE.Group();
        remote.position.set(-6800, FLOOR_Y + 1400, 3600);
        remote.rotation.y = 2.6;
        const body = new THREE.Mesh(
            new RoundedBoxGeometry(4 * CM, 0.9 * CM, 9.5 * CM, 2, 0.4 * CM),
            mat.std('#f2f2f2', 0.4)
        );
        body.position.y = 0.45 * CM;
        remote.add(body);
        const colors = ['#ff3d3d', '#3dff6a', '#3d6aff', '#ffffff', '#ffd23d', '#ff3dcc', '#3dffe8', LED_COLOR, '#ff8a3d'];
        colors.forEach((color, i) => {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * CM, 0.4 * CM, 0.3 * CM, 12), mat.glow(color));
            b.position.set(((i % 3) - 1) * 1.1 * CM, 0.95 * CM, (Math.floor(i / 3) - 0.5) * 1.6 * CM + 1 * CM);
            remote.add(b);
        });
        const power = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * CM, 0.5 * CM, 0.3 * CM, 12), mat.glow('#ff2a2a'));
        power.position.set(0, 0.95 * CM, -3 * CM);
        remote.add(power);
        this.scene.add(inspectable(shadows(remote), new THREE.Vector3(0, 1, 0.3)));
        remote.userData.onClick = () => {
            this.ledMode = (this.ledMode + 1) % LED_MODES.length;
            const mode = LED_MODES[this.ledMode];
            if (mode !== 'rainbow') this.setLedColor(new THREE.Color(mode));
        };
    }

    setLedColor(color: THREE.Color) {
        this.ledStrip.color.copy(color).lerp(new THREE.Color('#ffffff'), 0.45);
        this.ledGlow.color.copy(color);
        for (const l of this.ledLights) l.color.copy(color);
    }

    update() {
        const dt = Math.min(this.application.time.delta, 50) / 1000;
        if (LED_MODES[this.ledMode] === 'rainbow') {
            this.setLedColor(new THREE.Color().setHSL((this.application.time.elapsed * 0.00008) % 1, 0.9, 0.55));
        }

        const lava = this.lava;
        if (!lava) return;
        // takes a while to warm up, and a while to cool off
        lava.power += ((lava.on ? 1 : 0) - lava.power) * dt * 0.35;
        lava.glassMat.emissiveIntensity = 0.05 + lava.power * 0.6;
        lava.waxMat.emissiveIntensity = 0.1 + lava.power * 0.8;
        lava.light.intensity = lava.power * 0.8;
        lava.toggle.rotation.x = lava.on ? -0.3 : 0.3;

        const s = CM;
        for (const b of lava.blobs) {
            const top = lava.height - 3 * s;
            const bottom = 1.5 * s;
            // the bulb heats wax at the bottom; wax cools off near the cap
            if (b.h < bottom + 3 * s) b.heat = Math.min(1, b.heat + dt * 0.25 * lava.power);
            else if (b.h > top - 3 * s) b.heat = Math.max(0, b.heat - dt * 0.3);
            else b.heat = Math.max(0, b.heat - dt * 0.03);
            const buoyancy = (b.heat - 0.5) * 6 * s * Math.max(lava.power, 0.15) - (1 - lava.power) * 2 * s;
            b.v += buoyancy * dt;
            b.v *= 1 - dt * 1.5; // thick, gloopy
            b.h = THREE.MathUtils.clamp(b.h + b.v * dt, bottom, top);
            if (b.h === bottom || b.h === top) b.v *= -0.2;

            // wander around inside the glass, squeezing through the neck
            b.angle += dt * b.drift * 0.3;
            const room = Math.max(0, lava.radiusAt(b.h) - b.r * 1.1);
            const reach = room * (0.4 + 0.3 * Math.sin(b.angle * 1.7));
            b.mesh.position.set(Math.cos(b.angle) * reach, lava.bottom + b.h, Math.sin(b.angle) * reach);
            const stretch = 1 + Math.min(0.8, Math.abs(b.v) / (4 * s));
            const squeeze = Math.min(1, lava.radiusAt(b.h) / (b.r * 2.2));
            b.mesh.scale.set(squeeze / Math.sqrt(stretch), stretch, squeeze / Math.sqrt(stretch));
        }
    }
}

type LavaBlob = { mesh: THREE.Mesh; r: number; h: number; v: number; heat: number; angle: number; drift: number };
type Lava = {
    on: boolean;
    power: number;
    blobs: LavaBlob[];
    glassMat: THREE.MeshStandardMaterial;
    waxMat: THREE.MeshStandardMaterial;
    light: THREE.PointLight;
    radiusAt: (h: number) => number;
    bottom: number;
    height: number;
    toggle: THREE.Mesh;
};
const LED_MODES = [LED_COLOR, '#2bff6a', '#ff2a4a', '#2a6aff', '#ff3dcc', 'rainbow'];
