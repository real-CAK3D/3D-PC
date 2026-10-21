import * as THREE from 'three';
import Application from '../../Application';
import { canvasTexture, FLOOR_Y, inspectable, mat, range, shadows } from './props';
import { ROOM, WINDOW } from './Room';

/**
 * What you see out the window, matched to the real thing in Lewiston, Maine:
 * the sky follows the local time (sunrise, day, sunset, night with stars), and
 * the weather comes from weather.gov (clouds, rain, snow, storms, fog). Tree
 * lines sway at different depths so it reads as 3D, fireflies come out on warm
 * nights, and there's a clock on the wall with the real time.
 */
const LEWISTON = { lat: 44.1004, lon: -70.2148, tz: 'America/New_York' };
const WEATHER_URL = `https://api.weather.gov/points/${LEWISTON.lat},${LEWISTON.lon}`;

type Weather = { kind: 'clear' | 'cloudy' | 'rain' | 'snow' | 'storm' | 'fog'; text: string; temp: number | null };

// Everything outside faces +x (into the room) and is single-sided, so the
// orbiting camera outside the room never sees it from behind
const OUT_X = ROOM.left;

export default class Outdoors {
    application: Application;
    scene: THREE.Scene;
    sky: THREE.ShaderMaterial;
    layers: { mesh: THREE.Mesh; sway: number; phase: number; base: THREE.Color }[] = [];
    precip: THREE.Points;
    precipVel: Float32Array;
    flies: THREE.Points;
    window: THREE.SpotLight;
    weather: Weather = { kind: 'clear', text: 'Clear', temp: null };
    clockHands: { h: THREE.Object3D; m: THREE.Object3D; s: THREE.Object3D };
    readout: { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture };
    lastSecond = -1;
    flash = 0;
    group = new THREE.Group(); // only drawn while the camera is inside the room

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        this.scene.add(this.group);
        this.setSky();
        this.setTrees();
        this.setPrecip();
        this.setFireflies();
        this.setWindowLight();
        this.setClock();
        this.fetchWeather();
        window.setInterval(() => this.fetchWeather(), 30 * 60 * 1000);
    }

    /* ---------------------------------------------------------------- time */

    /** Hours since midnight in Lewiston, e.g. 18.5 for 6:30pm */
    localHours() {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: LEWISTON.tz,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hourCycle: 'h23',
        }).formatToParts(new Date());
        const get = (t: string) => Number((parts.find((p) => p.type === t) || { value: '0' }).value);
        return get('hour') + get('minute') / 60 + get('second') / 3600;
    }

    /** Rough sunrise / sunset in local clock hours for today (good to a few minutes) */
    sunTimes() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const day = Math.floor((now.getTime() - start.getTime()) / 86400000);
        const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (284 + day));
        const lat = THREE.MathUtils.degToRad(LEWISTON.lat);
        const ha = Math.acos(-Math.tan(lat) * Math.tan(THREE.MathUtils.degToRad(decl)));
        const half = THREE.MathUtils.radToDeg(ha) / 15;
        // solar noon: offset from the zone's meridian (-75) plus daylight saving
        const dst = new Intl.DateTimeFormat('en-US', { timeZone: LEWISTON.tz, timeZoneName: 'short' }).format(now).indexOf('DT') >= 0;
        const noon = 12 - (LEWISTON.lon + 75) / 15 + (dst ? 1 : 0);
        return { rise: noon - half, set: noon + half };
    }

    /** 0 = deep night .. 1 = full day, with soft dawn and dusk */
    daylight(h: number) {
        const { rise, set } = this.sunTimes();
        const ramp = 0.75;
        if (h < rise - ramp || h > set + ramp) return 0;
        if (h < rise + ramp) return (h - (rise - ramp)) / (2 * ramp);
        if (h > set - ramp) return 1 - (h - (set - ramp)) / (2 * ramp);
        return 1;
    }

    /* ------------------------------------------------------------- weather */

    async fetchWeather() {
        try {
            const point = await fetch(WEATHER_URL).then((r) => r.json());
            const hourly = await fetch(point.properties.forecastHourly).then((r) => r.json());
            const now = hourly.properties.periods[0];
            const text: string = now.shortForecast || '';
            const t = text.toLowerCase();
            const kind: Weather['kind'] = /thunder/.test(t)
                ? 'storm'
                : /snow|flurr|sleet|ice/.test(t)
                ? 'snow'
                : /rain|shower|drizzle/.test(t)
                ? 'rain'
                : /fog|haze|mist/.test(t)
                ? 'fog'
                : /cloud|overcast/.test(t)
                ? 'cloudy'
                : 'clear';
            this.weather = { kind, text, temp: now.temperature };
        } catch (e) {
            // offline or weather.gov is down: keep whatever we had
        }
        this.drawReadout();
    }

    /* ------------------------------------------------------------------ sky */

    setSky() {
        this.sky = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uDay: { value: 0 },
                uCloud: { value: 0.2 },
                uFlash: { value: 0 },
                uSun: { value: new THREE.Vector2(0.7, 0.7) },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
            `,
            fragmentShader: `
                uniform float uTime; uniform float uDay; uniform float uCloud; uniform float uFlash; uniform vec2 uSun;
                varying vec2 vUv;
                float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
                float noise(vec2 p) {
                    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
                }
                float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
                void main() {
                    // night -> dusk/dawn -> day gradients
                    vec3 nightTop = vec3(0.02, 0.02, 0.08), nightLow = vec3(0.10, 0.06, 0.20);
                    vec3 duskTop = vec3(0.20, 0.15, 0.45), duskLow = vec3(1.00, 0.45, 0.25);
                    vec3 dayTop = vec3(0.25, 0.55, 0.95), dayLow = vec3(0.70, 0.85, 1.00);
                    float dusk = 1.0 - abs(uDay * 2.0 - 1.0);
                    vec3 top = mix(mix(nightTop, dayTop, uDay), duskTop, dusk * 0.6);
                    vec3 low = mix(mix(nightLow, dayLow, uDay), duskLow, dusk * 0.8);
                    vec3 col = mix(low, top, smoothstep(0.0, 1.0, vUv.y));
                    // overcast greys everything out
                    col = mix(col, vec3(0.45, 0.47, 0.52) * (0.25 + uDay * 0.8), uCloud * 0.7);

                    // stars twinkle at night
                    vec2 sp = vUv * vec2(260.0, 130.0);
                    float s = step(0.996, hash(floor(sp))) * (0.6 + 0.4 * sin(uTime * 0.003 + hash(floor(sp)) * 40.0));
                    col += s * (1.0 - uDay) * (1.0 - uCloud) * smoothstep(0.25, 0.6, vUv.y);

                    // sun by day, moon by night
                    float d = distance(vUv * vec2(2.0, 1.0), uSun * vec2(2.0, 1.0));
                    vec3 body = uDay > 0.5 ? vec3(1.0, 0.92, 0.7) : vec3(0.95, 0.95, 0.85);
                    col += body * (smoothstep(0.035, 0.03, d) + 0.25 * smoothstep(0.2, 0.0, d)) * (1.0 - uCloud * 0.85);

                    // drifting clouds
                    float c = fbm(vUv * vec2(3.0, 6.0) + vec2(uTime * 0.000012, 0.0));
                    float cover = smoothstep(0.75 - uCloud * 0.5, 1.0, c) * smoothstep(0.15, 0.5, vUv.y);
                    vec3 cloudCol = mix(vec3(0.15, 0.13, 0.2), vec3(0.95), uDay) * (1.0 - uCloud * 0.35);
                    col = mix(col, cloudCol, cover);

                    col += vec3(0.8, 0.85, 1.0) * uFlash;
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
        });
        const sky = new THREE.Mesh(new THREE.PlaneGeometry(60000, 26000), this.sky);
        sky.rotation.y = Math.PI / 2;
        sky.position.set(OUT_X - 16000, FLOOR_Y + 9000, WINDOW.z);
        this.group.add(sky);

        // ground running out to the trees
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(16000, 40000), mat.std('#1d2a17', 1));
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(OUT_X - 8000, FLOOR_Y - 600, WINDOW.z);
        this.group.add(ground);
    }

    setTrees() {
        // three tree lines, further ones paler and bigger, swaying a little
        const depths = [
            { x: 2500, scale: 0.55, color: '#16301a', sway: 0.012 },
            { x: 6000, scale: 1.1, color: '#1f3d25', sway: 0.008 },
            { x: 11000, scale: 1.8, color: '#2a4a33', sway: 0.005 },
        ];
        depths.forEach((d, k) => {
            const tex = canvasTexture(1024, 256, (ctx, w, h) => {
                ctx.fillStyle = '#ffffff';
                for (let x = -20; x < w + 20; x += range(14, 30)) {
                    const th = range(0.45, 0.95) * h;
                    const tw = range(18, 34);
                    ctx.beginPath();
                    // pine: stacked triangles
                    for (let t = 0; t < 4; t++) {
                        const y = h - th + (t * th) / 4.5;
                        ctx.moveTo(x, y);
                        ctx.lineTo(x - tw * (0.5 + t * 0.25), y + th / 3);
                        ctx.lineTo(x + tw * (0.5 + t * 0.25), y + th / 3);
                    }
                    ctx.fill();
                    ctx.fillRect(x - 2, h - 20, 4, 20);
                }
                ctx.fillRect(0, h - 14, w, 14);
            });
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(14000 * d.scale, 3500 * d.scale),
                new THREE.MeshBasicMaterial({ map: tex, color: d.color, transparent: true, alphaTest: 0.3 })
            );
            // anchor the bottom so swaying bends the tops
            mesh.geometry.translate(0, 1750 * d.scale, 0);
            mesh.rotation.y = Math.PI / 2;
            mesh.position.set(OUT_X - d.x, FLOOR_Y - 600, WINDOW.z + range(-800, 800));
            this.group.add(mesh);
            this.layers.push({ mesh, sway: d.sway, phase: k * 1.7, base: new THREE.Color(d.color) });
        });
    }

    setPrecip() {
        const count = 900;
        const pos = new Float32Array(count * 3);
        this.precipVel = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = OUT_X - range(300, 5000);
            pos[i * 3 + 1] = range(FLOOR_Y - 600, ROOM.ceiling + 2000);
            pos[i * 3 + 2] = WINDOW.z + range(-5000, 5000);
            this.precipVel[i] = range(0.7, 1.3);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.precip = new THREE.Points(
            geo,
            new THREE.PointsMaterial({ color: '#cfe0ff', size: 40, transparent: true, opacity: 0.7, depthWrite: false })
        );
        this.precip.visible = false;
        this.group.add(this.precip);
    }

    setFireflies() {
        const count = 40;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = OUT_X - range(600, 4000);
            pos[i * 3 + 1] = FLOOR_Y + range(-400, 2500);
            pos[i * 3 + 2] = WINDOW.z + range(-4000, 4000);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.flies = new THREE.Points(
            geo,
            new THREE.PointsMaterial({ color: '#d8ff6a', size: 70, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        this.group.add(this.flies);
    }

    setWindowLight() {
        this.window = new THREE.SpotLight('#9fb4ff', 0.5, 15000, 0.7, 0.8, 1.2);
        this.window.position.set(OUT_X - 600, WINDOW.y + 600, WINDOW.z);
        this.window.target.position.set(OUT_X + 6000, FLOOR_Y, WINDOW.z + 1500);
        this.scene.add(this.window, this.window.target);
    }

    /* ---------------------------------------------------------------- clock */

    setClock() {
        const g = new THREE.Group();
        g.position.set(0, 3900, ROOM.back + 60);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(560, 560, 60, 48), mat.std('#1a1a1d', 0.4, 0.6));
        rim.rotation.x = Math.PI / 2;
        g.add(rim);
        const dial = new THREE.Mesh(
            new THREE.CircleGeometry(520, 48),
            new THREE.MeshStandardMaterial({
                map: canvasTexture(256, 256, (ctx, w, h) => {
                    ctx.fillStyle = '#f4efe2';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#1b1510';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = 'bold 26px Georgia, serif';
                    for (let i = 1; i <= 12; i++) {
                        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                        ctx.fillText(String(i), w / 2 + Math.cos(a) * 100, h / 2 + Math.sin(a) * 100);
                    }
                    ctx.font = 'bold 12px Arial, sans-serif';
                    ctx.fillText('LEWISTON, ME', w / 2, h * 0.68);
                }),
                roughness: 0.4,
            })
        );
        dial.position.z = 32;
        g.add(dial);
        const hand = (len: number, width: number, color: string, z: number) => {
            const pivot = new THREE.Object3D();
            pivot.position.z = z;
            const m = new THREE.Mesh(new THREE.BoxGeometry(width, len, 12), mat.glow(color));
            m.position.y = len / 2 - 40;
            pivot.add(m);
            g.add(pivot);
            return pivot;
        };
        this.clockHands = { h: hand(300, 40, '#1b1510', 50), m: hand(440, 26, '#1b1510', 64), s: hand(480, 8, '#c4161c', 78) };
        const pin = new THREE.Mesh(new THREE.CylinderGeometry(30, 30, 40, 16), mat.std('#c9a23a', 0.3, 0.9));
        pin.rotation.x = Math.PI / 2;
        pin.position.z = 90;
        g.add(pin);

        // weather readout under the clock
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 96;
        const tex = new THREE.CanvasTexture(canvas);
        tex.encoding = THREE.sRGBEncoding;
        this.readout = { ctx: canvas.getContext('2d') as CanvasRenderingContext2D, tex };
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(1600, 300), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
        plate.position.set(0, -800, 10);
        g.add(plate);
        this.scene.add(inspectable(shadows(g, true, false), new THREE.Vector3(0, -0.1, 1)));
        this.drawReadout();
    }

    drawReadout() {
        if (!this.readout) return;
        const { ctx, tex } = this.readout;
        const { width: w, height: h } = ctx.canvas;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(10, 6, 20, 0.75)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#e8dcff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 34px Arial, sans-serif';
        const temp = this.weather.temp !== null ? `${this.weather.temp}°F · ` : '';
        ctx.fillText(`${temp}${this.weather.text}`, w / 2, 44, w - 30);
        ctx.font = '20px Arial, sans-serif';
        ctx.fillText('outside in Lewiston, Maine', w / 2, 78);
        tex.needsUpdate = true;
    }

    /* --------------------------------------------------------------- update */

    update() {
        const t = this.application.time.elapsed;
        const dt = Math.min(this.application.time.delta, 50) / 1000;
        const cam = this.application.camera.instance.position;
        this.group.visible = cam.x > ROOM.left && cam.x < ROOM.right && cam.z > ROOM.back && cam.z < ROOM.front;
        const hours = this.localHours();
        const day = this.daylight(hours);
        const w = this.weather.kind;
        const cloud = { clear: 0.15, cloudy: 0.75, rain: 0.9, snow: 0.85, storm: 1, fog: 0.95 }[w];

        // sun/moon arc across the window over the day (or night)
        const { rise, set } = this.sunTimes();
        const k = day > 0 ? (hours - rise) / (set - rise) : ((hours - set + 24) % 24) / (24 - (set - rise));
        this.sky.uniforms.uTime.value = t;
        this.sky.uniforms.uDay.value = day;
        this.sky.uniforms.uCloud.value += (cloud - this.sky.uniforms.uCloud.value) * dt;
        (this.sky.uniforms.uSun.value as THREE.Vector2).set(0.15 + k * 0.7, 0.35 + Math.sin(Math.PI * THREE.MathUtils.clamp(k, 0, 1)) * 0.45);

        // lightning in storms
        if (w === 'storm' && Math.random() < dt * 0.15) this.flash = 1;
        this.flash = Math.max(0, this.flash - dt * 3);
        this.sky.uniforms.uFlash.value = this.flash * (Math.random() > 0.3 ? 1 : 0.3);

        // trees take the light of the sky and sway in the wind
        const windy = w === 'storm' ? 3 : w === 'rain' || w === 'snow' ? 1.8 : 1;
        for (const l of this.layers) {
            l.mesh.rotation.z = Math.sin(t * 0.0006 * windy + l.phase) * l.sway * windy;
            const m = l.mesh.material as THREE.MeshBasicMaterial;
            // dark silhouettes at night, green by day, washed out in fog
            m.color.copy(l.base).multiplyScalar(0.2 + day * 1.9);
            if (w === 'fog') m.color.lerp(new THREE.Color('#8a8f99'), 0.5);
        }

        // rain or snow falling past the window
        const falling = w === 'rain' || w === 'storm' || w === 'snow';
        this.precip.visible = falling;
        if (falling) {
            const snow = w === 'snow';
            const material = this.precip.material as THREE.PointsMaterial;
            material.size = snow ? 60 : 30;
            material.color.set(snow ? '#ffffff' : '#9fb8ff');
            const pos = this.precip.geometry.attributes.position as THREE.BufferAttribute;
            const speed = snow ? 900 : 7000;
            for (let i = 0; i < pos.count; i++) {
                let y = pos.getY(i) - speed * this.precipVel[i] * dt;
                if (y < FLOOR_Y - 600) y = ROOM.ceiling + 2000;
                pos.setY(i, y);
                if (snow) pos.setZ(i, pos.getZ(i) + Math.sin(t * 0.001 + i) * 6);
            }
            pos.needsUpdate = true;
        }

        // fireflies on clear, warm nights
        const warm = this.weather.temp === null || this.weather.temp > 55;
        this.flies.visible = day < 0.3 && warm && !falling;
        if (this.flies.visible) {
            const pos = this.flies.geometry.attributes.position as THREE.BufferAttribute;
            for (let i = 0; i < pos.count; i++) {
                pos.setY(i, pos.getY(i) + Math.sin(t * 0.0015 + i * 3) * 4);
                pos.setZ(i, pos.getZ(i) + Math.cos(t * 0.001 + i) * 5);
            }
            pos.needsUpdate = true;
            (this.flies.material as THREE.PointsMaterial).opacity = 0.5 + 0.5 * Math.sin(t * 0.004);
        }

        // light through the window: moonlight at night, warm sun by day, dimmer when overcast
        this.window.color.set(day > 0.5 ? '#ffe2b8' : '#9fb4ff');
        this.window.intensity = (0.4 + day * 1.2) * (1 - cloud * 0.5) + this.flash * 2;

        // clock hands, once a second
        const second = Math.floor(hours * 3600);
        if (second !== this.lastSecond) {
            this.lastSecond = second;
            const s = second % 60;
            const m = (hours * 60) % 60;
            const h = hours % 12;
            this.clockHands.s.rotation.z = -(s / 60) * Math.PI * 2;
            this.clockHands.m.rotation.z = -(m / 60) * Math.PI * 2;
            this.clockHands.h.rotation.z = -(h / 12) * Math.PI * 2;
        }
    }
}
