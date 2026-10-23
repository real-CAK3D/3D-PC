import * as THREE from 'three';
import Application from '../../Application';
import { CameraKey } from '../../Camera/Camera';
import { menu } from './ContextMenu';
import { canvasTexture, CM, inspectable, mat, RoundedBoxGeometry, shadows } from './props';
import { ROOM } from './Room';
import { StashItem } from './stash';

/**
 * CAK3D's electronics bench on the back wall above the desk: a pegboard and two
 * floating shelves holding the real hardware CAK3D tinkers with — a Raspberry Pi
 * 5, a couple of ESP32 devkits, a Seeed XIAO ESP32-S3, Heltec and T-Beam
 * Meshtastic nodes, the Cheap Yellow Display, a LilyGo T-Embed, breadboards and
 * tools. Click a board to look at it, click again (or right-click) to open the
 * project it runs on the PC.
 */

type Board = {
    name: string;
    sub: string; // the chip / board, printed on the silkscreen
    w: number; // board size in cm
    d: number;
    color: string; // PCB color
    led?: string; // a lit status LED
    open?: StashItem; // what clicking it opens on the PC
    note?: string; // a right-click quip when there's nothing to open
};

const gh = (repo: string) => `https://github.com/real-CAK3D/${repo}`;

const BOARDS: Board[] = [
    {
        name: 'Raspberry Pi 5',
        sub: 'Pi 5 · 8GB',
        w: 8.5,
        d: 5.6,
        color: '#1f7a3f',
        led: '#ff3b30',
        open: { name: 'MapPI3', description: 'Trail mapping on the Pi.', url: 'http://mappi3.tailac984b.ts.net/', repo: gh('MapPI3') },
    },
    {
        name: 'ESP32 DevKit',
        sub: 'ESP32-D0WD-V3',
        w: 5.5,
        d: 2.8,
        color: '#1a1a20',
        led: '#3d8bff',
        note: 'One of two devkits on the NukeBox. ESP-NOW range tests live here.',
    },
    {
        name: 'Seeed XIAO ESP32-S3',
        sub: 'XIAO ESP32-S3 Sense',
        w: 2.1,
        d: 1.75,
        color: '#101014',
        led: '#5bff8a',
        open: { name: 'WhatTheFlock', description: 'Flock-radar on the XIAO S3 Sense.', url: 'https://github.com/real-CAK3D/WhatTheFlock', repo: gh('WhatTheFlock') },
    },
    {
        name: 'Heltec WiFi LoRa 32 V3',
        sub: 'ESP32-S3 · SX1262',
        w: 5.1,
        d: 2.54,
        color: '#2a2a30',
        led: '#ffd23d',
        note: 'Meshtastic node. US region, long-fast. OLED shows the mesh.',
    },
    {
        name: 'LILYGO T-Beam',
        sub: 'ESP32 · SX1276 · GPS',
        w: 10,
        d: 3.3,
        color: '#14141a',
        led: '#ff6a00',
        note: 'Meshtastic with GPS. The one that goes in the truck.',
    },
    {
        name: 'Cheap Yellow Display',
        sub: 'ESP32-2432S028R',
        w: 8.6,
        d: 5,
        color: '#b38b1a',
        led: '#ffcf4d',
        open: { name: 'CYD-Buddy', description: 'A desk-buddy face for the Cheap Yellow Display.', url: 'https://github.com/real-CAK3D/CYD-Buddy', repo: gh('CYD-Buddy') },
    },
    {
        name: 'LILYGO T-Embed C1101',
        sub: 'ESP32-S3 · CC1101',
        w: 6.5,
        d: 2.8,
        color: '#101016',
        led: '#c040ff',
        note: 'Sub-GHz deck. Runs the Marauder / Bruce builds.',
    },
    {
        name: 'Biscuit board',
        sub: 'ESP32 · Biscuit fw',
        w: 4.6,
        d: 2.6,
        color: '#5a3a1a',
        led: '#ff9b3d',
        note: 'An ESP32 flashed with the Biscuit firmware. Pairs with the Biscuit app on the phone.',
    },
];

