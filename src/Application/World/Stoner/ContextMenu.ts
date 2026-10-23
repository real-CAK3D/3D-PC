import * as THREE from 'three';
import Application from '../../Application';

/**
 * One line in a right-click menu: `run` does something, `say` shows a little
 * quip (one at random if it's a list), or both.
 */
export type MenuItem = { label: string; run?: () => void; say?: string | string[] };
export type MenuSource = MenuItem[] | (() => MenuItem[]);

/** Give an object (and everything inside it) a right-click menu */
export function menu<T extends THREE.Object3D>(obj: T, items: MenuSource): T {
    obj.userData.menu = items;
    return obj;
}

const CSS = `
#cak3d-menu { position: fixed; z-index: 100000; min-width: 190px; padding: 6px; background: rgba(18, 10, 30, 0.94);
  border: 1px solid #7a3fd1; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.5), 0 0 18px rgba(122,63,209,.35);
  font: 14px/1.2 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #f1e8ff; user-select: none; }
#cak3d-menu .t { padding: 4px 10px 6px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #9be69b; }
#cak3d-menu button { display: block; width: 100%; text-align: left; padding: 8px 10px; border: 0; border-radius: 6px;
  background: none; color: inherit; font: inherit; cursor: pointer; }
#cak3d-menu button:hover, #cak3d-menu button:focus { background: #5b2a86; outline: none; }
#cak3d-quip { position: fixed; z-index: 100000; max-width: 300px; padding: 10px 14px; background: rgba(18, 10, 30, 0.94);
  border: 1px solid #5bd16a; border-radius: 10px; color: #eaffea; font: 14px/1.35 system-ui, sans-serif;
  pointer-events: none; transition: opacity .3s; }
`;

/**
 * Right-click (without dragging: a right-drag spins the room) on anything
 * that has `userData.menu`, or on any of its parents, for a menu of options.
 * Things you can look at but that have no menu of their own get "Look closer".
 */
export default class ContextMenu {
    application: Application;
    el: HTMLDivElement | null = null;
    quip: HTMLDivElement | null = null;
    quipTimer: number | undefined;
    down = { x: 0, y: 0 };

    constructor() {
        this.application = new Application();
        const style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);
        document.addEventListener('mousedown', (e) => {
            if (e.button === 2) this.down = { x: e.clientX, y: e.clientY };
            const t = e.target as HTMLElement | null;
            if (this.el && !(t && t.closest && t.closest('#cak3d-menu'))) this.close();
        });
        document.addEventListener('contextmenu', (e) => this.open(e));
        document.addEventListener('keydown', (e) => e.key === 'Escape' && this.close());
        window.addEventListener('resize', () => this.close());
    }

    itemsFor(hit: THREE.Object3D): { title: string; items: MenuItem[] } | null {
        for (let o: THREE.Object3D | null = hit; o; o = o.parent) {
            const source = o.userData.menu as MenuSource | undefined;
            if (source) return { title: o.userData.menuTitle || o.name || '', items: typeof source === 'function' ? source() : source };
        }
        const stash = this.application.world.deskStash;
        const target = hit.userData.inspectGroup || hit;
        if (hit.userData.inspect && stash) return { title: '', items: [{ label: 'Look closer', run: () => stash.inspect(target) }] };
        return null;
    }

    open(e: MouseEvent) {
        // @ts-ignore
        if (e.inComputer || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6) return;
        const stash = this.application.world.deskStash;
        const hit = stash && stash.pick(e);
        const found = hit && this.itemsFor(hit);
        this.close();
        if (!found || !found.items.length) return;

        const el = document.createElement('div');
        el.id = 'cak3d-menu';
        // the camera's click handler skips anything inside #prevent-click
        const inner = document.createElement('div');
        inner.id = 'prevent-click';
        if (found.title) {
            const t = document.createElement('div');
            t.className = 't';
            t.textContent = found.title;
            inner.appendChild(t);
        }
        for (const item of found.items) {
            const b = document.createElement('button');
            b.textContent = item.label;
            b.addEventListener('mousedown', (ev) => ev.stopPropagation());
            b.addEventListener('click', () => {
                this.close();
                if (item.run) item.run();
                if (item.say) this.say(Array.isArray(item.say) ? item.say[Math.floor(Math.random() * item.say.length)] : item.say, e.clientX, e.clientY);
            });
            inner.appendChild(b);
        }
        el.appendChild(inner);
        document.body.appendChild(el);
        // keep it on screen
        const r = el.getBoundingClientRect();
        el.style.left = `${Math.min(e.clientX, window.innerWidth - r.width - 8)}px`;
        el.style.top = `${Math.min(e.clientY, window.innerHeight - r.height - 8)}px`;
        (el.querySelector('button') as HTMLButtonElement).focus();
        this.el = el;
    }

    close() {
        if (this.el) this.el.remove();
        this.el = null;
    }

    /** A little speech bubble near where you clicked */
    say(text: string, x: number, y: number) {
        if (!this.quip) {
            this.quip = document.createElement('div');
            this.quip.id = 'cak3d-quip';
            document.body.appendChild(this.quip);
        }
        const q = this.quip;
        q.textContent = text;
        q.style.opacity = '1';
        q.style.left = `${Math.min(x + 12, window.innerWidth - 320)}px`;
        q.style.top = `${Math.max(8, y - 50)}px`;
        window.clearTimeout(this.quipTimer);
        this.quipTimer = window.setTimeout(() => (q.style.opacity = '0'), 2800);
    }
}
