import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import Application from '../../Application';
import { CameraKey } from '../../Camera/Camera';
import Entertainment from './Entertainment';
import { menu } from './ContextMenu';
import { canvasTexture, CM, inspectable, mat, RoundedBoxGeometry, shadows } from './props';

// Galaxy Z Fold 8: 158.4 x 72.8 mm folded (8.9 mm thick), 143.2 mm wide unfolded
const L = 15.84 * CM; // length, top to bottom
const HALF = 7.25 * CM; // width of each half
const T = 0.43 * CM; // thickness of each half
const COVER = { w: 6.55 * CM, h: 15.0 * CM }; // the outside 6.5" screen
const INNER = { w: 2 * HALF - 0.5 * CM, h: L - 0.5 * CM }; // the 8" inside screen across both halves
const COVER_PX = { w: 412, h: Math.round((412 * COVER.h) / COVER.w) };
const INNER_PX = { w: 900, h: Math.round((900 * INNER.h) / INNER.w) };

/**
 * A Galaxy Z Fold 8 lying on the couch arm. Click it and the camera looks at
 * it right side up; the cover screen wakes into CAK3D UI (static/phone/).
 * Right-click to unfold it: the front half swings open on its hinge and the
 * big inside screen shows the hacker layout with the ESP32 / XIAO tools.
 *
 * Phone-local axes: x to the right, y out of the cover screen, z toward the
 * bottom of the phone (so -z is its top). The hinge runs along the left edge.
 */
export default class Phone {
    application: Application;
    entertainment: Entertainment;
    group: THREE.Group;
    front: THREE.Group; // the half with the cover screen, swings open on the hinge
    coverScreen: THREE.Mesh;
    innerScreen: THREE.Mesh; // spans both halves once open
    hole: THREE.Mesh;
    css: CSS3DObject;
    frame: HTMLDivElement;
    iframe: HTMLIFrameElement;
    unfolded = false;
    fold = 0; // 0 shut .. 1 open
    awake = false;

    constructor(spot: THREE.Object3D, entertainment: Entertainment) {
        this.application = new Application();
        this.entertainment = entertainment;
        this.build(spot);
        this.buildScreen();
        window.addEventListener('message', (event) => {
            const d = event.data;
            if (!d || d.type !== 'cak3d-phone' || event.source !== this.iframe.contentWindow) return;
            if (d.action === 'stereo') this.entertainment.openStereo();
            if (d.action === 'fold' || d.action === 'unfold') this.setUnfolded(d.action === 'unfold');
        });
    }

    build(spot: THREE.Object3D) {
        const g = new THREE.Group();
        const frame = mat.std('#39404d', 0.3, 0.9); // Blue Shadow aluminum
        const back = mat.std('#1e2838', 0.25, 0.3);
        const glass = new THREE.MeshBasicMaterial({ color: '#050507' });
        const lens = mat.std('#0a0a0c', 0.1, 0.6);
        const ring = mat.std('#8d95a3', 0.25, 0.9);

        // back half (lies on the couch): back glass underneath, inner screen on top
        const backHalf = new THREE.Mesh(new RoundedBoxGeometry(HALF, T, L, 3, 0.18 * CM), frame);
        backHalf.position.set(0, T / 2, 0);
        g.add(backHalf);
        const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(HALF - 0.3 * CM, L - 0.3 * CM), back);
        backGlass.rotation.x = Math.PI / 2;
        backGlass.position.y = -0.01 * CM;
        g.add(backGlass);
        // camera island on the back: three lenses stacked in the top left corner (seen from the back)
        for (let i = 0; i < 3; i++) {
            const r = new THREE.Mesh(new THREE.CylinderGeometry(0.62 * CM, 0.62 * CM, 0.12 * CM, 24), ring);
            r.position.set(HALF / 2 - 1.15 * CM, -0.06 * CM, -L / 2 + 1.4 * CM + i * 1.5 * CM);
            const l = new THREE.Mesh(new THREE.CylinderGeometry(0.48 * CM, 0.48 * CM, 0.14 * CM, 24), lens);
            l.position.copy(r.position).y -= 0.02 * CM;
            g.add(r, l);
        }
        // inner screen's right half (it's one panel across both halves once open)
        const innerRight = new THREE.Mesh(new THREE.PlaneGeometry(HALF - 0.25 * CM, INNER.h), glass);
        innerRight.rotation.x = -Math.PI / 2;
        innerRight.position.set(0, T + 0.01 * CM, 0);
        g.add(innerRight);

