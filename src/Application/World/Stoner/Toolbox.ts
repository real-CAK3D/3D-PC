import * as THREE from 'three';
import Application from '../../Application';
import { canvasTexture, CM, FLOOR_Y, inspectable, mat, RoundedBoxGeometry, shadows } from './props';
import { ROOM } from './Room';
import { StashItem } from './stash';

/** Ibby's mobile auto service: the tools in the box open it */
const IBBY: { [tool: string]: StashItem } = {
    wrench: {
        name: 'IbbyAutoWorks · Request Service',
        description: 'Mobile Auto Service: book a repair.',
        url: 'https://ibbyautoworks.vercel.app/request',
        repo: 'https://github.com/IbbyAutoWorks/IbbyAutoWorks.github.io',
    },
    ratchet: {
        name: 'IbbyAutoWorks',
        description: 'Mobile Auto Service',
        url: 'https://ibbyautoworks.github.io/',
        repo: 'https://github.com/IbbyAutoWorks/IbbyAutoWorks.github.io',
    },
    screwdriver: {
        name: 'IbbyAutoWorks on GitHub',
        description: 'Source for the Mobile Auto Service site.',
        url: 'https://github.com/IbbyAutoWorks/IbbyAutoWorks.github.io',
        repo: 'https://github.com/IbbyAutoWorks/IbbyAutoWorks.github.io',
    },
};

/**
 * A red mechanic's toolbox and a pair of work boots by the door. Click the box
 * to look, click again to open the lid, then pick a tool to open IbbyAutoWorks
 * on the PC.
 */
