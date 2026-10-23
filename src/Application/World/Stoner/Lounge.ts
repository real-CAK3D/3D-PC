import * as THREE from 'three';
import Application from '../../Application';
import {
    ashtray,
    bong,
    bottle,
    can,
    mat,
    CM,
    fabricTexture,
    inspectable,
    FLOOR_Y,
    lighter,
    nug,
    papers,
    range,
    RoundedBoxGeometry,
    shadows,
    shake,
    smokable,
    stashJar,
    woodTexture,
} from './props';
import { menu, MenuItem } from './ContextMenu';
import { ROOM } from './Room';
import { CameraKey } from '../../Camera/Camera';
import { TV_VIEWS } from './Entertainment';

const COUCH = { x: -7800, z: ROOM.back + 1650, width: 7200, depth: 3000 };
const TABLE = { x: -7800, z: 3500, width: 4400, depth: 2100, height: 1400 };

/** Couch, coffee table, and everything piled on the table */
export default class Lounge {
    application: Application;
    scene: THREE.Scene;
    smokePoints: THREE.Vector3[] = [];
    phoneSpot: THREE.Object3D;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        this.setCouch();
        const top = this.setTable();
        this.setTableClutter(top);
    }

    setCouch() {
        const group = new THREE.Group();
        group.position.set(COUCH.x, FLOOR_Y, COUCH.z);
        const fabric = new THREE.MeshStandardMaterial({ map: fabricTexture('#4c5a2c', '#2f3a18'), roughness: 1 });
        fabric.map!.repeat.set(6, 3);
        const cushionMat = new THREE.MeshStandardMaterial({ map: fabricTexture('#56663a', '#33401e'), roughness: 1 });
        cushionMat.map!.repeat.set(3, 2);
        const legMat = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.5 });

        const { width: W, depth: D } = COUCH;
        const legH = 250;
        const baseH = 900;
        const armW = 700;
        const box = (w: number, h: number, d: number, r: number, m: THREE.Material, x: number, y: number, z: number) => {
            const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), m);
            mesh.position.set(x, y, z);
            group.add(mesh);
            return mesh;
        };

        // legs
        for (const sx of [-1, 1])
            for (const sz of [-1, 1]) {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(70, 50, legH, 10), legMat);
                leg.position.set(sx * (W / 2 - 250), legH / 2, sz * (D / 2 - 250));
                group.add(leg);
            }
        // base, back, arms
        box(W, baseH, D, 120, fabric, 0, legH + baseH / 2, 0);
        box(W, 1900, 750, 200, fabric, 0, legH + baseH + 700, -D / 2 + 375);
        for (const sx of [-1, 1]) box(armW, 1500, D, 180, fabric, sx * (W / 2 - armW / 2), legH + 750 + 150, 0);

        // seat + back cushions, a bit squashed and uneven
        const inner = W - armW * 2;
        const seats = 3;
        for (let i = 0; i < seats; i++) {
            const x = -inner / 2 + inner / seats / 2 + (i * inner) / seats;
            const seat = box(inner / seats - 40, 500, D - 820, 180, cushionMat, x, legH + baseH + 230, 330);
            seat.rotation.z = range(-0.02, 0.02);
            const back = box(inner / seats - 60, 1300, 450, 200, cushionMat, x, legH + baseH + 900, -D / 2 + 900);
            back.rotation.x = -0.18 + range(-0.04, 0.04);
        }

        // throw pillows
        const pillowMat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
        const p1 = box(900, 900, 300, 200, pillowMat('#7b3fd1'), -W / 2 + armW + 500, legH + baseH + 900, -200);
        p1.rotation.set(-0.3, 0.3, 0.15);
        const p2 = box(850, 850, 300, 200, pillowMat('#2bb85a'), W / 2 - armW - 480, legH + baseH + 880, -180);
        p2.rotation.set(-0.3, -0.35, -0.2);

        this.scene.add(shadows(group));

        this.setPhone(group, W, armW, legH + 1650);

        // click the couch to sit down facing the TV
        group.userData.focus = CameraKey.TV;
        group.userData.focusViews = TV_VIEWS;
        group.userData.onClick = () => {};
        group.userData.menuTitle = 'Couch';
        menu(group, [
            { label: 'Sit down', run: () => this.application.camera.transition(CameraKey.TV, 2000) },
            {
                label: 'Check under the cushions',
                say: ['A lighter! It works, too.', '$3.50 and a gummy of unknown age.', 'The TV remote you lost in 2023.', 'Crumbs. So many crumbs.', 'A Pokémon card. Holo!'],
            },
            { label: 'Take a nap', say: ['Five more minutes...', 'Couch lock achieved.'] },
        ]);
    }

    /** Where the phone lies on the couch's right arm (Phone builds the Galaxy Z Fold there) */
    setPhone(couch: THREE.Group, W: number, armW: number, armTop: number) {
        this.phoneSpot = new THREE.Object3D();
        this.phoneSpot.position.set(W / 2 - armW / 2, armTop, 200);
        this.phoneSpot.rotation.y = 0.35;
        couch.add(this.phoneSpot);
    }

    setTable(): THREE.Vector3 {
        const group = new THREE.Group();
        group.position.set(TABLE.x, FLOOR_Y, TABLE.z);
        const wood = new THREE.MeshStandardMaterial({ map: woodTexture('#6b4428'), roughness: 0.55 });
        const { width: W, depth: D, height: H } = TABLE;
        const topT = 140;

        const top = new THREE.Mesh(new RoundedBoxGeometry(W, topT, D, 2, 30), wood);
        top.position.y = H - topT / 2;
        group.add(top);
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - 400, 80, D - 400), wood);
        shelf.position.y = 380;
        group.add(shelf);
        for (const sx of [-1, 1])
            for (const sz of [-1, 1]) {
                const leg = new THREE.Mesh(new THREE.BoxGeometry(150, H - topT, 150), wood);
                leg.position.set(sx * (W / 2 - 160), (H - topT) / 2, sz * (D / 2 - 160));
                group.add(leg);
            }

        // magazines and a pizza box on the lower shelf
        const mags = ['#c43d3d', '#3d7ac4', '#e0b42b'];
        mags.forEach((c, i) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(900, 18, 1200), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
            m.position.set(-1100 + i * 40, 430 + i * 20, range(-100, 100));
            m.rotation.y = range(-0.3, 0.3);
            group.add(m);
        });
        const pizza = new THREE.Mesh(new THREE.BoxGeometry(1350, 140, 1350), new THREE.MeshStandardMaterial({ color: '#c9a070', roughness: 1 }));
        pizza.position.set(800, 490, 0);
        pizza.rotation.y = 0.2;
        group.add(pizza);

        // click the table for a look at everything on it
        this.scene.add(inspectable(shadows(group), new THREE.Vector3(0.15, 1, -0.75)));
        return new THREE.Vector3(TABLE.x, FLOOR_Y + H, TABLE.z);
    }

    setTableClutter(top: THREE.Vector3) {
        const place = (obj: THREE.Object3D, dx: number, dz: number, ry = rangeAngle(), title = '', items?: MenuItem[]) => {
            obj.position.x += top.x + dx;
            obj.position.y += top.y;
            obj.position.z += top.z + dz;
            obj.rotation.y = ry;
            this.scene.add(inspectable(shadows(obj), new THREE.Vector3(0.1, 1, -0.6)));
            if (items) {
                obj.userData.menuTitle = title;
                menu(obj, items);
            }
            return obj;
        };
        const ASHTRAY: MenuItem[] = [
            { label: 'Ash it', say: ['Tap tap.', 'Perfect ash. Long, grey, intact.'] },
            { label: 'Empty it', say: ['Later.', 'You move it two inches. Basically cleaning.'] },
        ];
        const DRINK = (name: string): MenuItem[] => [
            { label: 'Take a sip', say: [`${name}. Warm and flat, as expected.`, 'Is this one yours? It is now.', 'Mostly ash. Do not drink.'] },
            { label: 'Shake it', say: ['Still something in there.', 'Empty.'] },
            { label: 'Read the label', say: [`${name}: part of a balanced snack.`, `${name}. 100% of your daily vibes.`] },
        ];

        // two ashtrays, one with a blunt going and one with a joint
        const a1 = ashtray('#3a3a48', 'blunt');
        place(a1.group, -1400, -300, 0.4, 'Ashtray', ASHTRAY);
        const a2 = ashtray('#2a6a4a', 'joint');
        place(a2.group, 1000, 260, -2.2, 'Ashtray', ASHTRAY); // just clear of the tipped bottle at (700, 700)
        for (const a of [a1, a2]) {
            a.group.updateMatrixWorld(true);
            if (a.smokePoint) this.smokePoints.push(a.group.localToWorld(a.smokePoint.clone()));
        }

        // a couple of spare blunts and pre-rolls
        const b = smokable('blunt', false);
        place(b.group, -500, 650, 0.3).position.y += b.radius;
        for (let i = 0; i < 3; i++) {
            const j = smokable('joint', false);
            place(j.group, -1700 + i * 90, 600 + i * 40, 1.2 + i * 0.15).position.y += j.radius;
        }

        // the bong, a jar of the good stuff, a grinder's worth of nugs, papers, lighters
        place(bong(), 1650, -400, 0, 'Bong', [
            { label: 'Take a rip', say: ['*bubble bubble* ...cough.', 'Clear. You feel it in your toes.', 'Cashed. Pack another?'] },
            { label: 'Change the water', say: ['Fresh water. You are a responsible adult.', 'Ew. Overdue.'] },
            { label: 'Pass it left', say: ['Nobody here but you.', 'Left. Always left.'] },
        ]);
        place(stashJar(), 300, -550, 0, 'Stash jar', [
            { label: 'Smell the jar', say: ['Gassy. Loud. Lemon and diesel.', 'That terp profile though.'] },
            { label: 'Count what is left', say: ['Enough for tonight.', 'An eighth, maybe.', "Don't look. It's fine."] },
        ]);
        for (let i = 0; i < 7; i++) {
            const n = nug(range(2, 3) * CM);
            place(n, range(-400, 200), range(-100, 300), n.rotation.y);
        }
        place(shake(90, 380), -100, 100, 0);
        place(papers(), -1000, 250, 0.5);
        const LIGHTER: MenuItem[] = [
            { label: 'Flick it', say: ['*flick*', '*flick* *flick* ...it works on the third try.', 'Out of fluid.'] },
            { label: 'Pocket it', say: ['Classic lighter theft.', 'It was yours to begin with.'] },
        ];
        place(lighter('#ff3d8a'), 500, 150, 2.4, 'Lighter', LIGHTER);
        place(lighter('#ffd23d'), -1900, -500, 0.8, 'Lighter', LIGHTER);

        // drinks: cans and bottles, a few knocked over
        const cans: [string, string, string, string, boolean][] = [
            ['#7a2bd1', '#f6e9ff', 'COUCHLOCK', 'cola', false],
            ['#2bb85a', '#ffffff', 'DANK DEW', 'citrus', false],
            ['#ff8a2b', '#2a1200', 'MUNCHIE', 'mango', true],
            ['#c42b2b', '#ffffff', 'COUCHLOCK', 'cherry', false],
            ['#2b6ab8', '#ffffff', 'HAZE FIZZ', 'blue razz', true],
        ];
        const canSpots = [
            [-1900, 150],
            [1950, 300],
            [1200, -650],
            [-2000, 750],
            [-1100, 880], // well clear of the tipped bottle at (700, 700) and the blunt at (-500, 650)
        ];
        // tipped cans lie along the table too, so they can't roll into their neighbours
        cans.forEach(([bg, fg, t, s, tipped], i) => place(can(bg, fg, t, s, tipped), canSpots[i][0], canSpots[i][1], tipped ? -0.1 : rangeAngle(), t, DRINK(t)));
        // the knocked over ones on the rug
        const floorCan = can('#2bb85a', '#ffffff', 'DANK DEW', 'citrus', true);
        floorCan.position.set(top.x - 2800, FLOOR_Y + 10, top.z + 1400);
        this.scene.add(shadows(floorCan));

        const bottles: [string, string, string, string, boolean][] = [
            ['#4a2a0a', '#e8d9a8', '#3a1a00', 'HIGH LIFE', false],
            ['#1f5a2a', '#f2f2f2', '#1f5a2a', 'GREEN LEAF', false],
            ['#4a2a0a', '#c43d3d', '#ffffff', 'MUNCHIES', true],
        ];
        const bottleSpots = [
            [-2100, -780],
            [-1550, -820],
            [700, 700],
        ];
        // tipped bottles lie along the table (ry 0) so they can't hang off the edge
        bottles.forEach(([glass, bg, fg, t, tipped], i) =>
            place(bottle(glass, bg, fg, t, tipped), bottleSpots[i][0], bottleSpots[i][1], tipped ? 0.1 : rangeAngle(), t, DRINK(t))
        );
        const floorBottle = bottle('#4a2a0a', '#e8d9a8', '#3a1a00', 'HIGH LIFE', true);
        floorBottle.position.set(top.x + 2600, FLOOR_Y + 10, top.z + 1600);
        floorBottle.rotation.y = 0.7;
        this.scene.add(shadows(floorBottle));
        const standing = bottle('#1f5a2a', '#f2f2f2', '#1f5a2a', 'GREEN LEAF');
        standing.position.set(COUCH.x + COUCH.width / 2 + 500, FLOOR_Y, COUCH.z + 600);
        this.scene.add(shadows(standing));
    }
}

const rangeAngle = () => range(0, Math.PI * 2);
