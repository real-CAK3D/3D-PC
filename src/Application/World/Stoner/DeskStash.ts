import * as THREE from 'three';
import Application from '../../Application';
import { CameraKey } from '../../Camera/Camera';
import { keys } from '../../Camera/CameraKeyframes';
import BezierEasing from 'bezier-easing';
import { canvasTexture, CM, DESK_Y, shadows } from './props';
import { apps, sites, doubleWide, homeInventory, StashItem } from './stash';
import { gadget } from './gadgets';
import { doubleWideTexture } from './newspaper';

// Drawer fronts in the baked desk mesh (world units, measured from the model)
const DRAWER_X = [-3115, -1585];
const DRAWER_FRONT_Z = 1355;
const DRAWER_DEPTH = 1750;
const DRAWER_OPEN = 1650;
const DRAWERS = [
    { key: 'apps', y: [-1080, -610] as [number, number], items: apps },
    { key: 'sites', y: [-1630, -1150] as [number, number], items: sites },
];
const PER_ROW = 5; // floppies per row; gadgets get their own row up front

// The floppy drive bay on the front of the computer
const FLOPPY_SLOT = new THREE.Vector3(500, -225, 712);

const ZOOM_EASE = BezierEasing(0.13, 0.99, 0, 1);

type Slot = {
    item: StashItem;
    mesh: THREE.Object3D;
    rest: THREE.Vector3; // local to the drawer group
    restQuat: THREE.Quaternion;
    lift: number; // hover lift, eased
};

type Drawer = {
    key: string;
    group: THREE.Group;
    front: THREE.Mesh;
    open: boolean;
    t: number; // 0 closed .. 1 open
    slots: Slot[];
    lookFrom: THREE.Vector3;
    lookAt: THREE.Vector3;
};

type Insert = {
    slot: Slot;
    from: THREE.Vector3;
    fromQuat: THREE.Quaternion;
    t: number;
    floppy: boolean;
};

/**
 * Everything you can click on and around the desk:
 * - the drawers slide out and the camera looks inside; floppies picked from
 *   them fly into the PC's drive and load on the screen (gadgets just plug in)
 * - The Double Wide, the paper stacks and the binders load their sites on the PC
 * - anything else in the scene with `userData.onClick` (lava lamp, lights...)
 */
export default class DeskStash {
    application: Application;
    scene: THREE.Scene;
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    drawers: Drawer[] = [];
    clickables: THREE.Object3D[] = [];
    hovered: THREE.Object3D | null = null;
    leaveTimer: number | undefined;
    inserting: Insert | null = null;
    inspecting: THREE.Object3D | null = null;
    beforeInspect: CameraKey = CameraKey.DESK;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        const desk = this.scene.getObjectByName('desk') as THREE.Mesh | undefined;
        if (desk) DRAWERS.forEach((d) => this.drawers.push(this.buildDrawer(desk, d)));
        this.buildNewspaper();
        this.setDeskLinks();

