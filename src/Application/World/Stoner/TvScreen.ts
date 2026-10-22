import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import Application from '../../Application';

export type Clip = { url?: string; id?: string; secs: number; title: string; show?: string; artist?: string };
export type Media =
    | { kind: 'video'; list: Clip[]; label: (c: Clip) => string } // archive.org files
    | { kind: 'youtube'; list: Clip[]; label: (c: Clip) => string }
    | { kind: 'iframe'; url: string; label: string };

/** A schedule of clips that has been playing since midnight: where are we now? (like the NewsStand TV) */
export function nowIn(list: Clip[]) {
    const now = new Date();
    const total = list.reduce((a, c) => a + c.secs, 0);
    let t = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % Math.max(1, total);
    let i = 0;
    while (list.length && t > list[i].secs) {
        t -= list[i].secs;
        i = (i + 1) % list.length;
    }
    return { i, t };
}

/**
 * The real-browser layer on the TV: video channels, YouTube channels,
 * Jellyfin and the PS5's emulator play in DOM elements placed over the screen
 * with CSS3D (like the PC's monitor), seen through a cutout in the WebGL scene.
 */
export default class TvScreen {
    application: Application;
    css: CSS3DObject;
    hole: THREE.Mesh;
    holder: HTMLDivElement;
    lowerThird: HTMLDivElement;
    bannerEl: HTMLDivElement;
    emulator: HTMLIFrameElement;
    media: HTMLVideoElement | HTMLIFrameElement | null = null;
    youtube = false;
    timer: number | undefined;
    loud = false; // at the couch
    muted = false; // the remote's mute button
    volume = 0.7;
    bannerUntil = 0;

