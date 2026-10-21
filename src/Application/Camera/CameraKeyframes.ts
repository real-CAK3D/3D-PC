import * as THREE from 'three';
import { CameraKey } from './Camera';
import Time from '../Utils/Time';
import Application from '../Application';
import Mouse from '../Utils/Mouse';
import Sizes from '../Utils/Sizes';

export class CameraKeyframeInstance {
    position: THREE.Vector3;
    focalPoint: THREE.Vector3;

    constructor(keyframe: CameraKeyframe) {
        this.position = keyframe.position;
        this.focalPoint = keyframe.focalPoint;
    }

    update() {}
}

export const keys: { [key in CameraKey]: CameraKeyframe } = {
    idle: {
        position: new THREE.Vector3(-21000, 13000, 24000),
        focalPoint: new THREE.Vector3(-2600, -1200, 1600),
    },
    monitor: {
        position: new THREE.Vector3(0, 950, 2000),
        focalPoint: new THREE.Vector3(0, 950, 0),
    },
    desk: {
        position: new THREE.Vector3(0, 1800, 5500),
        focalPoint: new THREE.Vector3(0, 500, 0),
    },
    loading: {
        position: new THREE.Vector3(-35000, 35000, 35000),
        focalPoint: new THREE.Vector3(0, -5000, 0),
    },
    orbitControlsStart: {
        position: new THREE.Vector3(-15000, 10000, 15000),
        focalPoint: new THREE.Vector3(-100, 350, 0),
    },
    // hovering The Double Wide on the desk
    paper: {
        position: new THREE.Vector3(-2063, 1500, 2350),
        focalPoint: new THREE.Vector3(-2063, -445, 1000),
    },
    // hovering the desk drawers (and whatever popped out of them)
    drawers: {
        position: new THREE.Vector3(-2300, 400, 7600),
        focalPoint: new THREE.Vector3(-2300, -200, 1400),
    },
    // on the couch, facing the TV (pans with the mouse like the desk view)
    tv: {
        position: new THREE.Vector3(-7800, 1100, 2300),
        focalPoint: new THREE.Vector3(-7800, -500, 10200),
    },
    // up close on the TV screen
    tvScreen: {
        position: new THREE.Vector3(-7800, -200, 5300),
        focalPoint: new THREE.Vector3(-7800, -200, 10000),
    },
    // leaning in on the stereo receiver under the TV
    stereo: {
        position: new THREE.Vector3(-7200, -1700, 7300),
        focalPoint: new THREE.Vector3(-7200, -2450, 10200),
    },
    // up close on whatever was clicked (re-aimed by DeskStash each time)
    inspect: {
        position: new THREE.Vector3(0, 0, 3000),
        focalPoint: new THREE.Vector3(0, 0, 0),
    },
    // looking down into an open drawer (re-aimed by DeskStash for each drawer)
    drawerInside: {
        position: new THREE.Vector3(-2350, 1800, 4400),
        focalPoint: new THREE.Vector3(-2350, -1000, 2200),
    },
};

export class MonitorKeyframe extends CameraKeyframeInstance {
    application: Application;
    sizes: Sizes;
    targetPos: THREE.Vector3;
    origin: THREE.Vector3;

    constructor() {
        const keyframe = keys.monitor;
        super(keyframe);
        this.application = new Application();
        this.sizes = this.application.sizes;
        this.origin = new THREE.Vector3().copy(keyframe.position);
        this.targetPos = new THREE.Vector3().copy(keyframe.position);
    }

    update() {
        const aspect = this.sizes.height / this.sizes.width;
        const additionalZoom = this.sizes.width < 768 ? 0 : 600;
        this.targetPos.z = this.origin.z + aspect * 1200 - additionalZoom;
        this.position.copy(this.targetPos);
    }
}

export class LoadingKeyframe extends CameraKeyframeInstance {
    constructor() {
        const keyframe = keys.loading;
        super(keyframe);
    }

    update() {}
}

