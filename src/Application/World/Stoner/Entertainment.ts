import * as THREE from 'three';
import Application from '../../Application';
import { CameraKey } from '../../Camera/Camera';
import UIEventBus from '../../UI/EventBus';
import { canvasTexture, CM, FLOOR_Y, inspectable, mat, RoundedBoxGeometry, shadows, woodTexture } from './props';
import { papers } from './papers';
import BezierEasing from 'bezier-easing';
import TvScreen, { Clip, Media } from './TvScreen';
import { buildController } from './controller';

const ZOOM_EASE = BezierEasing(0.13, 0.99, 0, 1);

// The TV wall faces the couch from the front of the room
export const TV_SPOT = { x: -7800, z: 10200 };
// the camera spots that count as "at the TV" (clicks there act instead of flying over)
export const TV_VIEWS = [CameraKey.TV, CameraKey.TV_SCREEN, CameraKey.STEREO];
export const STAND = { width: 5200, depth: 1300, height: 1450 };
export const SCREEN = { w: 4300, h: 2420 };

// Jellyfin on the nukebox, shared on the tailnet with:
//   tailscale serve --bg --https=8096 http://127.0.0.1:8096
export const JELLYFIN_URL = 'https://nukebox.tailac984b.ts.net:8096/web/';

type Channel = {
    name: string;
    draw?: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void; // drawn on the WebGL screen
    media?: () => Media; // played in the browser layer (TvScreen)
};
type TvData = { [list: string]: any[] };

/**
 * The couch's view: a TV with NewsStand-style channels, a PS5 that boots an
 * emulator for your own ROMs, and a stereo that plays whatever Spotify is
 * playing on the PC. Click the TV to flip channels.
 */
export default class Entertainment {
    application: Application;
    scene: THREE.Scene;
    screenCanvas: HTMLCanvasElement;
    screenCtx: CanvasRenderingContext2D;
    screenTex: THREE.CanvasTexture;
    channels: Channel[];
    channel = 2; // Toon Town
    banner = 0; // ms left to show the channel banner
    lastDraw = 0;
    speakerCones: THREE.Mesh[] = [];
    receiverTex: THREE.CanvasTexture;
    receiverCtx: CanvasRenderingContext2D;
    playing = false;
    nowPlaying = '';
    stationOpen = false;
    noise: ImageData;
    screen: THREE.Mesh;
    tv: TvScreen;
    data: TvData = {};
    tvOn = true;
    digits = '';
    digitTimer: number | undefined;

    constructor() {
        this.application = new Application();
        this.scene = this.application.scene;

        this.channels = this.makeChannels();
        // the NewsStand TV's lineup (cartoons, ads, movies, YouTube shows), bundled with the site
        fetch('tv.json')
            .then((r) => r.json())
            .then((d) => {
                this.data = d;
                this.tune(this.channel);
            })
            .catch(() => {});
        this.buildStand();
        this.buildTv();
        this.buildSpeakers();
        this.buildReceiver();
        this.buildPs5();
        this.buildRemote();

        // the stereo follows the Spotify window on the PC
        window.addEventListener('message', (event) => {
            if (!event.data || event.data.type !== 'cak3d-stereo') return;
            this.playing = !!event.data.playing;
            this.nowPlaying = event.data.title || '';
        });
        // the radio on the stereo panel, too
        UIEventBus.on('stereoState', (state: { playing: boolean; title: string }) => {
            this.playing = state.playing;
            this.nowPlaying = state.title;
        });
        UIEventBus.on('stereoClosed', () => {
            if (this.view === CameraKey.STEREO) this.application.camera.transition(CameraKey.TV, 1200);
        });
    }

    /** Everything here is a click target that first takes the camera to the couch */
    clickable(obj: THREE.Object3D, onClick: () => void) {
        obj.userData.focus = CameraKey.TV;
        obj.userData.focusViews = TV_VIEWS;
        obj.userData.onClick = onClick;
    }

    get view() {
        const camera = this.application.camera;
        return camera.currentKeyframe || camera.targetKeyframe;
    }