export default class Toolbox {
    application: Application;
    scene: THREE.Scene;
    lid: THREE.Group;
    open = false;
    lidAngle = 0;
    tools: THREE.Object3D[] = [];

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.buildBox();
        this.buildBoots();
    }

    buildBox() {
        const g = new THREE.Group();
        // lengthwise against the right wall, clear of the boots, its front facing into the room
        g.position.set(ROOM.right - 520, FLOOR_Y, ROOM.front - 1500);
        g.rotation.y = -Math.PI / 2 + 0.15;
        const red = mat.std('#b3201c', 0.35, 0.4);
        const steel = mat.std('#c9ccd2', 0.3, 0.85);
        const W = 56 * CM;
        const H = 26 * CM;
        const D = 26 * CM;

        // open-topped body so the tray shows when the lid lifts
        const t = 1 * CM;
        const part = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material = red) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
            mesh.position.set(x, y, z);
            g.add(mesh);
            return mesh;
        };
        part(W, t, D, 0, t / 2, 0);
        part(W, H, t, 0, H / 2, D / 2 - t / 2);
        part(W, H, t, 0, H / 2, -D / 2 + t / 2);
        part(t, H, D, W / 2 - t / 2, H / 2, 0);
        part(t, H, D, -W / 2 + t / 2, H / 2, 0);
        // front label + latches
        const label = new THREE.Mesh(
            new THREE.PlaneGeometry(26 * CM, 6 * CM),
            new THREE.MeshStandardMaterial({
                map: canvasTexture(256, 64, (ctx, w, h) => {
                    ctx.fillStyle = '#1b1b1f';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#ffd23d';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 30px Impact, Arial, sans-serif';
                    ctx.fillText("IBBY'S AUTO", w / 2, 44);
                }),
                roughness: 0.5,
            })
        );
        label.position.set(0, H * 0.55, D / 2 + 1);
        g.add(label);
        for (const sx of [-1, 1]) part(4 * CM, 3 * CM, 1 * CM, sx * 20 * CM, H - 2 * CM, D / 2 + 0.6 * CM, steel);

        // tray with the tools in it
        part(W - 2 * t, 0.6 * CM, D - 2 * t, 0, H - 6 * CM, 0, mat.std('#2a2a2e', 0.6));
        const tray = H - 6 * CM + 0.4 * CM;
        this.addTool(g, this.wrench(steel), 'wrench', -14 * CM, tray, -3 * CM);
        this.addTool(g, this.ratchet(steel), 'ratchet', 6 * CM, tray, -4 * CM);
        this.addTool(g, this.screwdriver(), 'screwdriver', 2 * CM, tray, 5 * CM);

        // lid hinged along the back edge, with a carry handle
        this.lid = new THREE.Group();
        this.lid.position.set(0, H, -D / 2);
        const top = new THREE.Mesh(new RoundedBoxGeometry(W + 1 * CM, 3 * CM, D + 1 * CM, 2, 0.8 * CM), red);
        top.position.set(0, 1.5 * CM, D / 2);
        const handle = new THREE.Mesh(new THREE.TorusGeometry(8 * CM, 0.8 * CM, 8, 24, Math.PI), mat.std('#111114', 0.5));
        // a half ring already stands up in its own x/y plane: an arch along the lid, like a real carry handle
        handle.position.set(0, 3 * CM, D / 2);
        this.lid.add(top, handle);
        g.add(this.lid);

        this.scene.add(shadows(g));
        inspectable(g, new THREE.Vector3(-0.7, 0.9, -0.2));
        g.userData.onClick = () => (this.open = !this.open);
    }

    addTool(box: THREE.Group, tool: THREE.Object3D, kind: string, x: number, y: number, z: number) {
        tool.position.set(x, y, z);
        box.add(tool);
        tool.userData.onClick = () => {
            if (!this.open) {
                this.open = true;
                return;
            }
            const stash = this.application.world.deskStash;
            if (stash) stash.loadOnPc(IBBY[kind], 'desk');
        };
        this.tools.push(tool);
    }

    wrench(steel: THREE.Material) {
        const t = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(18 * CM, 0.6 * CM, 1.6 * CM), steel);
        const open = new THREE.Mesh(new THREE.TorusGeometry(1.4 * CM, 0.55 * CM, 8, 16, Math.PI * 1.4), steel);
        open.rotation.x = Math.PI / 2;
        open.position.x = 9.6 * CM;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.2 * CM, 0.5 * CM, 8, 16), steel);
        ring.rotation.x = Math.PI / 2;
        ring.position.x = -9.6 * CM;
        t.add(shaft, open, ring);
        t.rotation.y = 0.15;
        return t;
    }

    ratchet(steel: THREE.Material) {
        const t = new THREE.Group();
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * CM, 0.8 * CM, 14 * CM, 12), mat.std('#c4161c', 0.4));
        handle.rotation.z = Math.PI / 2;
        handle.position.x = -4 * CM;
        const head = new THREE.Mesh(new THREE.CylinderGeometry(1.8 * CM, 1.8 * CM, 1.4 * CM, 20), steel);
        head.position.x = 4.5 * CM;
        t.add(handle, head);
        t.rotation.y = -0.3;
        return t;
    }

    screwdriver() {
        const t = new THREE.Group();
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * CM, 1.3 * CM, 9 * CM, 12), mat.std('#ffd23d', 0.4));
        grip.rotation.z = Math.PI / 2;
        grip.position.x = -6 * CM;
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * CM, 0.3 * CM, 12 * CM, 8), mat.std('#c9ccd2', 0.3, 0.85));
        shaft.rotation.z = Math.PI / 2;
        shaft.position.x = 4.5 * CM;
        t.add(grip, shaft);
        t.rotation.y = 0.5;
        return t;
    }

    /** A worn pair of leather work boots */
    buildBoots() {
        const leather = mat.std('#6b4423', 0.75);
        const sole = mat.std('#1e1a17', 0.9);
        const laces = canvasTexture(64, 128, (ctx, w, h) => {
            ctx.fillStyle = '#6b4423';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#d9c39a';
            ctx.lineWidth = 4;
            for (let y = 10; y < h; y += 16) {
                ctx.beginPath();
                ctx.moveTo(8, y);
                ctx.lineTo(w - 8, y + 10);
                ctx.moveTo(w - 8, y);
                ctx.lineTo(8, y + 10);
                ctx.stroke();
            }
        });
        const boot = (x: number, z: number, ry: number) => {
            const g = new THREE.Group();
            g.position.set(x, FLOOR_Y, z);
            g.rotation.y = ry;
            const s = new THREE.Mesh(new RoundedBoxGeometry(11 * CM, 3 * CM, 30 * CM, 2, 1.2 * CM), sole);
            s.position.y = 1.5 * CM;
            const foot = new THREE.Mesh(new RoundedBoxGeometry(10 * CM, 9 * CM, 26 * CM, 3, 4 * CM), leather);
            foot.position.set(0, 7 * CM, 1.5 * CM);
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(5.2 * CM, 5.6 * CM, 16 * CM, 16, 1, true), [leather]);
            shaft.position.set(0, 18 * CM, -6 * CM);
            const tongue = new THREE.Mesh(new THREE.PlaneGeometry(5 * CM, 14 * CM), new THREE.MeshStandardMaterial({ map: laces, roughness: 0.8 }));
            tongue.position.set(0, 16 * CM, -0.4 * CM);
            tongue.rotation.x = -0.35;
            g.add(s, foot, shaft, tongue);
            this.scene.add(shadows(g));
            return inspectable(g, new THREE.Vector3(0.3, 0.6, -1));
        };
        boot(3200, ROOM.front - 600, Math.PI + 0.1);
        boot(3500, ROOM.front - 520, Math.PI - 0.2);
    }

    update() {
        const dt = Math.min(this.application.time.delta, 50) / 1000;
        this.lidAngle += ((this.open ? -1.9 : 0) - this.lidAngle) * Math.min(1, dt * 6);
        this.lid.rotation.x = this.lidAngle;
    }
}
