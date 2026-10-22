import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import Application from '../../Application';
import { CameraKey } from '../../Camera/Camera';
import UIEventBus from '../../UI/EventBus';
import Entertainment from './Entertainment';
import { canvasTexture, CM, FLOOR_Y, inspectable, mat, RoundedBoxGeometry, shadows } from './props';

// a 13.6" MacBook Air: 30.4 x 21.5 cm, about a centimeter thick
const W = 30.4 * CM;
const D = 21.5 * CM;
const BASE_H = 0.6 * CM;
const LID_H = 0.45 * CM;
const SCREEN = { w: 28.6 * CM, h: 18.6 * CM };
const PX = { w: 1280, h: 832 };

/**
 * A MacBook Air open on the couch cushion. Asleep it shows a lock screen;
 * click it and the camera squares up on the display, which wakes into the
 * CAK3D OS X desktop (static/laptop/) running in a real browser layer: Safari,
 * Screen Sharing to the PC, a TV remote, Finder and the rest. The page talks
 * to the room with postMessage (see onMessage).
 */
export default class Laptop {
    application: Application;
    scene: THREE.Scene;
    entertainment: Entertainment;
    group: THREE.Group;
    screen: THREE.Mesh;
    hole: THREE.Mesh;
    css: CSS3DObject;
    iframe: HTMLIFrameElement;
    lockCtx: CanvasRenderingContext2D;
    lockTex: THREE.CanvasTexture;
    awake = false;
    minute = -1;

    constructor(entertainment: Entertainment) {
        this.application = new Application();
        this.scene = this.application.scene;
        this.entertainment = entertainment;
        this.build();
        this.buildScreen();
        window.addEventListener('message', (event) => this.onMessage(event));
        // what the stereo is playing shows on the laptop's CAK3D FM app
        UIEventBus.on('stereoState', (state: { playing: boolean; title: string }) => this.send({ type: 'cak3d-stereo', playing: state.playing, title: state.title }));
    }