    constructor(center: THREE.Vector3, width: number, height: number) {
        this.application = new Application();
        const pxW = 1600;
        const pxH = Math.round((pxW * height) / width);

        const div = document.createElement('div');
        div.style.cssText = `width:${pxW}px;height:${pxH}px;background:#000;position:relative;overflow:hidden;`;
        this.holder = document.createElement('div');
        this.holder.style.cssText = 'position:absolute;inset:0;';
        this.emulator = document.createElement('iframe');
        this.emulator.title = 'CAK3D Station';
        // the ROM library and Jellyfin live on the tailnet: Chrome asks before a public site reaches them
        this.emulator.allow = 'autoplay; gamepad; fullscreen; local-network-access';
        this.emulator.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:none;';
        this.lowerThird = document.createElement('div');
        this.lowerThird.style.cssText =
            'position:absolute;left:40px;bottom:40px;padding:10px 18px;background:rgba(0,0,0,.65);color:#fff;font:bold 30px Arial,sans-serif;display:none;';
        this.bannerEl = document.createElement('div');
        this.bannerEl.style.cssText =
            'position:absolute;left:30px;top:30px;padding:8px 16px;background:rgba(0,0,0,.6);color:#5bff8a;font:bold 40px "Courier New",monospace;display:none;';
        div.append(this.holder, this.emulator, this.lowerThird, this.bannerEl);

        this.css = new CSS3DObject(div);
        this.css.position.copy(center);
        this.css.rotation.y = Math.PI;
        this.css.scale.setScalar(width / pxW);
        this.css.visible = false;
        this.application.cssScene.add(this.css);

        // black + alpha 0: a white see-through plane would composite as white
        this.hole = new THREE.Mesh(
            new THREE.PlaneGeometry(width, height),
            new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0, transparent: true, blending: THREE.NoBlending, side: THREE.DoubleSide })
        );
        this.hole.position.copy(center);
        this.hole.rotation.y = Math.PI;
        this.hole.visible = false;
        this.application.scene.add(this.hole);
    }

    get active() {
        return this.css.visible;
    }

    private setVisible(on: boolean) {
        this.css.visible = on;
        (this.css.element as HTMLElement).style.display = on ? 'block' : 'none';
        this.hole.visible = on;
    }

    /** Stop whatever is playing and go back to the WebGL screen */
    clear() {
        window.clearTimeout(this.timer);
        if (this.media instanceof HTMLVideoElement) {
            this.media.pause();
            this.media.removeAttribute('src');
            this.media.load();
        }
        this.holder.innerHTML = '';
        this.media = null;
        this.youtube = false;
        this.lowerThird.style.display = 'none';
        if (this.emulator.style.display === 'none') this.setVisible(false);
    }

    play(media: Media) {
        this.clear();
        this.emulator.style.display = 'none';
        this.setVisible(true);
        if (media.kind === 'iframe') {
            const f = document.createElement('iframe');
            f.src = media.url;
            f.allow = 'autoplay; fullscreen; encrypted-media; local-network-access';
            f.style.cssText = 'width:100%;height:100%;border:0;background:#000;';
            this.holder.appendChild(f);
            this.media = f;
            this.caption(media.label);
            return;
        }
        if (!media.list.length) return this.caption('NO SIGNAL');
        const at = nowIn(media.list);
        this.playClip(media, at.i, at.t);
    }

    private playClip(media: Media & { list: Clip[] }, i: number, offset: number) {
        const clip = media.list[i % media.list.length];
        this.holder.innerHTML = '';
        const next = () => this.playClip(media, i + 1, 0);
        if (media.kind === 'video' && clip.url) {
            const v = document.createElement('video');
            v.autoplay = true;
            v.playsInline = true;
            v.muted = !this.audible;
            v.volume = this.volume;
            v.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;';
            v.src = clip.url;
            v.addEventListener('loadedmetadata', () => {
                if (offset > 1) v.currentTime = Math.min(offset, v.duration - 2);
            });
            v.addEventListener('ended', next);
            v.addEventListener('error', () => (this.timer = window.setTimeout(next, 1500)));
            v.play().catch(() => {});
            this.holder.appendChild(v);
            this.media = v;
            this.youtube = false;
        } else if (clip.id) {
            const f = document.createElement('iframe');
            f.addEventListener('load', () => this.applySound());
            const params = `autoplay=1&mute=${this.audible ? 0 : 1}&start=${Math.floor(offset)}&controls=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
            f.src = `https://www.youtube-nocookie.com/embed/${clip.id}?${params}`;
            f.allow = 'autoplay; encrypted-media';
            f.style.cssText = 'width:100%;height:100%;border:0;pointer-events:none;';
            this.holder.appendChild(f);
            this.media = f;
            this.youtube = true;
            // YouTube doesn't tell us when it ends without its API; we know the length
            this.timer = window.setTimeout(next, Math.max(5, clip.secs - offset) * 1000);
        }
        this.caption((media.label as (c: Clip) => string)(clip));
    }

    private caption(text: string) {
        this.lowerThird.textContent = text;
        this.lowerThird.style.display = text ? 'block' : 'none';
        window.setTimeout(() => {
            if (this.lowerThird.textContent === text) this.lowerThird.style.display = 'none';
        }, 12000);
    }

    /** A title card on the TV (no signal, setup help...) */
    notice(title: string, lines: string[]) {
        this.clear();
        this.emulator.style.display = 'none';
        this.setVisible(true);
        const card = document.createElement('div');
        card.style.cssText =
            'width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#0b1020;color:#e8ecff;font:30px Arial,sans-serif;text-align:center;padding:60px;box-sizing:border-box;';
        const h = document.createElement('div');
        h.style.cssText = 'font:bold 56px Arial,sans-serif;color:#aa5cc3;';
        h.textContent = title;
        card.appendChild(h);
        for (const line of lines) {
            // links can be clicked (the TV is a real browser layer)
            const p = document.createElement(line.startsWith('http') ? 'a' : 'div');
            if (p instanceof HTMLAnchorElement) {
                p.href = line;
                p.target = '_blank';
                p.rel = 'noopener';
            }
            p.textContent = line;
            if (line.startsWith('tailscale') || line.startsWith('http')) p.style.cssText = 'font:26px "Courier New",monospace;background:#000;padding:8px 14px;color:#5bd1ff;';
            card.appendChild(p);
        }
        this.holder.appendChild(card);
    }

    banner(text: string) {
        this.bannerEl.textContent = text;
        this.bannerEl.style.display = 'block';
        this.bannerUntil = performance.now() + 2500;
    }

    /** The PS5's emulator takes over the screen (kept alive so games survive channel flips) */
    showGame(on: boolean) {
        if (on) {
            this.clear();
            if (!this.emulator.src) this.emulator.src = 'emulator/index.html';
            this.emulator.style.display = 'block';
            this.setVisible(true);
        } else {
            this.emulator.style.display = 'none';
            this.setVisible(false);
        }
    }

    get audible() {
        return this.loud && !this.muted && this.volume > 0;
    }

    /** Sound only while you're at the couch */
    setLoud(loud: boolean) {
        if (loud === this.loud) return;
        this.loud = loud;
        this.applySound();
    }

    setVolume(volume: number) {
        this.volume = THREE.MathUtils.clamp(volume, 0, 1);
        this.muted = false;
        this.applySound();
        this.banner(`VOL ${'▮'.repeat(Math.round(this.volume * 10)).padEnd(10, '▯')}`);
    }

    toggleMute() {
        this.muted = !this.muted;
        this.applySound();
        this.banner(this.muted ? 'MUTE' : `VOL ${'▮'.repeat(Math.round(this.volume * 10)).padEnd(10, '▯')}`);
    }

    applySound() {
        if (this.media instanceof HTMLVideoElement) {
            this.media.muted = !this.audible;
            this.media.volume = this.volume;
        } else if (this.media && this.youtube && this.media.contentWindow) {
            const send = (func: string, args: any = '') => (this.media as HTMLIFrameElement).contentWindow!.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
            send(this.audible ? 'unMute' : 'mute');
            send('setVolume', [Math.round(this.volume * 100)]);
        }
    }

    update() {
        if (this.bannerEl.style.display !== 'none' && performance.now() > this.bannerUntil) this.bannerEl.style.display = 'none';
    }
}