        // front half on a hinge along the left edge, closed on top of the back half
        this.front = new THREE.Group();
        this.front.position.set(-HALF / 2, T, 0);
        const frontBody = new THREE.Mesh(new RoundedBoxGeometry(HALF, T, L, 3, 0.18 * CM), frame);
        frontBody.position.set(HALF / 2, T / 2, 0);
        this.front.add(frontBody);
        // the cover screen with its punch-hole selfie camera at the top center
        const lock = canvasTexture(206, 472, (ctx, w, h) => drawLock(ctx, w, h));
        this.coverScreen = new THREE.Mesh(new THREE.PlaneGeometry(COVER.w, COVER.h), new THREE.MeshBasicMaterial({ map: lock, toneMapped: false }));
        this.coverScreen.rotation.x = -Math.PI / 2;
        this.coverScreen.position.set(HALF / 2, T + 0.01 * CM, 0);
        const punch = new THREE.Mesh(new THREE.CircleGeometry(0.17 * CM, 16), glass);
        punch.rotation.x = -Math.PI / 2;
        punch.position.set(HALF / 2, T + 0.03 * CM, -COVER.h / 2 + 0.45 * CM);
        const coverBezel = new THREE.Mesh(new THREE.PlaneGeometry(HALF - 0.25 * CM, L - 0.25 * CM), glass);
        coverBezel.rotation.x = -Math.PI / 2;
        coverBezel.position.set(HALF / 2, T + 0.005 * CM, 0);
        // the inside face: the inner screen's left half
        const innerLeft = new THREE.Mesh(new THREE.PlaneGeometry(HALF - 0.25 * CM, INNER.h), glass);
        innerLeft.rotation.x = Math.PI / 2;
        innerLeft.position.set(HALF / 2, -0.01 * CM, 0);
        this.front.add(coverBezel, this.coverScreen, punch, innerLeft);
        g.add(this.front);

        // the inner screen as one piece (shown open), with its own little selfie camera on the right half
        this.innerScreen = new THREE.Mesh(new THREE.PlaneGeometry(INNER.w, INNER.h), new THREE.MeshBasicMaterial({ map: canvasTexture(450, 500, (ctx, w, h) => drawInner(ctx, w, h)), toneMapped: false }));
        this.innerScreen.rotation.x = -Math.PI / 2;
        this.innerScreen.position.set(-HALF / 2, T + 0.02 * CM, 0);
        this.innerScreen.visible = false;
        g.add(this.innerScreen);

        // side keys: volume rocker and the fingerprint power key on the right edge
        const key = (len: number, z: number) => {
            const k = new THREE.Mesh(new RoundedBoxGeometry(0.15 * CM, 0.25 * CM, len, 1, 0.06 * CM), frame);
            k.position.set(HALF + 0.05 * CM, T / 2, z); // front-local: its origin is the hinge
            this.front.add(k);
        };
        key(2.6 * CM, -3.0 * CM);
        key(1.5 * CM, 0.2 * CM);