        // props elsewhere in the room that registered a click handler or want a close look
        this.scene.traverse((obj) => {
            if ((obj.userData.onClick || obj.userData.inspect) && this.clickables.indexOf(obj) < 0) this.clickables.push(obj);
        });

        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    }

    /* ------------------------------------------------------------ drawers */

    buildDrawer(desk: THREE.Mesh, def: typeof DRAWERS[number]): Drawer {
        const group = new THREE.Group();
        this.scene.add(group);

        // Cut the drawer front out of the baked desk so it keeps its baked look
        const inFront = (v: THREE.Vector3) =>
            v.x >= DRAWER_X[0] &&
            v.x <= DRAWER_X[1] &&
            v.z >= DRAWER_FRONT_Z &&
            v.y >= def.y[0] &&
            v.y <= def.y[1];
        const front = new THREE.Mesh(extractFaces(desk, inFront), desk.material);
        front.userData.drawer = def.key;
        front.userData.zoom = CameraKey.DRAWERS;
        group.add(front);
        this.clickables.push(front);

        const width = DRAWER_X[1] - DRAWER_X[0] - 40;
        const height = def.y[1] - def.y[0] - 60;
        const cx = (DRAWER_X[0] + DRAWER_X[1]) / 2;
        const cy = (def.y[0] + def.y[1]) / 2;
        const backZ = DRAWER_FRONT_Z - DRAWER_DEPTH;

        // Dark cavity behind the drawer so the desk doesn't look hollow when it slides out
        const cavity = new THREE.Mesh(
            new THREE.BoxGeometry(width + 30, height + 40, DRAWER_DEPTH),
            new THREE.MeshStandardMaterial({ color: '#141216', roughness: 1, side: THREE.BackSide })
        );
        cavity.position.set(cx, cy, DRAWER_FRONT_Z - DRAWER_DEPTH / 2 - 2);
        this.scene.add(cavity);

        // Drawer box: bottom + sides + back, with a felt liner
        const steel = new THREE.MeshStandardMaterial({ color: '#6d6f74', roughness: 0.6, metalness: 0.3 });
        const felt = new THREE.MeshStandardMaterial({ color: '#2a1840', roughness: 1 });
        const t = 25;
        const box = new THREE.Group();
        const part = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material = steel) => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
            mesh.position.set(x, y, z);
            box.add(mesh);
        };
        const bottomY = cy - height / 2;
        const midZ = (DRAWER_FRONT_Z + backZ) / 2;
        part(width, t, DRAWER_DEPTH, cx, bottomY, midZ);
        part(width - 2 * t, 6, DRAWER_DEPTH - 2 * t, cx, bottomY + t / 2 + 3, midZ, felt);
        part(t, height * 0.8, DRAWER_DEPTH, cx - width / 2, bottomY + height * 0.4, midZ);
        part(t, height * 0.8, DRAWER_DEPTH, cx + width / 2, bottomY + height * 0.4, midZ);
        part(width, height * 0.8, t, cx, bottomY + height * 0.4, backZ);
        group.add(shadows(box, false, true));

        // Contents ride along with the drawer: gadgets in a row up front, floppies
        // piled in rows behind them (overlapping a little, like a real drawer)
        const gadgets = def.items.filter((item) => item.model);
        const disks = def.items.filter((item) => !item.model);
        const frontZ = DRAWER_FRONT_Z - 180;
        const gadgetRow = gadgets.length ? 560 : 0;
        const slots: Slot[] = [...gadgets, ...disks].map((item) => {
            const mesh: THREE.Object3D = item.model ? shadows(gadget(item.model, item), true, false) : floppy(item);
            mesh.userData.item = item;
            mesh.userData.slot = true;
            group.add(mesh);
            this.clickables.push(mesh);

            const rest = new THREE.Vector3();
            const g = gadgets.indexOf(item);
            const d = disks.indexOf(item);
            if (g >= 0) {
                rest.set(cx + (g - (gadgets.length - 1) / 2) * (width / gadgets.length), bottomY + 60, frontZ - gadgetRow / 2);
            } else {
                const col = d % PER_ROW;
                const row = Math.floor(d / PER_ROW);
                rest.set(cx + (col - (PER_ROW - 1) / 2) * 270, bottomY + 60 + (col % 2) * 14, frontZ - gadgetRow - 170 - row * 330);
            }
            // lying flat, label toward the front of the drawer, a little messy
            const k = g >= 0 ? g : d + 3;
            const restQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, ((k * 37) % 9) * 0.03 - 0.12));
            mesh.position.copy(rest);
            mesh.quaternion.copy(restQuat);
            return { item, mesh, rest, restQuat, lift: 0 };
        });

        // Camera spot for looking down into this drawer once it's out
        const inside = new THREE.Vector3(cx, bottomY, DRAWER_FRONT_Z + DRAWER_OPEN - DRAWER_DEPTH * 0.45);
        const lookFrom = new THREE.Vector3(cx, bottomY + 3400, inside.z + 1450);

        return { key: def.key, group, front, open: false, t: 0, slots, lookFrom, lookAt: inside };
    }

    openDrawer(drawer: Drawer) {
        for (const d of this.drawers) d.open = d === drawer;
        // aim the 'drawerInside' keyframe at this drawer, then fly there
        keys.drawerInside.position.copy(drawer.lookFrom);
        keys.drawerInside.focalPoint.copy(drawer.lookAt);
        this.application.camera.transition(CameraKey.DRAWER_INSIDE, 1400, ZOOM_EASE);
    }

    closeDrawers() {
        for (const d of this.drawers) d.open = false;
    }

    /* ------------------------------------------------- loading on the PC */

    /** Fly a floppy from its drawer into the drive (gadgets get carried over and plugged in) */
    insert(slot: Slot) {
        if (this.inserting) return;
        const from = new THREE.Vector3();
        const fromQuat = new THREE.Quaternion();
        slot.mesh.getWorldPosition(from);
        slot.mesh.getWorldQuaternion(fromQuat);
        this.scene.attach(slot.mesh);
        this.inserting = { slot, from, fromQuat, t: 0, floppy: !slot.item.model };
        this.application.camera.transition(CameraKey.DESK, 1200);
    }

    updateInsert(dt: number) {
        const ins = this.inserting;
        if (!ins) return;
        ins.t = Math.min(1, ins.t + dt / 2.2);
        const mesh = ins.slot.mesh;

        // flat, label up, pointing into the drive
        const flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        const mouth = FLOPPY_SLOT.clone().add(new THREE.Vector3(0, 0, 420));
        if (ins.t < 0.7) {
            // arc up out of the drawer and over to the front of the drive
            const k = easeInOut(ins.t / 0.7);
            mesh.position.copy(ins.from).lerp(mouth, k);
            mesh.position.y += Math.sin(k * Math.PI) * 900;
            mesh.quaternion.copy(ins.fromQuat).slerp(flat, k);
        } else {
            // slide in (floppies), or shrink into the case (gadgets)
            const k = easeInOut((ins.t - 0.7) / 0.3);
            mesh.quaternion.copy(flat);
            if (ins.floppy) {
                mesh.position.copy(mouth).lerp(FLOPPY_SLOT.clone().add(new THREE.Vector3(0, 0, -260)), k);
            } else {
                mesh.position.copy(mouth).lerp(FLOPPY_SLOT, k);
                mesh.scale.setScalar(1 - k);
            }
        }

        if (ins.t >= 1) {
            this.inserting = null;
            this.loadOnPc(ins.slot.item, ins.floppy ? 'floppy' : 'gadget');
            // put it back in its drawer for next time
            const drawer = this.drawers.find((d) => d.slots.indexOf(ins.slot) >= 0);
            if (drawer) drawer.group.attach(mesh);
            mesh.position.copy(ins.slot.rest);
            mesh.quaternion.copy(ins.slot.restQuat);
            mesh.scale.setScalar(1);
            this.closeDrawers();
        }
    }

    /** Zoom into the monitor and tell CAK3D OS (the iframe) what to open */
    loadOnPc(item: StashItem, via: 'floppy' | 'gadget' | 'desk') {
        const camera = this.application.camera;
        camera.trigger('enterMonitor');
        const iframe = document.getElementById('computer-screen') as HTMLIFrameElement | null;
        if (iframe && iframe.contentWindow) {
            const { name, description, language, url, repo, model } = item;
            iframe.contentWindow.postMessage(
                { type: 'cak3d-load', via, item: { name, description, language, url, repo, model } },
                '*'
            );
        }
    }

    /* ---------------------------------------------------- desk extras */

    buildNewspaper() {
        const paper = this.scene.getObjectByName('paper');
        if (paper) paper.visible = false;

        const edge = new THREE.MeshStandardMaterial({ color: '#e6dfca', roughness: 1 });
        const sheet = new THREE.Mesh(new THREE.BoxGeometry(990, 14, 1045), [
            edge,
            edge,
            new THREE.MeshStandardMaterial({ map: doubleWideTexture(), roughness: 0.95 }),
            edge,
            edge,
            edge,
        ]);
        sheet.position.set(-2063, DESK_Y + 9, 990);
        sheet.rotation.y = 0.12;
        sheet.userData.item = doubleWide;
        sheet.userData.zoom = CameraKey.PAPER;
        shadows(sheet, true, true);
        this.scene.add(sheet);
        this.clickables.push(sheet);
    }

    /** Baked desk props that open sites: the binders -> HomeInventory (the NewsStand is through the door) */
    setDeskLinks() {
        const links: [string, StashItem][] = [
            ['binder_1', homeInventory],
            ['binder_2', homeInventory],
        ];
        for (const [name, item] of links) {
            const obj = this.scene.getObjectByName(name);
            if (!obj) continue;
            obj.userData.item = item;
            this.clickables.push(obj);
        }
    }

    /* ------------------------------------------------------- interaction */

    interactive() {
        const camera = this.application.camera;
        const views = [
            CameraKey.DESK,
            CameraKey.PAPER,
            CameraKey.DRAWERS,
            CameraKey.DRAWER_INSIDE,
            CameraKey.TV,
            CameraKey.TV_SCREEN,
            CameraKey.STEREO,
            CameraKey.INSPECT,
        ];
        return (
            camera.freeCam ||
            views.indexOf(camera.currentKeyframe as CameraKey) >= 0 ||
            views.indexOf(camera.targetKeyframe as CameraKey) >= 0
        );
    }

    pick(event: MouseEvent): THREE.Object3D | null {
        const sizes = this.application.sizes;
        this.pointer.set((event.clientX / sizes.width) * 2 - 1, -(event.clientY / sizes.height) * 2 + 1);
        this.raycaster.setFromCamera(this.pointer, this.application.camera.instance);
        const hit = this.raycaster.intersectObjects(this.clickables, true)[0];
        if (!hit) return null;
        // climb from the mesh that was hit to the clickable it belongs to
        let target: THREE.Object3D | null = hit.object;
        while (target && this.clickables.indexOf(target) < 0) target = target.parent;
        if (!target) return null;
        // something baked (the desk top, the monitor...) in front of it blocks the click
        const blockers = this.raycaster.intersectObjects(
            ['desk', 'computer', 'monitor_base', 'keyboard', 'chair_seat']
                .map((n) => this.scene.getObjectByName(n))
                .filter((o): o is THREE.Object3D => !!o && o !== target),
            false
        );
        if (blockers[0] && blockers[0].distance < hit.distance - 5) return null;
        return target;
    }

    /** Returns true when the click was used, so the camera should stay put */
    handleMouseDown(event: MouseEvent) {
        // @ts-ignore
        if (event.inComputer || this.inserting) return !!this.inserting;
        const camera = this.application.camera;
        const view = camera.currentKeyframe || camera.targetKeyframe;
        const hit = this.pick(event);

        // first click on anything we added: go have a look at it
        if (hit && hit.userData.inspect && !camera.freeCam) {
            const target = hit.userData.inspectGroup || hit;
            if (this.inspecting !== target || view !== CameraKey.INSPECT) {
                this.inspect(target);
                return true;
            }
        }
        // clicking off it steps back to wherever we were
        if (!hit && view === CameraKey.INSPECT) {
            this.inspecting = null;
            camera.transition(this.beforeInspect, 1400, ZOOM_EASE);
            return true;
        }

        // wall switches, the fan, the door, the dog bowls... work from any view
        if (hit && hit.userData.anywhere && hit.userData.onClick) {
            hit.userData.onClick();
            return true;
        }

        // things with their own camera spot (the TV corner) fly there first, from anywhere
        const focusViews: CameraKey[] = hit ? hit.userData.focusViews || [hit.userData.focus] : [];
        if (hit && hit.userData.focus && focusViews.indexOf(view as CameraKey) < 0 && !camera.freeCam) {
            camera.transition(hit.userData.focus, 2000, ZOOM_EASE);
            return true;
        }
        const obj = this.interactive() ? hit : null;

        if (!obj) {
            // clicking off an open drawer puts everything away
            if (camera.currentKeyframe === CameraKey.DRAWER_INSIDE) {
                this.closeDrawers();
                camera.transition(CameraKey.DESK);
                return true;
            }
            return false;
        }

        if (obj.userData.onClick) {
            obj.userData.onClick();
        } else if (obj.userData.drawer) {
            const drawer = this.drawers.find((d) => d.key === obj.userData.drawer) as Drawer;
            if (drawer.open) {
                this.closeDrawers();
                camera.transition(CameraKey.DESK);
            } else {
                this.openDrawer(drawer);
            }
        } else if (obj.userData.slot) {
            const slot = this.findSlot(obj);
            const drawer = this.drawers.find((d) => d.slots.indexOf(slot as Slot) >= 0);
            // you can only grab things out of an open drawer
            if (slot && drawer && drawer.open) this.insert(slot);
            else if (drawer) this.openDrawer(drawer);
        } else if (obj.userData.item) {
            this.loadOnPc(obj.userData.item, 'desk');
        }
        return true;
    }

    /** Fly the camera to a spot in front of `obj`, sized so it fills the view */
    inspect(obj: THREE.Object3D) {
        const camera = this.application.camera;
        const view = camera.currentKeyframe || camera.targetKeyframe;
        if (view !== CameraKey.INSPECT && view) this.beforeInspect = view as CameraKey;
        this.inspecting = obj;
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        let dir: THREE.Vector3 = obj.userData.inspectDir;
        if (!dir) {
            // look at it from the middle of the room
            dir = new THREE.Vector3(-4400 - center.x, 0, 4700 - center.z);
            if (dir.lengthSq() < 1) dir.set(0, 0, 1);
            dir.normalize();
            dir.y = 0.25;
            dir.normalize();
        }
        const distance = Math.max(size.x, size.y, size.z) * 2.2 + 700;
        keys.inspect.focalPoint.copy(center);
        keys.inspect.position.copy(center).addScaledVector(dir, distance);
        camera.transition(CameraKey.INSPECT, 1500, ZOOM_EASE);
    }

    findSlot(obj: THREE.Object3D): Slot | undefined {
        for (const d of this.drawers) for (const s of d.slots) if (s.mesh === obj) return s;
        return undefined;
    }

    /** Hovering the paper or the drawers zooms the camera in, like the monitor does */
    updateZoom(obj: THREE.Object3D | null) {
        const camera = this.application.camera;
        if (camera.freeCam || this.inserting) return;
        const view = camera.currentKeyframe || camera.targetKeyframe;
        if (view === CameraKey.DRAWER_INSIDE || view === CameraKey.MONITOR) return;
        const zoom: CameraKey | undefined = obj ? obj.userData.zoom : undefined;

        if (zoom) {
            window.clearTimeout(this.leaveTimer);
            this.leaveTimer = undefined;
            if (view !== zoom) camera.transition(zoom, 1600, ZOOM_EASE);
            return;
        }
        const zoomed = view === CameraKey.PAPER || view === CameraKey.DRAWERS;
        if (zoomed && this.leaveTimer === undefined) {
            this.leaveTimer = window.setTimeout(() => {
                this.leaveTimer = undefined;
                const now = camera.currentKeyframe || camera.targetKeyframe;
                if (now === CameraKey.PAPER || now === CameraKey.DRAWERS) camera.transition(CameraKey.DESK);
            }, 500);
        }
    }

    onMouseMove(event: MouseEvent) {
        // @ts-ignore
        const picked = event.inComputer ? null : this.pick(event);
        const obj = picked && (this.interactive() || picked.userData.focus || picked.userData.anywhere) ? picked : null;
        this.hovered = obj;
        document.body.style.cursor = obj ? 'pointer' : '';
        // @ts-ignore
        if (!event.inComputer && this.interactive()) this.updateZoom(obj);
    }

    update() {
        const dt = Math.min(this.application.time.delta, 50) / 1000;
        for (const d of this.drawers) {
            d.t = d.open ? Math.min(1, d.t + dt * 1.6) : Math.max(0, d.t - dt * 1.6);
            d.group.position.z = easeInOut(d.t) * DRAWER_OPEN;
            for (const s of d.slots) {
                if (this.inserting && this.inserting.slot === s) continue;
                // hovered items lift up a little so you can tell what you're grabbing
                const target = this.hovered === s.mesh && d.open ? 1 : 0;
                s.lift += (target - s.lift) * 0.2;
                s.mesh.position.copy(s.rest);
                s.mesh.position.y += s.lift * 90;
                s.mesh.quaternion.copy(s.restQuat);
            }
        }
        this.updateInsert(dt);
    }
}

