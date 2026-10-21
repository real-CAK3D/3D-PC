import * as THREE from 'three';
import Application from '../../Application';
import { canvasTexture, FLOOR_Y, mergeBufferGeometries, range, shadows } from './props';

/**
 * Replaces the baked house plant next to the desk with a cannabis plant in a
 * fabric grow pot: a main stem with alternating branches, fan leaves at every
 * node and colas on the branch tips.
 */
export default class WeedPlant {
    application: Application;
    scene: THREE.Scene;
    group: THREE.Group;
    leaves: THREE.InstancedMesh;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        const old = this.scene.getObjectByName('plant');
        if (old) old.visible = false;

        this.group = new THREE.Group();
        this.group.position.set(3650, FLOOR_Y, -50);
        this.build();
        this.scene.add(shadows(this.group));
    }

    build() {
        // fabric pot + soil
        const potH = 1150;
        const pot = new THREE.Mesh(
            new THREE.CylinderGeometry(640, 560, potH, 32),
            new THREE.MeshStandardMaterial({ color: '#232323', roughness: 1 })
        );
        pot.position.y = potH / 2;
        const rim = new THREE.Mesh(
            new THREE.TorusGeometry(640, 40, 8, 32),
            new THREE.MeshStandardMaterial({ color: '#2d2d2d', roughness: 1 })
        );
        rim.rotation.x = Math.PI / 2;
        rim.position.y = potH;
        const soil = new THREE.Mesh(
            new THREE.CircleGeometry(620, 32),
            new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 1 })
        );
        soil.rotation.x = -Math.PI / 2;
        soil.position.y = potH - 60;
        this.group.add(pot, rim, soil);

        const stemMat = new THREE.MeshStandardMaterial({ color: '#5f8a34', roughness: 0.8 });
        const leafGeo = fanLeafGeometry();
        const colaGeo = colaGeometry();

        const leafMatrices: THREE.Matrix4[] = [];
        const colaMatrices: THREE.Matrix4[] = [];
        const dummy = new THREE.Object3D();

        const addLeaf = (at: THREE.Vector3, dir: THREE.Vector3, size: number) => {
            dummy.position.copy(at);
            dummy.lookAt(at.clone().add(dir));
            dummy.rotateZ(range(-0.4, 0.4));
            dummy.scale.setScalar(size);
            dummy.updateMatrix();
            leafMatrices.push(dummy.matrix.clone());
        };
        const addCola = (at: THREE.Vector3, size: number, tilt = 0) => {
            dummy.position.copy(at);
            dummy.rotation.set(range(-0.1, 0.1) + tilt, rand(), range(-0.1, 0.1));
            dummy.scale.set(size, size * range(0.9, 1.2), size);
            dummy.updateMatrix();
            colaMatrices.push(dummy.matrix.clone());
        };

        // main stem
        const base = potH - 60;
        const height = 3300;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(28, 60, height, 10), stemMat);
        stem.position.y = base + height / 2;
        this.group.add(stem);

        const nodes = 7;
        for (let i = 0; i < nodes; i++) {
            const t = i / (nodes - 1);
            const y = base + 350 + t * (height - 650);
            const reach = THREE.MathUtils.lerp(1150, 280, t); // christmas-tree shape
            // two branches per node, rotating 90 degrees each node
            for (const side of [0, 1]) {
                const ang = (i * Math.PI) / 2 + side * Math.PI + range(-0.2, 0.2);
                const dir = new THREE.Vector3(Math.cos(ang), 0.55, Math.sin(ang)).normalize();
                const end = new THREE.Vector3(0, y, 0).add(dir.clone().multiplyScalar(reach));
                const branch = cylinderBetween(new THREE.Vector3(0, y, 0), end, 18, stemMat);
                this.group.add(branch);

                // fan leaves at the node and along the branch
                const out = new THREE.Vector3(Math.cos(ang), -0.15, Math.sin(ang));
                addLeaf(new THREE.Vector3(0, y, 0).addScaledVector(out, 60), out, THREE.MathUtils.lerp(1.9, 1.0, t));
                addLeaf(
                    new THREE.Vector3(0, y, 0).lerp(end, 0.6),
                    new THREE.Vector3(Math.cos(ang + 0.9), 0.1, Math.sin(ang + 0.9)),
                    THREE.MathUtils.lerp(1.3, 0.7, t)
                );
                addLeaf(
                    new THREE.Vector3(0, y, 0).lerp(end, 0.6),
                    new THREE.Vector3(Math.cos(ang - 0.9), 0.1, Math.sin(ang - 0.9)),
                    THREE.MathUtils.lerp(1.3, 0.7, t)
                );
                // cola on the tip, with sugar leaves poking out
                addCola(end, THREE.MathUtils.lerp(0.55, 0.85, t));
                addLeaf(end.clone().add(new THREE.Vector3(0, 80, 0)), dir, 0.45);
            }
        }
        // top cola
        addCola(new THREE.Vector3(0, base + height - 120, 0), 1.25);
        for (let k = 0; k < 4; k++) {
            const a = (k / 4) * Math.PI * 2;
            addLeaf(new THREE.Vector3(0, base + height - 250, 0), new THREE.Vector3(Math.cos(a), 0.4, Math.sin(a)), 0.4);
        }

        const leafMat = new THREE.MeshStandardMaterial({
            color: '#3dbb3a',
            emissive: '#0f4a0c',
            roughness: 0.7,
            side: THREE.DoubleSide,
        });
        this.leaves = new THREE.InstancedMesh(leafGeo, leafMat, leafMatrices.length);
        leafMatrices.forEach((m, i) => this.leaves.setMatrixAt(i, m));
        this.group.add(this.leaves);

        const colaMat = new THREE.MeshStandardMaterial({
            map: budTexture(),
            emissive: '#123a0a',
            roughness: 0.85,
            flatShading: true,
        });
        const colas = new THREE.InstancedMesh(colaGeo, colaMat, colaMatrices.length);
        colaMatrices.forEach((m, i) => colas.setMatrixAt(i, m));
        this.group.add(colas);
    }

    update() {
        // gentle sway, like there's a fan on
        const t = this.application.time.elapsed * 0.0006;
        this.group.rotation.z = Math.sin(t) * 0.012;
        this.group.rotation.x = Math.cos(t * 0.8) * 0.01;
    }
}