        g.position.y = 0.02 * CM;
        spot.add(g);
        this.group = g;
        shadows(g, true, false);
        inspectable(g);
        g.userData.inspectView = () => {
            this.wake();
            return this.view();
        };
        menu(g, () => [
            { label: this.unfolded ? 'Fold it shut' : 'Unfold it', run: () => this.setUnfolded(!this.unfolded) },
            { label: 'Pick it up', run: () => this.application.world.deskStash.inspect(g) },
            { label: 'Open on this device', run: () => window.open(`phone/index.html?mode=${this.unfolded ? 'inner' : 'cover'}`, '_blank') },
            { label: 'Check notifications', say: ['3 missed calls from Ibby.', '"bro where u at" — Zayne', 'Your ESP32 Marauder finished a scan.', 'Low battery. Again.'] },
        ]);
        g.userData.menuTitle = 'Galaxy Z Fold 8';
    }

    /** One page in the browser layer, resized and moved between the cover and the inner screen */
    buildScreen() {
        this.frame = document.createElement('div');
        this.frame.style.cssText = 'background:#000;overflow:hidden;';
        this.iframe = document.createElement('iframe');
        this.iframe.title = 'CAK3D UI';
        this.iframe.allow = 'autoplay; fullscreen; clipboard-write';
        this.iframe.style.cssText = 'width:100%;height:100%;border:0;';
        this.frame.appendChild(this.iframe);
        this.css = new CSS3DObject(this.frame);
        this.application.cssScene.add(this.css);
        this.hole = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0, transparent: true, blending: THREE.NoBlending, side: THREE.DoubleSide })
        );
        this.setAwake(false);
    }

    /** Line the page and its cutout up with whichever screen is showing */
    placeScreen() {
        const screen = this.unfolded ? this.innerScreen : this.coverScreen;
        const size = this.unfolded ? INNER : COVER;
        const px = this.unfolded ? INNER_PX : COVER_PX;
        this.frame.style.width = `${px.w}px`;
        this.frame.style.height = `${px.h}px`;
        this.group.updateMatrixWorld(true);
        screen.matrixWorld.decompose(this.css.position, this.css.quaternion, new THREE.Vector3());
        this.css.scale.setScalar(size.w / px.w);
        screen.parent!.add(this.hole);
        this.hole.position.copy(screen.position);
        this.hole.rotation.copy(screen.rotation);
        this.hole.scale.set(size.w, size.h, 1);
        this.hole.position.y += 0.01 * CM;
    }

    /** Looking at it right side up: from just past its bottom edge, high above it */
    view() {
        const screen = this.unfolded ? this.innerScreen : this.coverScreen;
        const size = this.unfolded ? INNER : COVER;
        this.group.updateMatrixWorld(true);
        const center = new THREE.Vector3().setFromMatrixPosition(screen.matrixWorld);
        const q = this.group.getWorldQuaternion(new THREE.Quaternion());
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
        const top = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
        const aspect = this.application.sizes.width / this.application.sizes.height;
        const fit = 2 * Math.tan(THREE.MathUtils.degToRad(this.application.camera.instance.fov / 2));
        const d = Math.max((size.h * 1.3) / fit, (size.w * 1.25) / (fit * aspect));
        // a touch back from straight overhead, so "up" on screen is the phone's top
        const position = center.clone().addScaledVector(up, d * 0.985).addScaledVector(top, -d * 0.17);
        return { position, focalPoint: center };
    }

    wake() {
        if (!this.iframe.src) this.iframe.src = `phone/index.html?mode=${this.unfolded ? 'inner' : 'cover'}`;
        this.setAwake(true);
    }

    setUnfolded(open: boolean) {
        if (open === this.unfolded) return;
        this.unfolded = open;
        this.send({ type: 'cak3d-phone', action: open ? 'unfold' : 'fold' });
        // the page hides while the hinge swings (update brings it back), and the camera re-frames the new screen
        this.setAwake(false);
        const stash = this.application.world.deskStash;
        if (stash) stash.inspect(this.group);
    }

    private setAwake(on: boolean) {
        this.awake = on;
        // only once the hinge has settled on the screen we're showing
        const show = on && this.fold === (this.unfolded ? 1 : 0);
        if (show) this.placeScreen();
        this.css.visible = show;
        this.frame.style.display = show ? 'block' : 'none';
        this.hole.visible = show;
        this.coverScreen.visible = !show && !this.unfolded;
    }

    send(message: object) {
        if (this.iframe.contentWindow && this.iframe.src) this.iframe.contentWindow.postMessage(message, '*');
    }

    update() {
        const dt = Math.min(this.application.time.delta, 50) / 1000;
        const target = this.unfolded ? 1 : 0;
        if (this.fold !== target) {
            this.fold += Math.sign(target - this.fold) * Math.min(Math.abs(target - this.fold), dt * 1.4);
            const k = this.fold < 0.5 ? 2 * this.fold * this.fold : 1 - Math.pow(-2 * this.fold + 2, 2) / 2;
            this.front.rotation.z = k * Math.PI;
            this.innerScreen.visible = this.fold === 1;
            this.coverScreen.visible = this.fold === 0 && !this.css.visible;
        }
        // in use only while the camera is on it; it sleeps when you walk away
        const camera = this.application.camera;
        const flying = camera.targetKeyframe === CameraKey.INSPECT && this.isInspected();
        if (this.awake && !this.usingIt() && !flying) this.setAwake(false);
        // woken (or the hinge just settled): put the page up on the right screen
        else if (this.awake && !this.css.visible && this.fold === target) this.setAwake(true);
        this.frame.style.pointerEvents = this.usingIt() ? 'auto' : 'none';
    }

    isInspected() {
        const stash = this.application.world.deskStash;
        return !!stash && stash.inspecting === this.group;
    }

    usingIt() {
        return this.application.camera.currentKeyframe === CameraKey.INSPECT && this.isInspected();
    }
}

function drawLock(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#24104a');
    g.addColorStop(0.6, '#3b1f6b');
    g.addColorStop(1, '#0f3a24');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const now = new Date();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '300 56px Arial, sans-serif';
    ctx.fillText(`${now.getHours() % 12 || 12}`, w / 2, 120);
    ctx.fillText(String(now.getMinutes()).padStart(2, '0'), w / 2, 178);
    ctx.font = '15px Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), w / 2, 206);
    ctx.fillText('CAK3D UI', w / 2, h - 30);
}

function drawInner(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#05080a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(91,255,138,0.55)';
    ctx.font = '13px "Courier New", monospace';
    const lines = ['> cak3d@fold:~$ ./boot --tools', '[ok] esp32 bridge', '[ok] xiao s3 link', '[..] marauder idle', '> _'];
    lines.forEach((t, i) => ctx.fillText(t, 24, 40 + i * 22));
}