/* --------------------------------------------------------------- helpers */

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Moves the triangles of `mesh` whose vertices all pass `test` (in world
 * space) into a new world-space geometry, and deletes them from `mesh`.
 */
function extractFaces(mesh: THREE.Mesh, test: (v: THREE.Vector3) => boolean) {
    mesh.updateMatrixWorld(true);
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    const index = geo.index ? Array.from(geo.index.array) : Array.from({ length: pos.count }, (_, i) => i);
    const v = new THREE.Vector3();
    const vertexPasses: boolean[] = [];
    for (let i = 0; i < pos.count; i++) vertexPasses[i] = test(v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld));

    const keep: number[] = [];
    const take: number[] = [];
    for (let f = 0; f < index.length; f += 3) {
        const tri = [index[f], index[f + 1], index[f + 2]];
        if (tri.every((i) => vertexPasses[i])) take.push(...tri);
        else keep.push(...tri);
    }
    geo.setIndex(keep);

    const out = new THREE.BufferGeometry();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const n = new THREE.Vector3();
    for (const i of take) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        positions.push(v.x, v.y, v.z);
        if (geo.attributes.normal) {
            n.fromBufferAttribute(geo.attributes.normal as THREE.BufferAttribute, i).applyMatrix3(normalMatrix).normalize();
            normals.push(n.x, n.y, n.z);
        }
        if (geo.attributes.uv) uvs.push(geo.attributes.uv.getX(i), geo.attributes.uv.getY(i));
    }
    out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (normals.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    if (uvs.length) out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    return out;
}

