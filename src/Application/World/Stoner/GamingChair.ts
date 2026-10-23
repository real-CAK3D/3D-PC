import * as THREE from 'three';
import Application from '../../Application';
import { canvasTexture, CM, FLOOR_Y, inspectable, leafPath, mat, RoundedBoxGeometry, shadows } from './props';
import { menu } from './ContextMenu';
import { CameraKey } from '../../Camera/Camera';

/**
 * Racing-style gaming chair in black and purple, replacing the baked office
 * chair at the desk. It faces the desk (-z) and swivels a little with the mouse.
 */
export default class GamingChair {
    application: Application;
    scene: THREE.Scene;
    group: THREE.Group;
    swivel: THREE.Group;
    spin = 0; // extra turns from "Spin it"

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        for (const name of ['chair_base', 'chair_seat']) {
            const old = this.scene.getObjectByName(name);
            if (old) old.visible = false;
        }

        this.group = new THREE.Group();
        this.group.position.set(700, FLOOR_Y, 2450);
        this.swivel = new THREE.Group();
        this.group.add(this.swivel);
        this.buildBase();
        this.buildSeat();
        this.scene.add(inspectable(shadows(this.group), new THREE.Vector3(0.5, 0.3, 1)));
        this.group.userData.menuTitle = 'Gaming chair';
        menu(this.group, [
            { label: 'Spin it', run: () => (this.spin += Math.PI * 4) },
            { label: 'Sit at the desk', run: () => this.application.camera.transition(CameraKey.DESK) },
            { label: 'Adjust the lumbar', say: ['Ahh. Your spine thanks you.', 'Click. Click. Perfect.'] },
        ]);
    }

    buildBase() {
        const chrome = mat.std('#1c1c20', 0.3, 0.8);
        const black = mat.std('#121214', 0.5);
        // five-star base with casters
        for (let i = 0; i < 5; i++) {
            const arm = new THREE.Group();
            arm.rotation.y = (i / 5) * Math.PI * 2;
            const leg = new THREE.Mesh(new RoundedBoxGeometry(34 * CM, 3.5 * CM, 5 * CM, 2, 1 * CM), chrome);
            leg.position.set(17 * CM, 9 * CM, 0);
            leg.rotation.z = 0.08;
            const caster = new THREE.Mesh(new THREE.CylinderGeometry(2.6 * CM, 2.6 * CM, 3 * CM, 16), black);
            caster.rotation.x = Math.PI / 2;
            caster.position.set(32 * CM, 2.6 * CM, 0);
            arm.add(leg, caster);
            this.group.add(arm);
        }
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(5 * CM, 6 * CM, 6 * CM, 20), chrome);
        hub.position.y = 10 * CM;
        const gas = new THREE.Mesh(new THREE.CylinderGeometry(2.5 * CM, 2.5 * CM, 30 * CM, 16), mat.std('#8a8a90', 0.25, 0.9));
        gas.position.y = 26 * CM;
        this.group.add(hub, gas);
    }

    buildSeat() {
        const s = this.swivel;
        const black = new THREE.MeshStandardMaterial({ map: leatherTexture('#17151c'), roughness: 0.55 });
        const purple = new THREE.MeshStandardMaterial({ map: leatherTexture('#6a2bb8'), roughness: 0.5 });
        const plastic = mat.std('#121214', 0.45);
        const seatY = 46 * CM;

        // seat pan with raised side bolsters
        const pan = new THREE.Mesh(new RoundedBoxGeometry(50 * CM, 9 * CM, 50 * CM, 3, 3 * CM), black);
        pan.position.y = seatY;
        s.add(pan);
        const cushion = new THREE.Mesh(new RoundedBoxGeometry(30 * CM, 4 * CM, 44 * CM, 3, 1.8 * CM), purple);
        cushion.position.set(0, seatY + 5 * CM, 1 * CM);
        s.add(cushion);
        for (const sx of [-1, 1]) {
            const bolster = new THREE.Mesh(new RoundedBoxGeometry(9 * CM, 9 * CM, 48 * CM, 3, 3.5 * CM), black);
            bolster.position.set(sx * 21 * CM, seatY + 5 * CM, 0);
            bolster.rotation.z = sx * -0.2;
            s.add(bolster);
        }

        // tall backrest (behind the seat, +z, leaning back), wings and a headrest pillow
        const back = new THREE.Group();
        back.position.set(0, seatY + 3 * CM, 24 * CM);
        back.rotation.x = 0.18;
        const shell = new THREE.Mesh(new RoundedBoxGeometry(52 * CM, 82 * CM, 10 * CM, 3, 4 * CM), black);
        shell.position.y = 41 * CM;
        const stripe = new THREE.Mesh(new RoundedBoxGeometry(26 * CM, 66 * CM, 4 * CM, 3, 1.8 * CM), purple);
        stripe.position.set(0, 38 * CM, -5 * CM);
        back.add(shell, stripe);
        for (const sx of [-1, 1]) {
            const wing = new THREE.Mesh(new RoundedBoxGeometry(9 * CM, 54 * CM, 12 * CM, 3, 4 * CM), black);
            wing.position.set(sx * 22 * CM, 34 * CM, -5 * CM);
            wing.rotation.y = sx * 0.35;
            back.add(wing);
        }
        // head wings and the embroidered headrest pillow
        const head = new THREE.Mesh(new RoundedBoxGeometry(34 * CM, 18 * CM, 11 * CM, 3, 5 * CM), black);
        head.position.set(0, 88 * CM, 0);
        back.add(head);
        const pillow = new THREE.Mesh(new RoundedBoxGeometry(26 * CM, 13 * CM, 6 * CM, 3, 3 * CM), [
            black,
            black,
            black,
            black,
            black,
            new THREE.MeshStandardMaterial({ map: emblemTexture(), roughness: 0.6 }),
        ]);
        pillow.position.set(0, 76 * CM, -7 * CM);
        pillow.rotation.y = Math.PI; // embroidered side faces the desk
        back.add(pillow);
        s.add(back);

        // armrests
        for (const sx of [-1, 1]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(4 * CM, 22 * CM, 4 * CM), plastic);
            post.position.set(sx * 27 * CM, seatY + 10 * CM, 4 * CM);
            const pad = new THREE.Mesh(new RoundedBoxGeometry(8 * CM, 3 * CM, 26 * CM, 2, 1.2 * CM), plastic);
            pad.position.set(sx * 27 * CM, seatY + 21 * CM, 0);
            s.add(post, pad);
        }
    }

    update() {
        // a lazy swivel toward wherever you're looking
        const m = this.application.mouse;
        const sizes = this.application.sizes;
        const target = (m.x / sizes.width - 0.5) * -0.35 + this.spin;
        this.swivel.rotation.y += (target - this.swivel.rotation.y) * 0.03;
    }
}

function leatherTexture(base: string) {
    const tex = canvasTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
            ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }
        // quilted stitching
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        for (let y = 16; y < h; y += 32) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

function emblemTexture() {
    return canvasTexture(256, 128, (ctx, w, h) => {
        ctx.fillStyle = '#17151c';
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.translate(46, 70);
        ctx.scale(34, 34);
        ctx.fillStyle = '#5bd16a';
        leafPath(ctx);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#c38cff';
        ctx.font = 'bold italic 40px Arial, sans-serif';
        ctx.fillText('CAK3D', 90, 78);
    });
}