    buildStand() {
        const wood = new THREE.MeshStandardMaterial({ map: woodTexture('#3b2617'), roughness: 0.6 });
        const group = new THREE.Group();
        group.position.set(TV_SPOT.x, FLOOR_Y, TV_SPOT.z);
        const { width: W, depth: D, height: H } = STAND;
        const top = new THREE.Mesh(new THREE.BoxGeometry(W, 120, D), wood);
        top.position.y = H - 60;
        const bottom = new THREE.Mesh(new THREE.BoxGeometry(W, 120, D), wood);
        bottom.position.y = 200;
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(W - 240, 60, D - 100), wood);
        shelf.position.y = H / 2 + 60;
        group.add(top, bottom, shelf);
        for (const sx of [-1, 1]) {
            const side = new THREE.Mesh(new THREE.BoxGeometry(120, H - 140, D), wood);
            side.position.set((sx * (W - 120)) / 2, H / 2, 0);
            group.add(side);
        }
        this.scene.add(shadows(group));
    }

    /** DualSense-style controller with real buttons (GameMode puts it on the coffee table) */
    static controller() {
        return buildController();
    }

    buildTv() {
        this.screenCanvas = document.createElement('canvas');
        this.screenCanvas.width = 640;
        this.screenCanvas.height = 360;
        this.screenCtx = this.screenCanvas.getContext('2d') as CanvasRenderingContext2D;
        this.noise = this.screenCtx.createImageData(160, 90);
        this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
        this.screenTex.encoding = THREE.sRGBEncoding;

        const group = new THREE.Group();
        const y = FLOOR_Y + STAND.height + 120 + SCREEN.h / 2;
        group.position.set(TV_SPOT.x, y, TV_SPOT.z - 150);
        group.rotation.y = Math.PI; // facing the couch (-z)

        const bezel = new THREE.Mesh(new RoundedBoxGeometry(SCREEN.w + 120, SCREEN.h + 120, 120, 2, 40), mat.std('#0c0c0e', 0.3, 0.4));
        group.add(bezel);
        const screen = new THREE.Mesh(
            new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
            new THREE.MeshBasicMaterial({ map: this.screenTex, toneMapped: false })
        );
        screen.position.z = 62;
        group.add(screen);
        this.screen = screen;
        const center = new THREE.Vector3(TV_SPOT.x, y, TV_SPOT.z - 150 - 66);
        this.tv = new TvScreen(center, SCREEN.w, SCREEN.h);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(1400, 60, 500), mat.std('#0c0c0e', 0.3, 0.4));
        foot.position.set(0, -SCREEN.h / 2 - 90, 0);
        const neck = new THREE.Mesh(new THREE.BoxGeometry(200, 120, 80), mat.std('#0c0c0e', 0.3, 0.4));
        neck.position.set(0, -SCREEN.h / 2 - 40, -40);
        group.add(foot, neck);

        // the screen lights the room a little
        const glow = new THREE.PointLight('#8fb4ff', 0.6, 9000, 1.5);
        glow.position.set(0, 0, 900);
        group.add(glow);
        this.scene.add(shadows(group, true, false));

        // first click zooms in on the screen, after that each click flips the channel
        group.userData.tv = true;
        this.clickable(group, () => {
            if (this.view !== CameraKey.TV_SCREEN) {
                this.application.camera.transition(CameraKey.TV_SCREEN, 1600, ZOOM_EASE);
                return;
            }
            this.setPower(true, this.tvOn ? (this.channel + 1) % this.channels.length : this.channel);
        });
    }

    buildSpeakers() {
        const cabinet = new THREE.MeshStandardMaterial({ map: woodTexture('#1f1410'), roughness: 0.7 });
        const grill = mat.std('#111114', 0.9);
        const cone = mat.std('#2a2a2e', 0.6, 0.2);
        for (const sx of [-1, 1]) {
            const g = new THREE.Group();
            g.position.set(TV_SPOT.x + sx * (STAND.width / 2 + 600), FLOOR_Y, TV_SPOT.z);
            const box = new THREE.Mesh(new THREE.BoxGeometry(850, 3300, 900), cabinet);
            box.position.y = 1650;
            g.add(box);
            const face = new THREE.Mesh(new THREE.PlaneGeometry(760, 3150), grill);
            face.rotation.y = Math.PI;
            face.position.set(0, 1650, -451);
            g.add(face);
            [2650, 1800, 900].forEach((h, i) => {
                const r = i === 0 ? 140 : 300;
                const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.7, 80, 32), cone);
                c.rotation.x = Math.PI / 2;
                c.position.set(0, h, -470);
                g.add(c);
                if (i > 0) this.speakerCones.push(c);
            });
            this.scene.add(shadows(g));
            this.clickable(g, () => this.openStereo());
        }
    }

    buildReceiver() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 96;
        this.receiverCtx = canvas.getContext('2d') as CanvasRenderingContext2D;
        this.receiverTex = new THREE.CanvasTexture(canvas);
        this.receiverTex.encoding = THREE.sRGBEncoding;

        const g = new THREE.Group();
        g.position.set(TV_SPOT.x + 600, FLOOR_Y + 260, TV_SPOT.z);
        const body = new THREE.Mesh(new THREE.BoxGeometry(1700, 480, 1000), mat.std('#1a1a1d', 0.4, 0.6));
        body.position.y = 240;
        g.add(body);
        const display = new THREE.Mesh(new THREE.PlaneGeometry(900, 170), new THREE.MeshBasicMaterial({ map: this.receiverTex }));
        display.rotation.y = Math.PI;
        display.position.set(-150, 300, -501);
        g.add(display);
        for (const dx of [520, 720]) {
            const knob = new THREE.Mesh(new THREE.CylinderGeometry(70, 70, 60, 24), mat.std('#c9ccd2', 0.3, 0.9));
            knob.rotation.x = Math.PI / 2;
            knob.position.set(-dx + 1200 - 600, 250, -520);
            g.add(knob);
        }
        this.scene.add(shadows(g));
        this.clickable(g, () => this.openStereo());
    }

    buildPs5() {
        const g = new THREE.Group();
        // lying on its side on the stand's shelf, front facing the couch
        // (the console is built standing up along +y, ~380 thick; roll it onto its side)
        g.position.set(TV_SPOT.x - 700, FLOOR_Y + STAND.height / 2 + 90 + 200, TV_SPOT.z + 60);
        g.rotation.set(0, 0, Math.PI / 2);
        const white = mat.std('#f4f4f6', 0.35);
        const black = mat.std('#101014', 0.3, 0.3);
        // two curved white plates around a black core, standing up
        const core = new THREE.Mesh(new THREE.BoxGeometry(200, 1300, 850), black);
        core.position.y = 650;
        g.add(core);
        for (const sx of [-1, 1]) {
            const shape = new THREE.Shape();
            shape.moveTo(-430, 0);
            shape.lineTo(430, 0);
            shape.quadraticCurveTo(520, 700, 380, 1330);
            shape.lineTo(-380, 1330);
            shape.quadraticCurveTo(-520, 700, -430, 0);
            const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 60, bevelEnabled: false }), white);
            plate.rotation.y = Math.PI / 2;
            plate.position.set(sx * 130 + (sx < 0 ? -60 : 0), 0, 0);
            g.add(plate);
        }
        const light = new THREE.Mesh(new THREE.BoxGeometry(212, 1200, 14), mat.glow('#3d8bff'));
        light.position.set(0, 680, -430);
        g.add(light);
        this.scene.add(shadows(g));
        // power on: the game shows up on the TV (see GameMode)
        this.clickable(g, () => UIEventBus.dispatch('gameMode', { on: true }));
    }

    /** Lean in on the receiver and pull up its station / playlist picker */
    openStereo() {
        this.application.camera.transition(CameraKey.STEREO, 1600, ZOOM_EASE);
        UIEventBus.dispatch('openStereo', {});
    }

    /* ---------------------------------------------------------- channels */

    makeChannels(): Channel[] {
        const crawl = papers.map((p) => `${p.name.toUpperCase()}: ${p.motto}`).join('   ✦   ');
        const stocks = ['GANJA', 'MAPLE', 'CHRON', 'BIG', 'HERBI', 'DISCO', 'CYPHR', 'HOMIE'].map((sym, i) => ({ sym, px: 40 + i * 9, open: 40 + i * 9 }));
        const hist: number[] = [];
        let index = 42069.5;
        const open = index * 0.996;
        for (let i = 0; i < 140; i++) hist.push(open + (index - open) * (i / 139) + Math.sin(i / 9) * 22);

        const drawn: Channel[] = [
            {
                name: 'CAK3D STATION',
                draw: (ctx, w, h, t) => {
                    const g = ctx.createLinearGradient(0, 0, w, h);
                    g.addColorStop(0, '#0a1a4a');
                    g.addColorStop(1, '#000010');
                    ctx.fillStyle = g;
                    ctx.fillRect(0, 0, w, h);
                    ctx.strokeStyle = 'rgba(80,140,255,0.25)';
                    for (let i = 0; i < 12; i++) {
                        ctx.beginPath();
                        ctx.arc(w / 2, h * 1.2, 120 + i * 40 + ((t * 0.03) % 40), Math.PI, 0);
                        ctx.stroke();
                    }
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 44px Arial, sans-serif';
                    ctx.fillText('CAK3D STATION', w / 2, h * 0.42);
                    ctx.font = '22px Arial, sans-serif';
                    ctx.fillText('game on the big screen', w / 2, h * 0.56);
                },
            },
            {
                name: 'STATIC',
                draw: (ctx, w, h) => {
                    const d = this.noise.data;
                    for (let i = 0; i < d.length; i += 4) {
                        const v = (Math.random() * 255) | 0;
                        d[i] = d[i + 1] = d[i + 2] = v;
                        d[i + 3] = 255;
                    }
                    ctx.putImageData(this.noise, 0, 0);
                    ctx.drawImage(ctx.canvas, 0, 0, 160, 90, 0, 0, w, h);
                },
            },
            {
                name: 'OFF THE AIR',
                draw: (ctx, w, h) => {
                    const top = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
                    const low = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
                    top.forEach((c, i) => {
                        ctx.fillStyle = c;
                        ctx.fillRect((i * w) / 7, 0, w / 7 + 1, h * 0.72);
                        ctx.fillStyle = low[i];
                        ctx.fillRect((i * w) / 7, h * 0.72, w / 7 + 1, h * 0.28);
                    });
                    ctx.fillStyle = '#000';
                    ctx.fillRect(w * 0.25, h * 0.36, w * 0.5, h * 0.24);
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 30px "Courier New", monospace';
                    ctx.fillText('THE GARDEN', w / 2, h * 0.47);
                    ctx.font = '16px "Courier New", monospace';
                    ctx.fillText('OFF THE AIR · PLEASE STAND BY', w / 2, h * 0.55);
                },
            },
            {
                name: 'WDWN NEWS',
                draw: (ctx, w, h, t) => {
                    ctx.fillStyle = '#10204a';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#c4161c';
                    ctx.fillRect(0, 0, w, 50);
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'left';
                    ctx.font = 'bold 30px Arial, sans-serif';
                    ctx.fillText('WDWN  NEWS AT SIX', 20, 36);
                    ctx.textAlign = 'right';
                    ctx.font = 'bold 20px Arial, sans-serif';
                    ctx.fillText(Math.floor(t / 600) % 2 ? '● LIVE' : '  LIVE', w - 20, 33);
                    // anchor desk with a story card
                    const heads = this.data.headlines as { tag?: string; title: string; dek?: string }[] | undefined;
                    const p = papers[Math.floor(t / 7000) % papers.length];
                    const h0 = heads && heads.length ? heads[Math.floor(t / 7000) % heads.length] : null;
                    const story = h0
                        ? { color: p.color, when: h0.tag || 'TOP STORY', name: h0.title, motto: h0.dek || '', by: 'WDWN' }
                        : p;
                    ctx.fillStyle = '#f5eedb';
                    ctx.fillRect(40, 80, w - 80, 190);
                    ctx.fillStyle = story.color;
                    ctx.fillRect(40, 80, 14, 190);
                    ctx.fillStyle = '#9c2a1c';
                    ctx.textAlign = 'left';
                    ctx.font = 'bold 16px Arial, sans-serif';
                    ctx.fillText(`TOP STORY · ${story.when.toUpperCase()}`, 74, 112);
                    ctx.fillStyle = '#1b1510';
                    ctx.font = 'bold 40px Georgia, serif';
                    ctx.fillText(story.name, 74, 165, w - 140);
                    ctx.font = 'italic 22px Georgia, serif';
                    ctx.fillText(story.motto, 74, 205, w - 140);
                    ctx.font = '16px Arial, sans-serif';
                    ctx.fillText(`reporting: ${story.by}`, 74, 245);
                    // crawl
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, h - 50, w, 50);
                    ctx.fillStyle = '#ffd23d';
                    ctx.font = 'bold 22px Arial, sans-serif';
                    const width = ctx.measureText(crawl).width + 200;
                    const x = w - ((t * 0.12) % (width + w));
                    ctx.fillText(crawl, x, h - 17);
                },
            },
            {
                name: 'GNBC MARKETS',
                draw: (ctx, w, h, t) => {
                    index *= 1 + (Math.random() - 0.48) * 0.0012;
                    hist.push(index);
                    if (hist.length > 160) hist.shift();
                    stocks.forEach((s) => (s.px *= 1 + (Math.random() - 0.485) * 0.01));
                    ctx.fillStyle = '#05140c';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'left';
                    ctx.font = 'bold 26px Arial, sans-serif';
                    ctx.fillText('GNBC', 20, 36);
                    ctx.font = '16px Arial, sans-serif';
                    ctx.fillText('MARKETS LIVE · GARDEN TOKEN AVERAGE', 100, 34);
                    const up = index >= open;
                    ctx.font = 'bold 46px Arial, sans-serif';
                    ctx.fillText(index.toFixed(2), 20, 100);
                    ctx.fillStyle = up ? '#35e07a' : '#ff4d4d';
                    ctx.font = 'bold 22px Arial, sans-serif';
                    ctx.fillText(`${up ? '▲' : '▼'} ${Math.abs(index - open).toFixed(2)} (${(((index - open) / open) * 100).toFixed(2)}%)`, 20, 130);
                    // chart
                    const mn = Math.min(...hist);
                    const mx = Math.max(...hist);
                    ctx.beginPath();
                    hist.forEach((v, k) => {
                        const x = 20 + (k / (hist.length - 1)) * (w - 40);
                        const y = 280 - ((v - mn) / Math.max(1, mx - mn)) * 130;
                        if (k) ctx.lineTo(x, y);
                        else ctx.moveTo(x, y);
                    });
                    ctx.strokeStyle = up ? '#35e07a' : '#ff4d4d';
                    ctx.lineWidth = 3;
                    ctx.stroke();
                    // tape
                    ctx.fillStyle = '#000';
                    ctx.fillRect(0, h - 44, w, 44);
                    ctx.font = 'bold 20px "Courier New", monospace';
                    const tape = stocks.map((s) => `${s.sym} ${s.px.toFixed(2)} ${s.px >= s.open ? '▲' : '▼'}`).join('    ');
                    const tw = ctx.measureText(tape).width + 100;
                    ctx.fillStyle = '#ffd23d';
                    ctx.fillText(tape, w - ((t * 0.1) % (tw + w)), h - 15);
                },
            },
            {
                name: 'THE FIREPLACE',
                draw: (ctx, w, h, t) => {
                    ctx.fillStyle = '#120804';
                    ctx.fillRect(0, 0, w, h);
                    ctx.fillStyle = '#3a2214';
                    for (let i = 0; i < 6; i++) ctx.fillRect(0, h - 40 - i * 10, w, 4);
                    for (let i = 0; i < 70; i++) {
                        const x = w * 0.2 + ((i * 97) % (w * 0.6));
                        const life = ((t * 0.002 + i * 0.37) % 1);
                        const y = h - 60 - life * h * 0.6;
                        const r = (1 - life) * 46 + 6;
                        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
                        g.addColorStop(0, `rgba(255,${200 - life * 150},60,${0.9 - life * 0.8})`);
                        g.addColorStop(1, 'rgba(255,60,0,0)');
                        ctx.fillStyle = g;
                        ctx.beginPath();
                        ctx.arc(x + Math.sin(t * 0.004 + i) * 10 * life, y, r, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.fillStyle = '#2a170c';
                    ctx.fillRect(w * 0.18, h - 70, w * 0.64, 30);
                },
            },
            {
                name: 'CAK3D FM',
                draw: (ctx, w, h, t) => {
                    ctx.fillStyle = '#0b0412';
                    ctx.fillRect(0, 0, w, h);
                    const bars = 32;
                    for (let i = 0; i < bars; i++) {
                        const level = this.playing
                            ? 0.25 + 0.75 * Math.abs(Math.sin(t * 0.004 * (1 + (i % 5) * 0.3) + i))
                            : 0.04;
                        const bh = level * h * 0.6;
                        ctx.fillStyle = `hsl(${270 + i * 3}, 90%, ${50 + level * 20}%)`;
                        ctx.fillRect(30 + (i * (w - 60)) / bars, h * 0.78 - bh, (w - 60) / bars - 4, bh);
                    }
                    ctx.fillStyle = '#f3e7ff';
                    ctx.textAlign = 'center';
                    ctx.font = 'bold 34px Arial, sans-serif';
                    ctx.fillText('CAK3D FM', w / 2, 52);
                    ctx.font = '20px Arial, sans-serif';
                    ctx.fillText(this.playing ? `♪ ${this.nowPlaying || 'now playing'}` : 'click the stereo to pick a station', w / 2, h - 30, w - 40);
                },
            },
        ];
        return this.lineup(drawn);
    }

    /** NewsStand order: canvas channels drawn here, the rest played for real on the TV */
    lineup(drawn: Channel[]): Channel[] {
        const byName = (n: string) => drawn.find((c) => c.name === n) as Channel;
        const list = (key: string) => (this.data[key] || []) as Clip[];
        const video = (key: string, label: (c: Clip) => string) => (): Media => ({ kind: 'video', list: list(key), label });
        const yt = (key: string, label: (c: Clip) => string) => (): Media => ({ kind: 'youtube', list: list(key), label });
        return [
            byName('STATIC'),
            byName('OFF THE AIR'),
            { name: 'TOON TOWN', media: video('cartoons', (c) => `📺 TOON TOWN · ${c.title}`) },
            byName('WDWN NEWS'),
            { name: 'WEATHER', draw: (ctx, w, h, t) => this.drawWeather(ctx, w, h, t) },
            byName('GNBC MARKETS'),
            { name: 'GARDEN MTV', media: yt('mtv', (c) => `🎵 ${c.artist} · ${c.title}`) },
            { name: 'CHOPPER 7', media: yt('chases', (c) => `🚁 LIVE · ${c.title}`) },
            { name: 'GARDEN KITCHEN', media: yt('kitchen', (c) => `🍳 ${c.show} · ${c.title}`) },
            { name: 'COMMERCIALS', media: video('ads', (c) => `COMMERCIAL BREAK · ${c.title}`) },
            { name: 'THE LATE MOVIE', media: video('movies', (c) => `🎬 THE LATE MOVIE · ${c.title}`) },
            { name: 'THE FIREPLACE', media: yt('fire', () => '') },
            { name: '[ADULT SWIM]', media: yt('aswim', (c) => `${c.show} · ${c.title}`) },
            { name: 'LECTURE HALL', media: yt('lectures', (c) => `${c.show} · ${c.title}`) },
            { name: 'JOE ROGAN', media: yt('jre', (c) => c.title) },
            { name: 'THREE STOOGES', media: video('stooges', (c) => `🥧 THE THREE STOOGES · ${c.title}`) },
            { name: 'ANTIQUES ROADSHOW', media: yt('roadshow', (c) => `Antiques Roadshow · ${c.title}`) },
            byName('CAK3D FM'),
            { name: 'JELLYFIN', media: () => ({ kind: 'iframe', url: JELLYFIN_URL, label: 'JELLYFIN · CAK3D - NUKEBOX' }) },
        ];
    }

    /** TV remote on the coffee table: every button is its own clickable key */
    buildRemote() {
        const g = new THREE.Group();
        g.position.set(-8100, FLOOR_Y + 1400, 2850);
        g.rotation.y = 1.4;
        const body = new THREE.Mesh(new RoundedBoxGeometry(5 * CM, 1.6 * CM, 20 * CM, 2, 0.6 * CM), mat.std('#1a1a1e', 0.45));
        body.position.y = 0.8 * CM;
        g.add(body);
        const top = 1.6 * CM;

        const label = (text: string, bg: string) =>
            canvasTexture(64, 64, (ctx, w, h) => {
                ctx.fillStyle = bg;
                ctx.fillRect(0, 0, w, h);
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold ${text.length > 2 ? 18 : 30}px Arial, sans-serif`;
                ctx.fillText(text, w / 2, h / 2 + 2);
            });
        const button = (text: string, x: number, z: number, onPress: () => void, bg = '#3a3a42', w = 1.3, d = 1.1) => {
            const side = mat.std(bg, 0.5);
            const m = new THREE.Mesh(new THREE.BoxGeometry(w * CM, 0.5 * CM, d * CM), [
                side,
                side,
                new THREE.MeshStandardMaterial({ map: label(text, bg), roughness: 0.5 }),
                side,
                side,
                side,
            ]);
            m.position.set(x * CM, top + 0.1 * CM, z * CM);
            g.add(m);
            this.clickable(m, () => {
                // a little press
                m.position.y = top - 0.05 * CM;
                window.setTimeout(() => (m.position.y = top + 0.1 * CM), 120);
                onPress();
            });
        };

        button('⏻', -1.3, -8, () => this.setPower(!this.tvOn), '#b3202c');
        button('INPUT', 1.3, -8, () => this.cycleInput(), '#3a3a42', 1.8);
        [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((n, i) => button(String(n), ((i % 3) - 1) * 1.5, -5.6 + Math.floor(i / 3) * 1.5, () => this.digit(n)));
        button('MUTE', -1.5, -1.1, () => this.tv.toggleMute(), '#3a3a42', 1.4);
        button('0', 0, -1.1, () => this.digit(0));
        button('VOL+', -1.3, 1.6, () => this.tv.setVolume(this.tv.volume + 0.1), '#2a4a8a', 1.8, 1.6);
        button('VOL-', -1.3, 3.6, () => this.tv.setVolume(this.tv.volume - 0.1), '#2a4a8a', 1.8, 1.6);
        button('CH▲', 1.3, 1.6, () => this.setPower(true, (this.channel + 1) % this.channels.length), '#2a6a3a', 1.8, 1.6);
        button('CH▼', 1.3, 3.6, () => this.setPower(true, (this.channel - 1 + this.channels.length) % this.channels.length), '#2a6a3a', 1.8, 1.6);
        this.scene.add(shadows(g));
    }

    setPower(on: boolean, channel = this.channel) {
        this.tvOn = on;
        if (on) this.tune(channel);
        else {
            this.tv.clear();
            UIEventBus.dispatch('gameMode', { on: false });
        }
    }

    /** Number keys: type a channel number (e.g. 1 then 2 for CH 12) */
    digit(n: number) {
        this.digits = (this.digits + n).slice(-2);
        this.tv.banner(`CH ${this.digits}-`);
        window.clearTimeout(this.digitTimer);
        this.digitTimer = window.setTimeout(() => {
            const index = Number(this.digits) - 2;
            this.digits = '';
            if (index >= 0 && index < this.channels.length) this.setPower(true, index);
        }, 1200);
    }

    /** INPUT cycles TV -> PS5 -> Jellyfin -> TV */
    cycleInput() {
        const game = this.application.world.gameMode;
        const jelly = this.channels.findIndex((c) => c.name === 'JELLYFIN');
        if (game && game.on) {
            game.setOn(false);
            this.setPower(true, jelly);
        } else if (this.channel === jelly) {
            this.setPower(true, 2);
        } else if (game) {
            this.tvOn = true;
            game.setOn(true);
        }
    }

    /** Switch to channel `i`: draw it, or hand it to the browser layer */
    tune(i: number) {
        this.channel = i;
        if (!this.tvOn) return;
        const ch = this.channels[i];
        if (ch.name === 'JELLYFIN') {
            // only worth framing if the server answers; otherwise say how to share it
            this.tv.notice('JELLYFIN', ['Tuning in...']);
            this.tv.banner(`CH ${i + 2}  ${ch.name}`);
            fetch(new URL('../System/Info/Public', JELLYFIN_URL).toString(), { mode: 'no-cors' })
                .then(() => {
                    if (this.channel === i && ch.media) this.tv.play(ch.media());
                })
                .catch(() => {
                    if (this.channel !== i) return;
                    this.tv.notice('JELLYFIN · NO SIGNAL', [
                        "Can't reach the nukebox's Jellyfin. It only works on your Tailscale network.",
                        'Chrome blocks this site from your tailnet until you allow it: click the icon left of the',
                        'address bar → Site settings → Local network access → Allow, then flip back to this channel.',
                        'Or open it in its own tab:',
                        JELLYFIN_URL,
                    ]);
                });
        } else if (ch.media) {
            this.tv.play(ch.media());
            this.tv.banner(`CH ${i + 2}  ${ch.name}`);
        } else {
            this.tv.clear();
            this.banner = 2500;
        }
    }

    drawWeather(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
        const outdoors = this.application.world.outdoors;
        const wx = outdoors ? outdoors.weather : { text: 'Getting the latest...', temp: null };
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1d3f8a');
        g.addColorStop(1, '#0a1838');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffd23d';
        ctx.fillRect(0, 0, w, 48);
        ctx.fillStyle = '#0a1838';
        ctx.textAlign = 'left';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.fillText('THE WEATHER CHANNEL · LOCAL FORECAST', 20, 33);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 34px Arial, sans-serif';
        ctx.fillText('LEWISTON, MAINE', 30, 110);
        ctx.font = 'bold 110px Arial, sans-serif';
        ctx.fillText(wx.temp !== null ? `${wx.temp}°F` : '--', 30, 240);
        ctx.font = '34px Arial, sans-serif';
        ctx.fillText(wx.text, 30, 295, w - 60);
        ctx.textAlign = 'right';
        ctx.font = 'bold 30px "Courier New", monospace';
        ctx.fillText(new Date().toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' }), w - 30, 110);
        void t;
    }

    drawReceiver(t: number) {
        const ctx = this.receiverCtx;
        const { width: w, height: h } = ctx.canvas;
        ctx.fillStyle = '#06141a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#5bd1ff';
        ctx.font = 'bold 30px "Courier New", monospace';
        ctx.textAlign = 'left';
        const label = this.playing ? `♪ ${this.nowPlaying || 'SPOTIFY'}` : 'CAK3D FM  ·  STANDBY';
        const tw = ctx.measureText(label).width;
        const x = tw > w - 140 ? 20 - ((t * 0.08) % (tw + 40)) + 20 : 20;
        ctx.fillText(label, x, 40);
        for (let i = 0; i < 16; i++) {
            const level = this.playing ? Math.abs(Math.sin(t * 0.006 + i * 0.7)) : 0.05;
            ctx.fillStyle = level > 0.75 ? '#ff4d6a' : '#35e07a';
            ctx.fillRect(20 + i * 28, 86 - level * 30, 20, level * 30);
        }
        this.receiverTex.needsUpdate = true;
    }

    update() {
        const t = this.application.time.elapsed;
        const dt = this.application.time.delta;
        // ~20fps is plenty for a TV
        if (t - this.lastDraw > 50) {
            this.lastDraw = t;
            const ctx = this.screenCtx;
            const { width: w, height: h } = this.screenCanvas;
            const ch = this.channels[this.channel];
            ctx.save();
            if (!this.tvOn) {
                ctx.fillStyle = '#050506';
                ctx.fillRect(0, 0, w, h);
            } else if (ch.draw) ch.draw(ctx, w, h, t);
            ctx.restore();
            if (this.banner > 0) {
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(20, 20, 300, 44);
                ctx.fillStyle = '#5bff8a';
                ctx.textAlign = 'left';
                ctx.font = 'bold 24px "Courier New", monospace';
                ctx.fillText(`CH ${this.channel + 2}  ${ch.name}`, 32, 50);
            }
            this.screenTex.needsUpdate = true;
            this.drawReceiver(t);
        }
        this.banner = Math.max(0, this.banner - dt);
        this.tv.setLoud(TV_VIEWS.indexOf(this.view as CameraKey) >= 0);
        this.tv.update();
        // speaker cones thump while music plays
        const thump = this.playing ? 1 + Math.max(0, Math.sin(t * 0.012)) * 0.06 : 1;
        for (const c of this.speakerCones) c.scale.set(thump, 1, thump);
    }
}