/** 3.5" floppy disk with a labeled sticker; face is +z */
function floppy(item: StashItem) {
    const color = item.color || '#7a3fd1';
    const tex = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#1d1d22';
        ctx.fillRect(0, 0, w, h);
        // metal shutter
        ctx.fillStyle = '#b9bcc4';
        ctx.fillRect(w * 0.26, 0, w * 0.5, h * 0.33);
        ctx.fillStyle = '#7d8088';
        ctx.fillRect(w * 0.55, h * 0.05, w * 0.12, h * 0.22);
        // label
        ctx.fillStyle = '#f4f1e6';
        ctx.fillRect(w * 0.1, h * 0.42, w * 0.8, h * 0.52);
        ctx.fillStyle = color;
        ctx.fillRect(w * 0.1, h * 0.42, w * 0.8, h * 0.08);
        ctx.fillStyle = '#1b1b1b';
        ctx.textAlign = 'center';
        fitText(ctx, item.name, w / 2, h * 0.68, w * 0.74, 34, 'bold');
        ctx.font = '18px "Courier New", monospace';
        ctx.fillStyle = '#555';
        ctx.fillText(item.url && !item.language ? 'website' : item.language || 'app', w / 2, h * 0.84);
    });
    const body = new THREE.MeshStandardMaterial({ color: '#1d1d22', roughness: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(9 * CM, 9 * CM, 0.35 * CM), [
        body,
        body,
        body,
        body,
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }),
        body,
    ]);
    return shadows(mesh, true, false);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, size: number, weight = '') {
    let s = size;
    do {
        ctx.font = `${weight} ${s}px Arial, sans-serif`;
        s -= 1;
    } while (ctx.measureText(text).width > max && s > 10);
    ctx.fillText(text, x, y);
}