const rand = () => range(0, Math.PI * 2);

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material) {
    const len = a.distanceTo(b);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, len, 6), m);
    mesh.position.copy(a).lerp(b, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return mesh;
}

/** Seven serrated leaflets fanned out, lying flat with the tip along +z (~600 units long) */
function fanLeafGeometry() {
    const leaflets: [number, number][] = [
        [0, 1],
        [26, 0.86],
        [-26, 0.86],
        [54, 0.66],
        [-54, 0.66],
        [92, 0.36],
        [-92, 0.36],
    ];
    const L = 600;
    const parts = leaflets.map(([ang, len]) => {
        const shape = new THREE.Shape();
        const steps = 20;
        const length = L * len;
        for (let k = 0; k <= steps; k++) {
            const t = k / steps;
            const w = length * 0.1 * Math.sin(Math.PI * Math.pow(t, 0.85)) * (1 + 0.22 * Math.abs(Math.sin(t * 50)));
            if (k === 0) shape.moveTo(w, t * length);
            else shape.lineTo(w, t * length);
        }
        for (let k = steps; k >= 0; k--) {
            const t = k / steps;
            const w = length * 0.1 * Math.sin(Math.PI * Math.pow(t, 0.85));
            shape.lineTo(-w, t * length);
        }
        const g = new THREE.ShapeGeometry(shape);
        g.rotateZ(THREE.MathUtils.degToRad(-ang));
        return g;
    });
    const leaf = mergeBufferGeometries(parts) as THREE.BufferGeometry;
    // lay it down: tip +y -> +z, droop the outer leaflets a touch
    leaf.rotateX(Math.PI / 2);
    const pos = leaf.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, -Math.sqrt(x * x + z * z) * 0.18);
    }
    leaf.computeVertexNormals();
    return leaf;
}

/**
 * A cola: a tapering spear of stacked calyx clusters (~420 units tall), each
 * cluster a bunch of small faceted lumps so it reads lumpy, not smooth.
 */
function colaGeometry() {
    const parts: THREE.BufferGeometry[] = [];
    const clusters = 9;
    for (let c = 0; c < clusters; c++) {
        const t = c / (clusters - 1);
        const y = t * 380;
        const spread = THREE.MathUtils.lerp(85, 30, t);
        const lumps = Math.round(THREE.MathUtils.lerp(9, 4, t));
        for (let i = 0; i < lumps; i++) {
            const a = (i / lumps) * Math.PI * 2 + c * 0.7;
            const r = range(22, 38) * THREE.MathUtils.lerp(1, 0.7, t);
            const g = new THREE.IcosahedronGeometry(r, 0);
            g.scale(1, range(1.3, 1.8), 1);
            // calyxes point up and slightly out
            g.rotateZ(Math.cos(a) * 0.4);
            g.rotateX(-Math.sin(a) * 0.4);
            g.translate(Math.cos(a) * spread * range(0.5, 1), y + range(-20, 20), Math.sin(a) * spread * range(0.5, 1));
            parts.push(g);
        }
        // a solid core so you can't see through the gaps
        const core = new THREE.IcosahedronGeometry(spread * 0.75, 0);
        core.scale(1, 1.4, 1);
        core.translate(0, y, 0);
        parts.push(core);
    }
    // the pointy tip
    const tip = new THREE.ConeGeometry(26, 90, 6);
    tip.translate(0, 420, 0);
    parts.push(tip.toNonIndexed());
    // strip down to position/normal/uv so everything merges
    return mergeBufferGeometries(
        parts.map((p) => {
            const g = p.index ? p.toNonIndexed() : p;
            return g;
        })
    ) as THREE.BufferGeometry;
}

/** Frosty green calyxes with orange pistils curling all over */
function budTexture() {
    return canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#4f9a2e';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 500; i++) {
            const g = 120 + Math.floor(range(0, 90));
            ctx.fillStyle = `rgb(${Math.floor(g * 0.45)},${g},${Math.floor(g * 0.25)})`;
            ctx.beginPath();
            ctx.arc(range(0, w), range(0, h), range(2, 7), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.lineWidth = 2;
        for (let i = 0; i < 260; i++) {
            ctx.strokeStyle = `rgb(${Math.floor(range(210, 250))},${Math.floor(range(110, 150))},${Math.floor(range(20, 50))})`;
            const x = range(0, w);
            const y = range(0, h);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + range(-10, 10), y + range(-10, 10), x + range(-16, 16), y + range(-16, 16));
            ctx.stroke();
        }
        for (let i = 0; i < 450; i++) {
            ctx.fillStyle = `rgba(235,250,225,${range(0.35, 0.8)})`;
            ctx.fillRect(range(0, w), range(0, h), 1.5, 1.5);
        }
    });
}