    build() {
        const g = new THREE.Group();
        // left seat cushion of the couch, angled toward the room
        g.position.set(-9700, FLOOR_Y + 1660, 450);
        g.rotation.y = 0.35;
        const alu = mat.std('#cfd2d8', 0.28, 0.85);
        const black = mat.std('#0d0d10', 0.5);

        const base = new THREE.Mesh(new RoundedBoxGeometry(W, BASE_H, D, 3, 0.25 * CM), alu);
        base.position.y = BASE_H / 2;
        g.add(base);
        const top = BASE_H + 0.02 * CM;

        // keyboard well and the keys: a function row of half-height keys, then five full rows
        const well = new THREE.Mesh(new THREE.PlaneGeometry(27.9 * CM, 11.6 * CM), mat.std('#b7bac1', 0.45, 0.7));
        well.rotation.x = -Math.PI / 2;
        well.position.set(0, top, -3.6 * CM);
        g.add(well);
        const rows: { units: number[]; h: number }[] = [
            { units: Array(14).fill(1), h: 0.9 },
            { units: [...Array(13).fill(1), 1.5], h: 1.6 },
            { units: [1.5, ...Array(12).fill(1), 1], h: 1.6 },
            { units: [1.8, ...Array(11).fill(1), 1.7], h: 1.6 },
            { units: [2.3, ...Array(10).fill(1), 2.2], h: 1.6 },
            { units: [1, 1, 1, 1.25, 5.25, 1.25, 1, 1, 1, 1], h: 1.6 },
        ];
        const keyCount = rows.reduce((n, r) => n + r.units.length, 0);
        const keys = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12 * CM, 1), black, keyCount);
        const m = new THREE.Matrix4();
        const rowW = 27.3 * CM;
        let z = -9.0 * CM;
        let k = 0;
        for (const row of rows) {
            const total = row.units.reduce((a, b) => a + b, 0);
            const unit = rowW / total;
            let x = -rowW / 2;
            for (const u of row.units) {
                const w = u * unit - 0.2 * CM;
                m.compose(new THREE.Vector3(x + (u * unit) / 2, top + 0.06 * CM, z + (row.h * CM) / 2), new THREE.Quaternion(), new THREE.Vector3(w, 1, row.h * CM));
                keys.setMatrixAt(k++, m);
                x += u * unit;
            }
            z += (row.h + 0.2) * CM;
        }
        g.add(keys);

        // the big glass trackpad
        const pad = new THREE.Mesh(new RoundedBoxGeometry(16 * CM, 0.04 * CM, 9.6 * CM, 2, 0.02 * CM), mat.std('#c4c7ce', 0.18, 0.6));
        pad.position.set(0, top, 5.2 * CM);
        g.add(pad);

        // the lid, hinged at the back edge and opened about 110 degrees
        const hinge = new THREE.Group();
        hinge.position.set(0, BASE_H, -D / 2 + 0.3 * CM);
        hinge.rotation.x = -0.33;
        const lid = new THREE.Mesh(new RoundedBoxGeometry(W, D - 0.3 * CM, LID_H, 3, 0.2 * CM), alu);
        lid.position.set(0, (D - 0.3 * CM) / 2, -LID_H / 2);
        // black glass bezel over the whole inside face
        const glass = new THREE.MeshBasicMaterial({ color: '#050506' }); // unlit, so it stays black like real screen glass
        const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4 * CM, D - 0.7 * CM), glass);
        bezel.position.set(0, (D - 0.3 * CM) / 2, 0.01 * CM);
        hinge.add(lid, bezel);

        // the display (lock screen while asleep) and the camera notch at the top
        this.lockTex = canvasTexture(640, 416, (ctx) => (this.lockCtx = ctx)) as THREE.CanvasTexture;
        this.screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.MeshBasicMaterial({ map: this.lockTex, toneMapped: false }));
        this.screen.position.set(0, (D - 0.3 * CM) / 2 + 0.25 * CM, 0.03 * CM);
        const notch = new THREE.Mesh(new THREE.PlaneGeometry(3.2 * CM, 0.75 * CM), glass);
        notch.position.set(0, this.screen.position.y + SCREEN.h / 2 - 0.37 * CM, 0.06 * CM);
        hinge.add(this.screen, notch);
        g.add(hinge);

        this.group = g;
        this.scene.add(shadows(g, true, false));
        inspectable(g);
        // the camera squares up on the display (DeskStash asks for this view) and the laptop wakes
        g.userData.inspectView = () => {
            this.wake();
            return this.view();
        };
        this.drawLock();
    }

    /** The real page on the display, placed exactly over the screen mesh */
    buildScreen() {
        const div = document.createElement('div');
        div.style.cssText = `width:${PX.w}px;height:${PX.h}px;background:#000;overflow:hidden;`;
        this.iframe = document.createElement('iframe');
        this.iframe.title = 'CAK3D OS X';
        this.iframe.allow = 'autoplay; fullscreen; clipboard-write; local-network-access';
        this.iframe.style.cssText = 'width:100%;height:100%;border:0;';
        div.appendChild(this.iframe);
        this.css = new CSS3DObject(div);
        this.group.updateMatrixWorld(true);
        this.screen.matrixWorld.decompose(this.css.position, this.css.quaternion, new THREE.Vector3());
        this.css.scale.setScalar(SCREEN.w / PX.w);
        this.application.cssScene.add(this.css);

        // black + alpha 0 cuts a window in the WebGL scene for the page to show through
        this.hole = new THREE.Mesh(
            new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
            new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0, transparent: true, blending: THREE.NoBlending, side: THREE.DoubleSide })
        );
        this.screen.parent!.add(this.hole);
        this.hole.position.copy(this.screen.position);
        this.setAwake(false);
    }

    /** Where the camera sits to use the laptop: square on to the display, filling the view */
    view() {
        this.screen.updateMatrixWorld(true);
        const center = new THREE.Vector3().setFromMatrixPosition(this.screen.matrixWorld);
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(this.screen.getWorldQuaternion(new THREE.Quaternion()));
        const aspect = this.application.sizes.width / this.application.sizes.height;
        const fit = 2 * Math.tan(THREE.MathUtils.degToRad(this.application.camera.instance.fov / 2));
        const distance = Math.max((SCREEN.h * 1.3) / fit, (SCREEN.w * 1.18) / (fit * aspect));
        return { position: center.clone().addScaledVector(normal, distance), focalPoint: center };
    }

    wake() {
        if (!this.iframe.src) this.iframe.src = 'laptop/index.html';
        this.setAwake(true);
    }

    private setAwake(on: boolean) {
        this.awake = on;
        this.css.visible = on;
        (this.css.element as HTMLElement).style.display = on ? 'block' : 'none';
        this.hole.visible = on;
        this.screen.visible = !on;
    }

    send(message: object) {
        if (this.iframe.contentWindow && this.iframe.src) this.iframe.contentWindow.postMessage(message, '*');
    }

    /** Keeps the laptop's remote showing what the room's TV is doing */
    sendTvState() {
        const e = this.entertainment;
        this.send({ type: 'cak3d-tv-state', channel: e.channel, power: e.tvOn, volume: e.tv.volume, muted: e.tv.muted });
    }

    /** The laptop's TV remote and CAK3D FM apps */
    onMessage(event: MessageEvent) {
        const d = event.data;
        if (!d || typeof d.type !== 'string' || event.source !== this.iframe.contentWindow) return;
        const e = this.entertainment;
        if (d.type === 'cak3d-laptop-tv') {
            if (d.action === 'tune') {
                const i = typeof d.value === 'string' ? e.channels.findIndex((c) => c.name === d.value) : Number(d.value);
                if (i >= 0 && i < e.channels.length) e.setPower(true, i);
            } else if (d.action === 'power') e.setPower(!e.tvOn);
            else if (d.action === 'volume') e.tv.setVolume(Number(d.value));
            else if (d.action === 'mute') e.tv.toggleMute();
            else if (d.action === 'input') e.cycleInput();
            this.sendTvState();
        } else if (d.type === 'cak3d-laptop' && d.action === 'ready') {
            this.sendTvState();
        } else if (d.type === 'cak3d-laptop-stereo' && d.action === 'open') {
            e.openStereo();
        }
    }

    /** Asleep: a lock screen with the time on a CAK3D wallpaper */
    drawLock() {
        const ctx = this.lockCtx;
        const { width: w, height: h } = ctx.canvas;
        const bg = ctx.createLinearGradient(0, 0, w, h);
        bg.addColorStop(0, '#2b0f4a');
        bg.addColorStop(0.55, '#5b2a86');
        bg.addColorStop(1, '#1d6b3a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        // soft hills, like a desktop wallpaper
        ctx.fillStyle = 'rgba(91,209,106,0.25)';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.bezierCurveTo(w * 0.3, h * 0.55, w * 0.6, h * 0.95, w, h * 0.62);
        ctx.lineTo(w, h);
        ctx.fill();
        const now = new Date();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.textAlign = 'center';
        ctx.font = '22px -apple-system, "Segoe UI", Arial, sans-serif';
        ctx.fillText(now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }), w / 2, 78);
        ctx.font = 'bold 96px -apple-system, "Segoe UI", Arial, sans-serif';
        ctx.fillText(now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, ''), w / 2, 170);
        ctx.font = '18px -apple-system, "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText('CAK3D · click to wake', w / 2, h - 34);
        this.lockTex.needsUpdate = true;
        this.minute = now.getMinutes();
    }

    update() {
        if (!this.awake && new Date().getMinutes() !== this.minute) this.drawLock();
        // in use only while the camera is on it: the page takes clicks then, and sleeps when you walk away
        const camera = this.application.camera;
        const stash = this.application.world.deskStash;
        const using = camera.currentKeyframe === CameraKey.INSPECT && !!stash && stash.inspecting === this.group;
        const flying = camera.targetKeyframe === CameraKey.INSPECT && !!stash && stash.inspecting === this.group;
        if (this.awake && !using && !flying) this.setAwake(false);
        (this.css.element as HTMLElement).style.pointerEvents = using ? 'auto' : 'none';
    }
}
