import * as THREE from 'three';
import Application from '../../Application';
import Time from '../../Utils/Time';

// @ts-ignore
import fragmentShader from '../../Shaders/smoke/fragment.glsl';
// @ts-ignore
import vertexShader from '../../Shaders/smoke/vertex.glsl';

type Puff = { mesh: THREE.Mesh; material: THREE.ShaderMaterial };

/**
 * Smoke wisps rising off anything lit, plus a haze hanging in the room.
 * Every plane turns to face the camera around its vertical axis.
 */
export default class Smoke {
    application: Application;
    scene: THREE.Scene;
    time: Time;
    puffs: Puff[] = [];

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;
        this.time = this.application.time;
    }

    /** Thin smoke column rising from a burning tip */
    addWisp(origin: THREE.Vector3, height = 2600, width = 520) {
        const geometry = new THREE.PlaneGeometry(width, height, 1, 32);
        // anchor the bottom of the plane at the ember
        geometry.translate(0, height / 2, 0);
        this.add(geometry, origin, {
            uTimeFrequency: 0.00035,
            uUvFrequency: new THREE.Vector2(2, 3.5),
            uAlpha: 0.75,
            uSway: width * 0.6,
            uHaze: 0,
        });
    }

    /** Big soft cloud hanging in the air */
    addHaze(center: THREE.Vector3, width: number, height: number, alpha = 0.22) {
        this.add(new THREE.PlaneGeometry(width, height, 1, 1), center, {
            uTimeFrequency: 0.00004,
            uUvFrequency: new THREE.Vector2(1.6, 1.1),
            uAlpha: alpha,
            uSway: 0,
            uHaze: 1,
        });
    }

    private add(geometry: THREE.PlaneGeometry, position: THREE.Vector3, values: { [key: string]: any }) {
        const uniforms: { [key: string]: THREE.IUniform } = {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#d9d4e6') },
            uSeed: { value: Math.random() * 100 },
        };
        for (const key in values) uniforms[key] = { value: values[key] };
        const material = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            vertexShader,
            fragmentShader,
            uniforms,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.renderOrder = 10;
        this.scene.add(mesh);
        this.puffs.push({ mesh, material });
    }

    update() {
        const cam = this.application.camera.instance.position;
        for (const { mesh, material } of this.puffs) {
            material.uniforms.uTime.value = this.time.elapsed;
            mesh.rotation.y = Math.atan2(cam.x - mesh.position.x, cam.z - mesh.position.z);
        }
    }
}