/** A static spot that drifts with the mouse, like the desk view */
export class PanKeyframe extends CameraKeyframeInstance {
    application: Application;
    mouse: Mouse;
    sizes: Sizes;
    origin: THREE.Vector3;
    originFoc: THREE.Vector3;

    constructor(keyframe: CameraKeyframe) {
        super({ position: keyframe.position.clone(), focalPoint: keyframe.focalPoint.clone() });
        this.application = new Application();
        this.mouse = this.application.mouse;
        this.sizes = this.application.sizes;
        this.origin = keyframe.position.clone();
        this.originFoc = keyframe.focalPoint.clone();
    }

    update() {
        // these views face +z, where screen-right is world -x
        const mx = 0.5 - this.mouse.x / this.sizes.width;
        const my = this.mouse.y / this.sizes.height - 0.5;
        this.position.x += (this.origin.x + mx * 1600 - this.position.x) * 0.04;
        this.position.y += (this.origin.y - my * 700 - this.position.y) * 0.04;
        this.focalPoint.x += (this.originFoc.x + mx * 2600 - this.focalPoint.x) * 0.06;
        this.focalPoint.y += (this.originFoc.y - my * 1400 - this.focalPoint.y) * 0.06;
    }
}

const DESK_SHIFT = -700;

export class DeskKeyframe extends CameraKeyframeInstance {
    origin: THREE.Vector3;
    application: Application;
    mouse: Mouse;
    sizes: Sizes;
    targetFoc: THREE.Vector3;
    targetPos: THREE.Vector3;

    constructor() {
        const keyframe = keys.desk;
        super(keyframe);
        this.application = new Application();
        this.mouse = this.application.mouse;
        this.sizes = this.application.sizes;
        this.origin = new THREE.Vector3().copy(keyframe.position);
        this.targetFoc = new THREE.Vector3().copy(keyframe.focalPoint);
        this.targetPos = new THREE.Vector3().copy(keyframe.position);
    }

    update() {
        // DESK_SHIFT keeps the drawers and the paper (left side of the desk) in frame
        this.targetFoc.x +=
            (this.mouse.x - this.sizes.width / 2 + DESK_SHIFT - this.targetFoc.x) * 0.05;
        this.targetFoc.y +=
            (-(this.mouse.y - this.sizes.height) - this.targetFoc.y) * 0.05;

        this.targetPos.x +=
            (this.mouse.x - this.sizes.width / 2 + DESK_SHIFT - this.targetPos.x) * 0.025;
        this.targetPos.y +=
            (-(this.mouse.y - this.sizes.height * 2) - this.targetPos.y) *
            0.025;

        const aspect = this.sizes.height / this.sizes.width;
        this.targetPos.z = this.origin.z + aspect * 3000 - 1800;

        this.focalPoint.copy(this.targetFoc);
        this.position.copy(this.targetPos);
    }
}

export class IdleKeyframe extends CameraKeyframeInstance {
    time: Time;
    origin: THREE.Vector3;
    spin = 0; // extra turn from right-click dragging

    constructor() {
        const keyframe = keys.idle;
        super(keyframe);
        this.origin = new THREE.Vector3().copy(keyframe.position);
        this.time = new Time();
    }

    update() {
        // swing around the room, far enough both ways to see the TV corner from behind
        const focal = keys.idle.focalPoint;
        const radius = Math.hypot(this.origin.x - focal.x, this.origin.z - focal.z);
        const start = Math.atan2(this.origin.x - focal.x, this.origin.z - focal.z);
        const angle = start + Math.sin((this.time.elapsed + 19000) * 0.00006) * 2.3 + this.spin;
        this.position.x = focal.x + Math.sin(angle) * radius;
        this.position.z = focal.z + Math.cos(angle) * radius;
        this.position.y =
            Math.sin((this.time.elapsed + 1000) * 0.000004) * 4000 +
            this.origin.y -
            3000;
    }
}

export class OrbitControlsStart extends CameraKeyframeInstance {
    constructor() {
        const keyframe = keys.orbitControlsStart;
        super(keyframe);
    }

    update() {}
}