export default class MakerCorner {
    application: Application;
    scene: THREE.Scene;
    leds: { mat: THREE.MeshBasicMaterial; base: THREE.Color; phase: number }[] = [];

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.build();
    }

    build() {
        const g = new THREE.Group();
        // on the back wall, above the left half of the desk (monitor is around x 0)
        const WALL = ROOM.back + 40;
        g.position.set(-2250, 0, WALL);

        // pegboard: a tan perforated panel
        const PB = { w: 3200, h: 2000 };
        const peg = canvasTexture(256, 160, (ctx, w, h) => {
            ctx.fillStyle = '#d7b982';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#9c8352';
            for (let y = 8; y < h; y += 14) for (let x = 8; x < w; x += 14) {
                ctx.beginPath();
                ctx.arc(x, y, 2.4, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        peg.wrapS = peg.wrapT = THREE.RepeatWrapping;
        peg.repeat.set(10, 6);
        const board = new THREE.Mesh(new THREE.BoxGeometry(PB.w, PB.h, 30), new THREE.MeshStandardMaterial({ map: peg, roughness: 0.8 }));
        board.position.set(0, 1500, 0);
        g.add(board);

        // a title strip across the top of the pegboard
        const title = new THREE.Mesh(
            new THREE.PlaneGeometry(PB.w, 320),
            new THREE.MeshStandardMaterial({
                map: canvasTexture(1024, 128, (ctx, w, h) => {
                    ctx.fillStyle = '#1b1b22';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#5bff8a';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = 'bold 72px "Courier New", monospace';
                    ctx.fillText('CAK3D MAKER BENCH', w / 2, h / 2);
                }),
                roughness: 0.5,
            })
        );
        title.position.set(0, 2380, 20);
        g.add(title);

        // tools hung on the pegboard: pliers, cutters, a soldering iron, a multimeter
        this.hangTools(g);

        // two floating shelves holding the boards
        const shelfY = [820, 1680];
        const shelfMat = mat.std('#3a2a1a', 0.6);
        for (const y of shelfY) {
            const shelf = new THREE.Mesh(new RoundedBoxGeometry(PB.w - 200, 60, 460, 2, 20), shelfMat);
            shelf.position.set(0, y, 250);
            g.add(shelf);
            for (const bx of [-1, 1]) {
                const bracket = new THREE.Mesh(new THREE.BoxGeometry(40, 200, 400), shelfMat);
                bracket.position.set(bx * (PB.w / 2 - 300), y - 120, 230);
                g.add(bracket);
            }
        }

        // lay the boards out across the two shelves
        const top = BOARDS.slice(0, 4);
        const bottom = BOARDS.slice(4);
        this.row(g, top, shelfY[1] + 30 + 90, 250);
        this.row(g, bottom, shelfY[0] + 30 + 90, 250);

        this.scene.add(shadows(g, true, false));
    }

    row(g: THREE.Group, boards: Board[], y: number, z: number) {
        const span = 2700;
        const step = span / boards.length;
        boards.forEach((b, i) => {
            const x = -span / 2 + step * (i + 0.5);
            g.add(this.board(b, x, y, z));
        });
    }

    /** One little PCB with a silkscreen label, standing on a shelf */
    board(b: Board, x: number, y: number, z: number) {
        const grp = new THREE.Group();
        // stood up on the shelf, leaning back on the pegboard so the silkscreen faces the room
        grp.position.set(x, y, z - 1 * CM);
        grp.rotation.x = -1.15;
        // a little larger than life so the tiny boards (the XIAO is 21mm) still read on the shelf
        const SCALE = 1.7;
        const W = b.w * CM * SCALE;
        const D = b.d * CM * SCALE;
        const label = canvasTexture(256, Math.max(64, Math.round((256 * b.d) / b.w)), (ctx, w, h) => {
            ctx.fillStyle = b.color;
            ctx.fillRect(0, 0, w, h);
            // a few traces and pads for flavour
            ctx.strokeStyle = 'rgba(255,255,255,0.12)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.moveTo(Math.random() * w, Math.random() * h);
                ctx.lineTo(Math.random() * w, Math.random() * h);
                ctx.stroke();
            }
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(w * 0.18, h * 0.2, w * 0.64, h * 0.42); // the chip
            ctx.fillStyle = '#e8e8ee';
            ctx.textAlign = 'center';
            ctx.font = `bold ${Math.round(h * 0.17)}px "Courier New", monospace`;
            ctx.fillText(b.name.toUpperCase(), w / 2, h * 0.78);
            ctx.font = `${Math.round(h * 0.12)}px "Courier New", monospace`;
            ctx.fillStyle = '#9be69b';
            ctx.fillText(b.sub, w / 2, h * 0.93);
        });
        const pcb = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3 * CM, D), [
            mat.std(b.color, 0.6),
            mat.std(b.color, 0.6),
            new THREE.MeshStandardMaterial({ map: label, roughness: 0.55 }),
            mat.std(b.color, 0.6),
            mat.std(b.color, 0.6),
            mat.std(b.color, 0.6),
        ]);
        pcb.position.y = 0.15 * CM;
        grp.add(pcb);
        // header pins along one edge
        const pins = new THREE.Mesh(new THREE.BoxGeometry(W * 0.9, 0.5 * CM, 0.3 * CM), mat.std('#1a1a1a', 0.4, 0.7));
        pins.position.set(0, 0.45 * CM, -D / 2 + 0.3 * CM);
        grp.add(pins);
        if (b.led) {
            const ledMat = new THREE.MeshBasicMaterial({ color: b.led });
            const led = new THREE.Mesh(new THREE.BoxGeometry(0.22 * CM, 0.22 * CM, 0.22 * CM), ledMat);
            led.position.set(W / 2 - 0.5 * CM, 0.4 * CM, D / 2 - 0.5 * CM);
            grp.add(led);
            this.leds.push({ mat: ledMat, base: new THREE.Color(b.led), phase: Math.random() * Math.PI * 2 });
        }

        inspectable(grp, new THREE.Vector3(0, 0.35, 1));
        grp.userData.menuTitle = b.name;
        const open = () => {
            const stash = this.application.world.deskStash;
            if (stash && b.open) stash.loadOnPc(b.open, 'desk');
        };
        const items = [{ label: 'Look closer', run: () => this.application.world.deskStash.inspect(grp) }];
        if (b.open) {
            grp.userData.onClick = open;
            items.push({ label: `Open ${b.open.name}`, run: open });
        }
        items.push({ label: 'Read the silkscreen', run: () => {}, ...(b.note ? { say: b.note } : { say: `${b.name} — ${b.sub}.` }) } as any);
        menu(grp, items as any);
        return grp;
    }

    /** A few tools hanging on the pegboard */
    hangTools(g: THREE.Group) {
        const steel = mat.std('#b8bcc4', 0.3, 0.9);
        const handle = (c: string) => mat.std(c, 0.5);

        // soldering iron on a stand
        const iron = new THREE.Group();
        const ironHandle = new THREE.Mesh(new THREE.CylinderGeometry(1.2 * CM, 1 * CM, 10 * CM, 12), handle('#1e5bb8'));
        ironHandle.rotation.z = Math.PI / 2;
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * CM, 0.5 * CM, 6 * CM, 10), steel);
        tip.rotation.z = Math.PI / 2;
        tip.position.x = 7.5 * CM;
        iron.add(ironHandle, tip);
        iron.position.set(1050, 1500, 60);
        iron.rotation.z = -0.35;
        g.add(iron);

        // pliers and side cutters: a simple X of two handles
        const tool = (x: number, c: string, open: number) => {
            const t = new THREE.Group();
            for (const s of [-1, 1]) {
                const arm = new THREE.Mesh(new RoundedBoxGeometry(1.2 * CM, 11 * CM, 0.8 * CM, 1, 0.3 * CM), handle(c));
                arm.position.y = -3 * CM;
                arm.rotation.z = s * open;
                const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.8 * CM, 6 * CM, 8), steel);
                jaw.position.y = 5 * CM;
                jaw.rotation.z = -s * open * 0.5;
                const half = new THREE.Group();
                half.add(arm, jaw);
                t.add(half);
            }
            t.position.set(x, 1500, 60);
            g.add(t);
        };
        tool(-900, '#c42b2b', 0.12);
        tool(-500, '#ffd23d', 0.16);

        // a multimeter hung on the board
        const dmm = new THREE.Mesh(new RoundedBoxGeometry(11 * CM, 16 * CM, 3 * CM, 2, 1 * CM), mat.std('#e0a21a', 0.5));
        const dmmScreen = new THREE.Mesh(
            new THREE.PlaneGeometry(8 * CM, 4 * CM),
            new THREE.MeshBasicMaterial({
                map: canvasTexture(128, 64, (ctx, w, h) => {
                    ctx.fillStyle = '#9fd9a0';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#123';
                    ctx.textAlign = 'right';
                    ctx.font = 'bold 34px "Courier New", monospace';
                    ctx.fillText('4.20', w - 8, 44);
                }),
            })
        );
        dmmScreen.position.set(0, 4 * CM, 1.6 * CM);
        dmm.add(dmmScreen);
        dmm.position.set(500, 1480, 70);
        dmm.rotation.z = 0.1;
        g.add(dmm);

        // a little coil of solder
        const solder = new THREE.Mesh(new THREE.TorusGeometry(4 * CM, 1.6 * CM, 10, 24), mat.std('#8a8f99', 0.4, 0.7));
        solder.position.set(1280, 1050, 80);
        g.add(solder);

        // a breadboard on the top shelf's wall with some jumper wires
        const bb = new THREE.Mesh(new RoundedBoxGeometry(16 * CM, 6 * CM, 1 * CM, 2, 0.3 * CM), mat.std('#f0f0f0', 0.6));
        bb.position.set(-1150, 1050, 70);
        g.add(bb);
    }

    update() {
        // the status LEDs breathe a little
        const t = this.application.time.elapsed;
        for (const l of this.leds) {
            const k = 0.55 + 0.45 * Math.sin(t * 0.004 + l.phase);
            l.mat.color.copy(l.base).multiplyScalar(0.6 + k * 0.6);
        }
    }
}
