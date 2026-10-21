import * as THREE from 'three';
import Application from '../../Application';
import { canvasTexture, CM, FLOOR_Y, inspectable, leafPath, mat, range, shadows, woodTexture } from './props';
import { ROOM, WINDOW } from './Room';
import { newsStand, StashItem } from './stash';
import { CameraKey } from '../../Camera/Camera';
import { keys } from '../../Camera/CameraKeyframes';

export const myPetId: StashItem = {
    name: 'MyPetID',
    description: 'MyPetID: a home for your pet’s ID, info and contacts.',
    url: 'https://mypetid-home.github.io/',
    repo: 'https://github.com/MyPetID-Home/MyPetID-Home.github.io',
};

const DOOR = { x: 1200, width: 3000, height: 7000 };
const SWITCH = { x: DOOR.x - DOOR.width / 2 - 600, y: FLOOR_Y + 4000 };
const FAN = { x: (ROOM.left + ROOM.right) / 2, z: (ROOM.back + ROOM.front) / 2 };

/**
 * The rest of the room: front wall with a door, a window, posters, a ceiling
 * fan with a light (and the wall switch that runs them), and the dog's bowls.
 * Anything marked `anywhere` can be clicked from any camera view.
 */
export default class RoomExtras {
    application: Application;
    scene: THREE.Scene;
    fanBlades: THREE.Group;
    fanSpeed = 1; // 0 off, 1-3
    fanSpin = 0;
    fanLight: THREE.PointLight;
    fanBulb: THREE.MeshStandardMaterial;
    lightOn = false;
    door: THREE.Group;
    doorOpen = false;
    doorAngle = 0;
    toggle: THREE.Mesh;
    dial: THREE.Mesh;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        this.setFrontWall();
        this.setDoor();
        this.setWindow();
        this.setPosters();
        this.setFan();
        this.setSwitch();
        this.setDogBowls();
        this.setLight(false);
    }

    clickable(obj: THREE.Object3D, onClick: () => void, inspectDir?: THREE.Vector3 | null, group?: THREE.Object3D) {
        obj.userData.onClick = onClick;
        obj.userData.anywhere = true;
        if (inspectDir !== null) inspectable(obj, inspectDir, group);
    }

    /** Through the open door and down the hall: opens The Corner Chronicle (NewsStand) */
    walkToNewsStand() {
        if (!this.doorOpen) return;
        // open it right away, while the click still counts as a user action (popup blockers)
        window.open(newsStand.url, '_blank', 'noopener');
        const camera = this.application.camera;
        keys.inspect.position.set(DOOR.x, FLOOR_Y + 3600, ROOM.front - 2600);
        keys.inspect.focalPoint.set(DOOR.x, FLOOR_Y + 3200, ROOM.front + 3000);
        camera.transition(CameraKey.INSPECT, 1800);
    }

    /** Single-sided like the others, so the orbiting camera sees in from outside */
    setFrontWall() {
        const width = ROOM.right - ROOM.left;
        const height = ROOM.ceiling - FLOOR_Y;
        const wallMat = new THREE.MeshStandardMaterial({ color: '#2c2338', roughness: 0.95 });
        // three pieces around the door opening
        const left = DOOR.x - DOOR.width / 2 - ROOM.left;
        const right = ROOM.right - (DOOR.x + DOOR.width / 2);
        const piece = (w: number, h: number, x: number, y: number) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
            m.rotation.y = Math.PI;
            m.position.set(x, y, ROOM.front);
            m.receiveShadow = true;
            this.scene.add(m);
        };
        piece(left, height, ROOM.left + left / 2, FLOOR_Y + height / 2);
        piece(right, height, ROOM.right - right / 2, FLOOR_Y + height / 2);
        piece(DOOR.width, height - DOOR.height, DOOR.x, FLOOR_Y + DOOR.height + (height - DOOR.height) / 2);

        // LED strip + glow on this wall too, matching the others
        const room = this.application.world.room;
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(width, 70), room ? room.ledStrip : new THREE.MeshBasicMaterial({ color: '#e2b8ff' }));
        strip.rotation.y = Math.PI;
        strip.position.set(ROOM.left + width / 2, ROOM.ceiling - 80, ROOM.front - 50);
        this.scene.add(strip);
    }

    setDoor() {
        const wood = new THREE.MeshStandardMaterial({ map: woodTexture('#4a2f1c'), roughness: 0.6 });
        const trim = mat.std('#1e1826', 0.6);
        // frame
        const frame = new THREE.Group();
        frame.position.set(DOOR.x, FLOOR_Y, ROOM.front);
        const side = (x: number) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(160, DOOR.height + 160, 260), trim);
            m.position.set(x, DOOR.height / 2 + 80, 0);
            frame.add(m);
        };
        side(-DOOR.width / 2 - 80);
        side(DOOR.width / 2 + 80);
        const top = new THREE.Mesh(new THREE.BoxGeometry(DOOR.width + 320, 160, 260), trim);
        top.position.y = DOOR.height + 80;
        frame.add(top);
        // dark hallway behind the door
        // past the door: a dark hallway with the Corner Chronicle's newsstand lit up at the end
        const hallTex = canvasTexture(300, 700, (ctx, w, h) => {
            ctx.fillStyle = '#0a0710';
            ctx.fillRect(0, 0, w, h);
            // hallway walls converging
            ctx.fillStyle = '#15101f';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(w * 0.32, h * 0.3);
            ctx.lineTo(w * 0.32, h * 0.72);
            ctx.lineTo(0, h);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w, 0);
            ctx.lineTo(w * 0.68, h * 0.3);
            ctx.lineTo(w * 0.68, h * 0.72);
            ctx.lineTo(w, h);
            ctx.fill();
            // the kiosk at the end: green awning, warm window
            ctx.fillStyle = '#ffd9a0';
            ctx.fillRect(w * 0.36, h * 0.46, w * 0.28, h * 0.22);
            for (let i = 0; i < 6; i++) {
                ctx.fillStyle = i % 2 ? '#f5eedb' : '#1f5a2a';
                ctx.fillRect(w * 0.34 + (i * w * 0.32) / 6, h * 0.4, (w * 0.32) / 6 + 1, h * 0.06);
            }
            ctx.fillStyle = '#1b1510';
            ctx.fillRect(w * 0.36, h * 0.34, w * 0.28, h * 0.06);
            ctx.fillStyle = '#f5eedb';
            ctx.textAlign = 'center';
            ctx.font = 'bold 13px Georgia, serif';
            ctx.fillText('THE CORNER', w / 2, h * 0.365);
            ctx.fillText('CHRONICLE', w / 2, h * 0.39);
            ctx.fillStyle = 'rgba(255, 217, 160, 0.25)';
            ctx.beginPath();
            ctx.moveTo(w * 0.36, h * 0.68);
            ctx.lineTo(w * 0.64, h * 0.68);
            ctx.lineTo(w * 0.9, h);
            ctx.lineTo(w * 0.1, h);
            ctx.fill();
        });
        const hall = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.width, DOOR.height), new THREE.MeshBasicMaterial({ map: hallTex }));
        // walk through the open door to the NewsStand
        hall.userData.anywhere = true;
        hall.userData.onClick = () => this.walkToNewsStand();
        hall.rotation.y = Math.PI;
        hall.position.set(0, DOOR.height / 2, 400);
        frame.add(hall);
        this.scene.add(frame);

        // the door swings on its left hinge
        this.door = new THREE.Group();
        this.door.position.set(DOOR.x + DOOR.width / 2, FLOOR_Y, ROOM.front - 40);
        const slab = new THREE.Mesh(new THREE.BoxGeometry(DOOR.width - 40, DOOR.height - 30, 120), wood);
        slab.position.set(-DOOR.width / 2, DOOR.height / 2, 0);
        this.door.add(slab);
        for (const [y, h] of [
            [DOOR.height * 0.7, DOOR.height * 0.35],
            [DOOR.height * 0.27, DOOR.height * 0.35],
        ]) {
            const panel = new THREE.Mesh(new THREE.BoxGeometry(DOOR.width * 0.7, h, 30), wood);
            panel.position.set(-DOOR.width / 2, y, -70);
            this.door.add(panel);
        }
        const knob = new THREE.Mesh(new THREE.SphereGeometry(90, 16, 12), mat.std('#c9a23a', 0.3, 0.9));
        knob.position.set(-DOOR.width + 280, DOOR.height * 0.48, -140);
        this.door.add(knob);
        // "keep out" sign
        const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(1400, 700),
            new THREE.MeshStandardMaterial({
                map: canvasTexture(400, 200, (ctx, w, h) => {
                    ctx.fillStyle = '#ffd23d';
                    ctx.fillRect(0, 0, w, h);
                    ctx.strokeStyle = '#111';
                    ctx.lineWidth = 10;
                    ctx.strokeRect(8, 8, w - 16, h - 16);
                    ctx.fillStyle = '#111';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 54px Impact, Arial, sans-serif';
                    ctx.fillText('KNOCK FIRST', w / 2, 92);
                    ctx.font = 'bold 26px Arial, sans-serif';
                    ctx.fillText('session in progress', w / 2, 146);
                }),
            })
        );
        sign.rotation.y = Math.PI;
        sign.position.set(-DOOR.width / 2, DOOR.height * 0.78, -90);
        this.door.add(sign);
        this.scene.add(shadows(this.door));
        // no close-up for the door: click it to swing it open, then click the doorway
        this.clickable(this.door, () => (this.doorOpen = !this.doorOpen), null);
    }

    setWindow() {
        const g = new THREE.Group();
        g.position.set(ROOM.left, WINDOW.y, WINDOW.z);
        g.rotation.y = Math.PI / 2;
        const W = WINDOW.width;
        const H = WINDOW.height;
        // a hint of glass; the outdoors (Outdoors.ts) is real 3D behind it
        const glass = new THREE.Mesh(
            new THREE.PlaneGeometry(W, H),
            new THREE.MeshStandardMaterial({ color: '#bcd0ff', transparent: true, opacity: 0.08, roughness: 0.05, depthWrite: false })
        );
        glass.position.z = 6;
        g.add(glass);
        const frameMat = mat.std('#e8e2d6', 0.5);
        const bar = (w: number, h: number, x: number, y: number) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 120), frameMat);
            m.position.set(x, y, 40);
            g.add(m);
        };
        bar(W + 200, 140, 0, H / 2 + 70);
        bar(W + 200, 200, 0, -H / 2 - 100);
        bar(140, H, -W / 2 - 70, 0);
        bar(140, H, W / 2 + 70, 0);
        bar(80, H, 0, 0);
        bar(W, 80, 0, 0);
        // purple curtains
        const curtain = mat.std('#4b1f7a', 1);
        for (const sx of [-1, 1]) {
            const c = new THREE.Mesh(new THREE.BoxGeometry(900, H + 900, 80), curtain);
            c.position.set(sx * (W / 2 + 350), -150, 140);
            g.add(c);
        }
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, W + 2400, 8), mat.std('#111', 0.4, 0.6));
        rod.rotation.z = Math.PI / 2;
        rod.position.set(0, H / 2 + 400, 180);
        g.add(rod);
        this.scene.add(inspectable(g, new THREE.Vector3(1, 0.1, 0)));
    }

    setPosters() {
        const poster = (tex: THREE.Texture, w: number, h: number, pos: THREE.Vector3, ry: number) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
            m.position.copy(pos);
            m.rotation.y = ry;
            // look at it straight on
            this.scene.add(inspectable(m, new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry))));
        };

        // magazine-cover pin-up frame: shows static/textures/posters/pinup.jpg if you add one,
        // otherwise a styled cover with venetian-blind light across it
        const cover = canvasTexture(500, 650, (ctx, w, h) => {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#2f5a55');
            g.addColorStop(1, '#0f2422');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            // warm window light through blinds
            ctx.save();
            ctx.translate(w * 0.2, 0);
            ctx.rotate(-0.25);
            for (let y = -100; y < h + 200; y += 34) {
                ctx.fillStyle = 'rgba(255, 214, 160, 0.35)';
                ctx.fillRect(-100, y, w * 1.6, 16);
            }
            ctx.restore();
            ctx.fillStyle = '#fbf3e6';
            ctx.textAlign = 'left';
            ctx.font = 'italic 28px Georgia, serif';
            ctx.fillText('Late night', 24, h - 90);
            ctx.fillText('sessions', 24, h - 56);
        });
        const pinupMat = new THREE.MeshStandardMaterial({ map: cover, roughness: 0.5 });
        new THREE.TextureLoader().load(
            'textures/posters/pinup.jpg',
            (tex) => {
                tex.encoding = THREE.sRGBEncoding;
                pinupMat.map = tex;
                pinupMat.needsUpdate = true;
            },
            undefined,
            () => {} // no custom poster yet: keep the cover
        );
        const pinup = new THREE.Mesh(new THREE.PlaneGeometry(2400, 3120), pinupMat);
        pinup.position.set(ROOM.right - 40, 2600, 9000);
        pinup.rotation.y = -Math.PI / 2;
        this.scene.add(inspectable(pinup, new THREE.Vector3(-1, 0, 0)));
        const frame = new THREE.Mesh(new THREE.BoxGeometry(60, 3240, 2520), mat.std('#c9a23a', 0.35, 0.8));
        frame.position.set(ROOM.right - 10, 2600, 9000);
        this.scene.add(frame);

        // good vibes, with a mushroom
        poster(
            canvasTexture(500, 700, (ctx, w, h) => {
                for (let i = 0; i < 14; i++) {
                    ctx.fillStyle = `hsl(${(i * 26 + 260) % 360}, 80%, ${30 + (i % 2) * 12}%)`;
                    ctx.beginPath();
                    ctx.arc(w / 2, h * 0.45, 600 - i * 42, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#f3e7d0';
                ctx.fillRect(w / 2 - 40, h * 0.42, 80, 160);
                ctx.fillStyle = '#d6342c';
                ctx.beginPath();
                ctx.ellipse(w / 2, h * 0.43, 170, 110, 0, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = '#fff';
                for (const [x, y, r] of [
                    [-90, -40, 22],
                    [10, -80, 26],
                    [90, -36, 20],
                    [-20, -30, 14],
                ]) {
                    ctx.beginPath();
                    ctx.arc(w / 2 + x, h * 0.43 + y, r, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.font = 'bold 74px Impact, "Arial Black", sans-serif';
                ctx.fillText('GOOD VIBES', w / 2, h - 110);
                ctx.fillText('ONLY', w / 2, h - 30);
            }),
            2300,
            3200,
            new THREE.Vector3(ROOM.left + 40, 2600, 1600),
            Math.PI / 2
        );

        // TV wall: a survival map and a festival flyer
        poster(
            canvasTexture(420, 600, (ctx, w, h) => {
                ctx.fillStyle = '#c9c1a5';
                ctx.fillRect(0, 0, w, h);
                // coastline and roads
                ctx.fillStyle = '#5a7a8a';
                ctx.beginPath();
                ctx.moveTo(0, h * 0.78);
                ctx.bezierCurveTo(w * 0.3, h * 0.7, w * 0.6, h * 0.86, w, h * 0.74);
                ctx.lineTo(w, h);
                ctx.lineTo(0, h);
                ctx.fill();
                ctx.strokeStyle = '#7a3b1c';
                ctx.lineWidth = 3;
                for (let i = 0; i < 7; i++) {
                    ctx.beginPath();
                    ctx.moveTo(range(0, w), range(80, h * 0.7));
                    ctx.bezierCurveTo(range(0, w), range(80, h * 0.7), range(0, w), range(80, h * 0.7), range(0, w), range(80, h * 0.75));
                    ctx.stroke();
                }
                ctx.fillStyle = '#2f4a22';
                for (let i = 0; i < 40; i++) {
                    ctx.beginPath();
                    ctx.arc(range(0, w), range(90, h * 0.72), range(8, 26), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = '#1b1510';
                ctx.textAlign = 'center';
                ctx.font = 'bold 54px Impact, "Arial Black", sans-serif';
                ctx.fillText('CHERNARUS', w / 2, 62);
                ctx.fillStyle = '#9c2a1c';
                ctx.font = 'bold 26px Impact, Arial, sans-serif';
                ctx.fillText('STAY ALIVE', w / 2, h - 24);
            }),
            1900,
            2700,
            new THREE.Vector3(-2300, 2600, ROOM.front - 40),
            Math.PI
        );
        poster(
            canvasTexture(420, 600, (ctx, w, h) => {
                ctx.fillStyle = '#07040f';
                ctx.fillRect(0, 0, w, h);
                for (let i = 0; i < 40; i++) {
                    ctx.strokeStyle = `hsla(${280 + i * 3}, 90%, 60%, ${0.15 + (i % 3) * 0.1})`;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    for (let x = 0; x <= w; x += 10) {
                        const y = h * 0.45 + Math.sin(x * 0.04 + i * 0.5) * (20 + i * 3);
                        if (x === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.stroke();
                }
                ctx.fillStyle = '#5bff8a';
                ctx.textAlign = 'center';
                ctx.font = 'bold 30px Arial, sans-serif';
                ctx.fillText('CAK3D FM PRESENTS', w / 2, 60);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 88px Impact, "Arial Black", sans-serif';
                ctx.fillText('DnB', w / 2, 170);
                ctx.font = 'bold 50px Impact, "Arial Black", sans-serif';
                ctx.fillText('ALL NIGHT', w / 2, 230);
                ctx.fillStyle = '#d29bff';
                ctx.font = '22px Arial, sans-serif';
                ctx.fillText('live looping on the RC-505', w / 2, h - 90);
                ctx.fillText('doors at 4:20 · bring a friend', w / 2, h - 56);
            }),
            1900,
            2700,
            new THREE.Vector3(-12800, 2600, ROOM.front - 40),
            Math.PI
        );

        // Appalachian Trail map, for the hikes
        poster(
            canvasTexture(420, 720, (ctx, w, h) => {
                ctx.fillStyle = '#e9dfc4';
                ctx.fillRect(0, 0, w, h);
                ctx.strokeStyle = '#b9a77a';
                ctx.lineWidth = 2;
                for (let i = 0; i < 16; i++) {
                    ctx.beginPath();
                    ctx.moveTo(0, i * 50 + 20);
                    ctx.bezierCurveTo(w * 0.3, i * 50 - 10, w * 0.6, i * 50 + 50, w, i * 50 + 10);
                    ctx.stroke();
                }
                ctx.strokeStyle = '#c4161c';
                ctx.lineWidth = 6;
                ctx.setLineDash([14, 8]);
                ctx.beginPath();
                ctx.moveTo(w * 0.78, 90);
                ctx.bezierCurveTo(w * 0.6, 220, w * 0.7, 320, w * 0.5, 420);
                ctx.bezierCurveTo(w * 0.35, 520, w * 0.4, 590, w * 0.22, h - 90);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#1f3a1a';
                ctx.textAlign = 'center';
                ctx.font = 'bold 38px Georgia, serif';
                ctx.fillText('APPALACHIAN', w / 2, 50);
                ctx.fillText('TRAIL', w / 2, 88);
                ctx.font = 'bold 18px Georgia, serif';
                ctx.textAlign = 'left';
                ctx.fillText('KATAHDIN, ME', w * 0.5, 120);
                ctx.fillText('SPRINGER MTN, GA', 20, h - 60);
                ctx.textAlign = 'center';
                ctx.font = 'italic 18px Georgia, serif';
                ctx.fillText('2,190 miles · one overnight at a time', w / 2, h - 20);
                ctx.save();
                ctx.translate(w * 0.8, h * 0.62);
                ctx.scale(40, 40);
                ctx.fillStyle = '#2f6b2a';
                leafPath(ctx);
                ctx.fill();
                ctx.restore();
            }),
            1900,
            3260,
            new THREE.Vector3(-12000, 2600, ROOM.back + 40),
            0
        );
    }

    setFan() {
        const g = new THREE.Group();
        g.position.set(FAN.x, ROOM.ceiling, FAN.z);
        const bronze = mat.std('#3a2a1c', 0.4, 0.7);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(50, 50, 900, 12), bronze);
        rod.position.y = -450;
        const canopy = new THREE.Mesh(new THREE.CylinderGeometry(200, 300, 120, 24), bronze);
        canopy.position.y = -60;
        const motor = new THREE.Mesh(new THREE.CylinderGeometry(420, 380, 360, 32), bronze);
        motor.position.y = -1080;
        g.add(rod, canopy, motor);

        this.fanBlades = new THREE.Group();
        this.fanBlades.position.y = -1140;
        const wood = new THREE.MeshStandardMaterial({ map: woodTexture('#5a3a22'), roughness: 0.6 });
        for (let i = 0; i < 5; i++) {
            const arm = new THREE.Group();
            arm.rotation.y = (i / 5) * Math.PI * 2;
            const blade = new THREE.Mesh(new RoundedBoxGeometryLite(2600, 30, 620), wood);
            blade.position.x = 1700;
            blade.rotation.x = 0.14; // a little pitch
            const bracket = new THREE.Mesh(new THREE.BoxGeometry(700, 40, 120), bronze);
            bracket.position.x = 600;
            arm.add(blade, bracket);
            this.fanBlades.add(arm);
        }
        g.add(this.fanBlades);

        // light kit under the motor
        this.fanBulb = new THREE.MeshStandardMaterial({ color: '#f6efe0', emissive: '#ffd9a0', emissiveIntensity: 0, transparent: true, opacity: 0.92 });
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(340, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), this.fanBulb);
        bowl.position.y = -1260;
        g.add(bowl);
        this.fanLight = new THREE.PointLight('#ffd9a0', 0, 20000, 1.3);
        this.fanLight.position.y = -1500;
        this.fanLight.castShadow = false;
        g.add(this.fanLight);
        // pull chains
        for (const dx of [-120, 120]) {
            const chain = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 500, 4), mat.std('#c9a23a', 0.3, 0.9));
            chain.position.set(dx, -1540, 0);
            g.add(chain);
        }
        this.scene.add(shadows(g, true, false));
        // the fan itself responds to clicks too: speed through 0-3
        this.clickable(g, () => this.cycleFan(), new THREE.Vector3(0.3, -1, 0.5));
    }

    setSwitch() {
        const g = new THREE.Group();
        g.position.set(SWITCH.x, SWITCH.y, ROOM.front - 20);
        g.rotation.y = Math.PI;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(900, 520, 30), mat.std('#efe9dc', 0.4));
        g.add(plate);
        // light toggle
        this.toggle = new THREE.Mesh(new THREE.BoxGeometry(110, 220, 120), mat.std('#f7f3ea', 0.3));
        this.toggle.position.set(-200, 0, 70);
        g.add(this.toggle);
        // fan speed dial with marks
        const face = new THREE.Mesh(
            new THREE.CircleGeometry(150, 32),
            new THREE.MeshStandardMaterial({
                map: canvasTexture(128, 128, (ctx, w, h) => {
                    ctx.fillStyle = '#efe9dc';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#222';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 20px Arial';
                    ['OFF', '1', '2', '3'].forEach((t, i) => {
                        const a = -Math.PI / 2 + (i - 1.5) * 0.7;
                        ctx.fillText(t, w / 2 + Math.cos(a) * 46, h / 2 + Math.sin(a) * 46 + 7);
                    });
                }),
            })
        );
        face.position.set(220, 0, 20);
        g.add(face);
        this.dial = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 90, 20), mat.std('#2a2a2e', 0.4, 0.5));
        this.dial.rotation.x = Math.PI / 2;
        this.dial.position.set(220, 0, 70);
        const pointer = new THREE.Mesh(new THREE.BoxGeometry(14, 60, 10), mat.glow('#ff3d3d'));
        pointer.position.set(0, 50, 0);
        pointer.rotation.x = -Math.PI / 2;
        this.dial.add(pointer);
        g.add(this.dial);
        this.scene.add(shadows(g));
        const front = new THREE.Vector3(0, 0, -1);
        this.clickable(this.toggle, () => this.setLight(!this.lightOn), front, g);
        this.clickable(this.dial, () => this.cycleFan(), front, g);
        this.clickable(plate, () => this.setLight(!this.lightOn), front, g);
    }

    setDogBowls() {
        const g = new THREE.Group();
        g.position.set(ROOM.left + 1800, FLOOR_Y, ROOM.front - 1800);
        const steel = mat.std('#c9ccd2', 0.25, 0.9);
        const bowl = (x: number, fill: THREE.Material, kibble: boolean) => {
            const pts = [
                [0, 0],
                [7, 0],
                [9.5, 5.5],
                [8.6, 6],
                [6.6, 1.4],
                [0, 1.4],
            ].map(([px, py]) => new THREE.Vector2(px * CM, py * CM));
            const b = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), steel);
            b.position.x = x;
            g.add(b);
            const top = new THREE.Mesh(new THREE.CircleGeometry(7.6 * CM, 32), fill);
            top.rotation.x = -Math.PI / 2;
            top.position.set(x, 4.2 * CM, 0);
            g.add(top);
            if (kibble) {
                const bits = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.7 * CM, 0), mat.std('#7a4a22', 0.9), 60);
                const m = new THREE.Matrix4();
                for (let i = 0; i < 60; i++) {
                    const a = range(0, Math.PI * 2);
                    const r = Math.sqrt(range(0, 1)) * 6.5 * CM;
                    m.makeTranslation(x + Math.cos(a) * r, 4.4 * CM + range(0, 1.2) * CM, Math.sin(a) * r);
                    bits.setMatrixAt(i, m);
                }
                g.add(bits);
            }
        };
        bowl(-14 * CM, mat.std('#6b3e1c', 1), true);
        bowl(14 * CM, new THREE.MeshStandardMaterial({ color: '#5aa8ff', transparent: true, opacity: 0.6, roughness: 0.05 }), false);
        // bone
        const white = mat.std('#f4efe2', 0.6);
        const bone = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1 * CM, 1.1 * CM, 12 * CM, 12), white);
        shaft.rotation.z = Math.PI / 2;
        bone.add(shaft);
        for (const sx of [-1, 1])
            for (const sz of [-1, 1]) {
                const knob = new THREE.Mesh(new THREE.SphereGeometry(1.6 * CM, 12, 10), white);
                knob.position.set(sx * 6.2 * CM, 0, sz * 1.1 * CM);
                bone.add(knob);
            }
        bone.position.set(0, 1.6 * CM, 16 * CM);
        bone.rotation.y = 0.5;
        g.add(bone);
        // a mat with a paw on it
        const matTex = canvasTexture(256, 160, (ctx, w, h) => {
            ctx.fillStyle = '#3d6aff';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.textAlign = 'center';
            ctx.font = 'bold 28px Arial, sans-serif';
            ctx.fillText('MyPetID', w / 2, h - 22);
            ctx.beginPath();
            ctx.ellipse(w / 2, 70, 22, 18, 0, 0, Math.PI * 2);
            ctx.fill();
            for (const [dx, dy] of [
                [-30, 36],
                [-10, 26],
                [10, 26],
                [30, 36],
            ]) {
                ctx.beginPath();
                ctx.arc(w / 2 + dx, dy + 10, 9, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(60 * CM, 38 * CM), new THREE.MeshStandardMaterial({ map: matTex, roughness: 1 }));
        rug.rotation.set(-Math.PI / 2, 0, Math.PI); // text reads from the room side
        rug.position.y = 4;
        g.add(rug);
        this.scene.add(shadows(g));
        this.clickable(g, () => {
            const stash = this.application.world.deskStash;
            if (!stash) return;
            if (stash) stash.loadOnPc(myPetId, 'desk');
        });
    }

    setLight(on: boolean) {
        this.lightOn = on;
        this.fanLight.intensity = on ? 0.9 : 0;
        this.fanBulb.emissiveIntensity = on ? 1.2 : 0;
        this.toggle.rotation.x = on ? -0.35 : 0.35;
    }

    cycleFan() {
        this.fanSpeed = (this.fanSpeed + 1) % 4;
        this.dial.rotation.y = (this.fanSpeed - 1.5) * 0.7;
    }

    update() {
        const dt = Math.min(this.application.time.delta, 50) / 1000;
        // spin up and down smoothly between speeds
        const target = [0, 2.2, 4.8, 8][this.fanSpeed];
        this.fanSpin += (target - this.fanSpin) * dt * 0.8;
        this.fanBlades.rotation.y += this.fanSpin * dt;
        // the door swings in about half a second
        this.doorAngle += ((this.doorOpen ? -1.6 : 0) - this.doorAngle) * Math.min(1, dt * 5);
        this.door.rotation.y = this.doorAngle;
    }
}

/** Flat box with softened corners, cheap enough for fan blades */
class RoundedBoxGeometryLite extends THREE.BoxGeometry {
    constructor(w: number, h: number, d: number) {
        super(w, h, d, 4, 1, 2);
        const pos = this.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            // taper the tip of the blade
            if (x > w * 0.3) pos.setZ(i, pos.getZ(i) * (1 - ((x - w * 0.3) / (w * 0.2)) * 0.15));
        }
        this.computeVertexNormals();
    }
}
