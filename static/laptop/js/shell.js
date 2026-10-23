/* CAK3D OS X: the shell. Window manager, menu bar, dock, Launchpad, Spotlight,
 * Control Center, Notification Center, lock screen and settings.
 * Everything is event driven: nothing animates or polls while the desktop is idle
 * (the clock wakes once a minute). */
(function () {
    'use strict';
    var D = window.CAK3D_DATA;
    var I = window.ICONS;
    var $ = function (sel, root) { return (root || document).querySelector(sel); };

    /* ---------- tiny helpers ---------- */
    function h(tag, props) {
        var el = document.createElement(tag);
        if (props) {
            for (var k in props) {
                var v = props[k];
                if (v == null || v === false) continue;
                if (k === 'class') el.className = v;
                else if (k === 'text') el.textContent = v;
                else if (k === 'html') el.innerHTML = v;
                else if (k === 'style') el.style.cssText = v;
                else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
                else if (k in el && k !== 'list' && k !== 'form' && typeof v !== 'string') el[k] = v;
                else el.setAttribute(k, v === true ? '' : v);
            }
        }
        for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
        return el;
    }
    function append(el, c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
        else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    function icon(name, cls) {
        return h('span', { class: 'ic' + (cls ? ' ' + cls : ''), html: I[name] || I.doc, 'aria-hidden': 'true' });
    }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
    }
    var store = {
        get: function (k, def) {
            try { var v = localStorage.getItem('cak3dosx.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
        },
        set: function (k, v) {
            try { localStorage.setItem('cak3dosx.' + k, JSON.stringify(v)); return true; } catch (e) { return false; }
        }
    };
    var inRoom = (function () { try { return window.parent !== window; } catch (e) { return true; } })();
    function post(msg) {
        if (!inRoom) return false;
        try { window.parent.postMessage(msg, '*'); return true; } catch (e) { return false; }
    }
    var isPhone = function () { return window.innerWidth <= 700; };
    var say = function (text) { var l = $('#live'); l.textContent = ''; setTimeout(function () { l.textContent = text; }, 30); };

    /* ---------- settings ---------- */
    var WALLS = [
        { id: 'garden', name: 'Garden', sub: 'Dynamic Wallpaper', dynamic: true }, { id: 'garden-day', name: 'Garden Day', sub: 'Light' }, { id: 'garden-night', name: 'Garden Night', sub: 'Dark' },
        { id: 'haze', name: 'Purple Haze' }, { id: 'dunes', name: 'Garden Dunes' }, { id: 'leaf', name: 'Green Leaf' },
        { id: 'night', name: 'Night Garden' }, { id: 'sunset', name: 'Sunset' }, { id: 'lava', name: 'Lava Lamp' },
        { id: 'room', name: 'The Room' }, { id: 'solid', name: 'Solid Plum' }
    ];
    // macOS-style system colors, CAK3D purple first
    var ACCENTS = [
        { c: '#8a5cff', n: 'Garden Purple' }, { c: '#ff9500', n: 'Orange' }, { c: '#28b148', n: 'Green' }, { c: '#32ade6', n: 'Cyan' },
        { c: '#007aff', n: 'Blue' }, { c: '#5856d6', n: 'Indigo' }, { c: '#ff2d55', n: 'Pink' }, { c: '#8e8e93', n: 'Graphite' }
    ];
    var defaults = { theme: 'light', accent: '#8a5cff', wall: 'garden', autoTheme: true, animations: true, blur: true, nightShift: false, brightness: 1, dnd: false, volume: 0.8, wifi: true, magnify: true };
    var settings = Object.assign({}, defaults, store.get('settings2', {}));
    var setListeners = [];
    /** the Garden wallpaper is dynamic: the day picture from 7am to 7pm, the night one otherwise */
    function isDaytime() { var hr = new Date().getHours(); return hr >= 7 && hr < 19; }
    function wallIsDark() {
        if (settings.wall === 'garden') return !isDaytime();
        return settings.wall !== 'garden-day';
    }
    function applySettings() {
        var root = document.documentElement;
        if (settings.autoTheme && settings.wall === 'garden') settings.theme = isDaytime() ? 'light' : 'dark';
        root.setAttribute('data-theme', settings.theme === 'dark' ? 'dark' : 'light');
        root.style.setProperty('--accent', settings.accent);
        root.classList.toggle('no-blur', !settings.blur);
        root.classList.toggle('no-anim', settings.animations === false);
        var wallClass = 'wall-' + settings.wall + (settings.wall === 'garden' && isDaytime() ? ' is-day' : '');
        ['#desktop', '#lock'].forEach(function (s) {
            var el = $(s);
            el.className = (el.className.replace(/\bwall-\S+/g, '').replace(/\bis-day\b/g, '').trim() + ' ' + wallClass).trim();
        });
        var shade = $('#shade');
        shade.style.opacity = String(Math.min(0.8, 1 - settings.brightness));
        $('#nightshift').hidden = !settings.nightShift;
        setListeners.forEach(function (f) { try { f(settings); } catch (e) { /* app gone */ } });
    }
    function setSetting(k, v) {
        settings[k] = v;
        // picking a theme by hand turns off "change with the wallpaper"
        if (k === 'theme') settings.autoTheme = false;
        store.set('settings2', settings);
        applySettings();
    }
    function resetSettings() {
        Object.keys(settings).forEach(function (k) { delete settings[k]; });
        Object.assign(settings, defaults);
        store.set('settings2', settings);
        applySettings();
    }

    /* ---------- app registry ---------- */
    var apps = {};
    function register(id, def) { def.id = id; apps[id] = def; }

    /* ---------- window manager ---------- */
    var wins = [];
    var z = 10;
    var active = null;
    var cascade = 0;
    var winSeq = 0;

    function area() {
        var mb = 28, dockSpace = isPhone() ? 0 : 82;
        return { x: 0, y: mb, w: window.innerWidth, h: window.innerHeight - mb - dockSpace };
    }

    function createWindow(app, opts) {
        opts = opts || {};
        var a = area();
        var w = Math.min(opts.w || app.w || 760, a.w - 20);
        var hgt = Math.min(opts.h || app.h || 500, a.h - 16);
        var x = Math.max(4, Math.round((a.w - w) / 2) + cascade * 26 - 52);
        var y = Math.max(a.y + 6, Math.round(a.y + (a.h - hgt) / 2) + cascade * 22 - 30);
        cascade = (cascade + 1) % 5;

        var titleText = h('div', { class: 'ttitle', text: opts.title || app.name });
        var bClose = h('button', { class: 'light close', type: 'button', 'aria-label': 'Close', title: 'Close (Alt+W)', html: '<span aria-hidden="true">×</span>' });
        var bMin = h('button', { class: 'light minb', type: 'button', 'aria-label': 'Minimize', title: 'Minimize (Alt+M)', html: '<span aria-hidden="true">−</span>' });
        var bZoom = h('button', { class: 'light zoomb', type: 'button', 'aria-label': 'Zoom', title: 'Zoom (Alt+Enter)', html: '<span aria-hidden="true">+</span>' });
        var bar = h('div', { class: 'titlebar' }, h('div', { class: 'lights' }, bClose, bMin, bZoom), titleText);
        var body = h('div', { class: 'winbody' });
        var el = h('section', { class: 'win opening app-' + app.id + (app.chrome === 'overlay' ? ' chrome-overlay' : ''), role: 'dialog', 'aria-label': opts.title || app.name, tabindex: '-1' }, bar, body);
        if (app.minW) el.style.minWidth = app.minW + 'px';
        if (app.minH) el.style.minHeight = app.minH + 'px';
        ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (d) { el.appendChild(h('div', { class: 'rs ' + d, 'data-dir': d })); });
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.style.width = w + 'px';
        el.style.height = hgt + 'px';
        el.addEventListener('animationend', function (e) { if (e.target === el) el.classList.remove('opening'); });
        setTimeout(function () { el.classList.remove('opening'); }, 300); // in case animations are throttled

        var win = {
            id: ++winSeq, app: app, appId: app.id, el: el, body: body, title: opts.title || app.name,
            minimized: false, zoomed: false, cleanups: [], menus: null, data: {},
            setTitle: function (t) { win.title = t; titleText.textContent = t; el.setAttribute('aria-label', t); renderDock(); },
            focus: function () { focusWin(win); },
            close: function () { closeWin(win); },
            minimize: function () { minimizeWin(win); },
            restore: function () { restoreWin(win); },
            toggleZoom: function () { toggleZoom(win); },
            onClose: function (f) { win.cleanups.push(f); }
        };
        el.addEventListener('pointerdown', function () { if (active !== win) focusWin(win); }, true);
        el.addEventListener('focusin', function () { if (active !== win) focusWin(win); });
        bClose.addEventListener('click', function (e) { e.stopPropagation(); closeWin(win); });
        bMin.addEventListener('click', function (e) { e.stopPropagation(); minimizeWin(win); });
        bZoom.addEventListener('click', function (e) { e.stopPropagation(); toggleZoom(win); });
        bar.addEventListener('dblclick', function (e) { if (!e.target.closest('.lights')) toggleZoom(win); });
        bar.addEventListener('pointerdown', function (e) { if (!e.target.closest('.lights')) startDrag(win, e); });
        el.querySelectorAll('.rs').forEach(function (r) {
            r.addEventListener('pointerdown', function (e) { startResize(win, e, r.getAttribute('data-dir')); });
        });

        $('#windows').appendChild(el);
        wins.push(win);
        focusWin(win);
        return win;
    }

    function focusWin(win) {
        if (!win) { active = null; wins.forEach(function (w) { w.el.classList.remove('active'); }); updateMenubar(); renderDock(); return; }
        if (win.minimized) restoreWin(win, true);
        active = win;
        win.el.style.zIndex = String(++z);
        wins.forEach(function (w) { w.el.classList.toggle('active', w === win); });
        updateMenubar();
        renderDock();
        if (win.app.onFocus) win.app.onFocus(win);
    }
    function topWin() {
        var best = null;
        wins.forEach(function (w) { if (!w.minimized && (!best || +w.el.style.zIndex > +best.el.style.zIndex)) best = w; });
        return best;
    }
    function closeWin(win) {
        if (win.closing) return;
        win.closing = true;
        win.cleanups.forEach(function (f) { try { f(); } catch (e) { /* ignore */ } });
        var done = function () {
            if (win.el.parentNode) win.el.remove();
            wins = wins.filter(function (w) { return w !== win; });
            if (active === win) focusWin(topWin());
            else renderDock();
        };
        win.el.classList.add('closing');
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
        else { win.el.addEventListener('animationend', done, { once: true }); setTimeout(done, 300); }
        // the iframe stops right away (audio, video)
        win.el.querySelectorAll('iframe,video,audio').forEach(function (m) { try { if (m.pause) m.pause(); m.src = 'about:blank'; } catch (e) { /* ignore */ } });
    }
    function minimizeWin(win) {
        if (win.minimized) return;
        win.minimized = true;
        win.el.classList.add('minimizing');
        var fin = function () {
            win.el.classList.remove('minimizing');
            if (win.minimized) win.el.classList.add('min');
        };
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) fin();
        else { win.el.addEventListener('animationend', fin, { once: true }); setTimeout(fin, 350); }
        if (win.app.onMinimize) win.app.onMinimize(win, true);
        if (active === win) focusWin(topWin());
        else renderDock();
    }
    function restoreWin(win, noFocus) {
        win.minimized = false;
        win.el.classList.remove('min', 'minimizing');
        win.el.classList.add('opening');
        if (win.app.onMinimize) win.app.onMinimize(win, false);
        if (!noFocus) focusWin(win);
    }
    function toggleZoom(win) {
        if (isPhone()) return;
        win.zoomed = !win.zoomed;
        win.el.classList.toggle('zoomed', win.zoomed);
        if (win.app.onResize) win.app.onResize(win);
    }

    function startDrag(win, e) {
        if (e.button !== 0 || isPhone()) return;
        var el = win.el;
        var sx = e.clientX, sy = e.clientY;
        var ox = el.offsetLeft, oy = el.offsetTop;
        var moved = false;
        var bar = e.currentTarget;
        bar.setPointerCapture(e.pointerId);
        var move = function (ev) {
            var dx = ev.clientX - sx, dy = ev.clientY - sy;
            if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
            if (!moved) {
                moved = true;
                document.body.classList.add('dragging');
                if (win.zoomed) {
                    // pull the window out of zoom under the pointer
                    win.zoomed = false;
                    el.classList.remove('zoomed');
                    ox = Math.max(0, ev.clientX - el.offsetWidth / 2);
                    oy = 28;
                    sx = ev.clientX; sy = ev.clientY; dx = 0; dy = 0;
                }
            }
            var nx = Math.min(window.innerWidth - 80, Math.max(80 - el.offsetWidth, ox + dx));
            var ny = Math.min(window.innerHeight - 60, Math.max(28, oy + dy));
            el.style.left = nx + 'px';
            el.style.top = ny + 'px';
        };
        var up = function (ev) {
            bar.removeEventListener('pointermove', move);
            bar.removeEventListener('pointerup', up);
            bar.removeEventListener('pointercancel', up);
            document.body.classList.remove('dragging');
            if (moved && ev.clientY <= 30 && ev.type === 'pointerup') toggleZoom(win); // drag to the menu bar zooms
        };
        bar.addEventListener('pointermove', move);
        bar.addEventListener('pointerup', up);
        bar.addEventListener('pointercancel', up);
    }
    function startResize(win, e, dir) {
        if (e.button !== 0 || isPhone() || win.zoomed) return;
        e.preventDefault();
        e.stopPropagation();
        var el = win.el, r = e.currentTarget;
        var sx = e.clientX, sy = e.clientY;
        var o = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
        var minW = win.app.minW || 240, minH = win.app.minH || 160;
        r.setPointerCapture(e.pointerId);
        document.body.classList.add('dragging');
        var move = function (ev) {
            var dx = ev.clientX - sx, dy = ev.clientY - sy;
            var x = o.x, y = o.y, w = o.w, hh = o.h;
            if (dir.indexOf('e') >= 0) w = Math.max(minW, o.w + dx);
            if (dir.indexOf('s') >= 0) hh = Math.max(minH, o.h + dy);
            if (dir.indexOf('w') >= 0) { w = Math.max(minW, o.w - dx); x = o.x + (o.w - w); }
            if (dir.indexOf('n') >= 0) { hh = Math.max(minH, o.h - dy); y = o.y + (o.h - hh); if (y < 28) { hh -= 28 - y; y = 28; } }
            el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.height = hh + 'px';
        };
        var up = function () {
            r.removeEventListener('pointermove', move);
            r.removeEventListener('pointerup', up);
            r.removeEventListener('pointercancel', up);
            document.body.classList.remove('dragging');
            if (win.app.onResize) win.app.onResize(win);
        };
        r.addEventListener('pointermove', move);
        r.addEventListener('pointerup', up);
        r.addEventListener('pointercancel', up);
    }

    /** open an app (or focus it when it only has one window) */
    function open(id, opts) {
        var app = apps[id];
        if (!app) return null;
        closeOverlays();
        if (app.launch) return app.launch(opts || {});
        if (app.single) {
            var existing = wins.filter(function (w) { return w.appId === id; })[0];
            if (existing) {
                focusWin(existing);
                if (app.reopen) app.reopen(existing, opts || {});
                return existing;
            }
        }
        var win = createWindow(app, opts);
        try { app.open(win, opts || {}); } catch (err) { console.warn('[cak3d-os] ' + id, err); }
        if (active === win) updateMenubar();
        bounce(id);
        return win;
    }
    function windowsOf(id) { return wins.filter(function (w) { return w.appId === id; }); }

    /* ---------- menu bar ---------- */
    var openMenuState = null;
    function closeMenu() {
        if (!openMenuState) return;
        openMenuState.el.remove();
        openMenuState.anchor && openMenuState.anchor.setAttribute('aria-expanded', 'false');
        document.removeEventListener('pointerdown', openMenuState.outside, true);
        openMenuState = null;
    }
    /** items: [{label, kbd, disabled, action}] or '-' */
    function showMenu(items, x, y, anchor, focusFirst) {
        closeMenu();
        var m = h('div', { class: 'menu glass', role: 'menu' });
        items.forEach(function (it) {
            if (it === '-') { m.appendChild(h('hr', { role: 'separator' })); return; }
            m.appendChild(h('button', {
                type: 'button', role: 'menuitem', disabled: !!it.disabled,
                onclick: function () { closeMenu(); if (it.action) it.action(); }
            }, h('span', { text: it.label }), it.kbd ? h('kbd', { text: it.kbd }) : null));
        });
        document.body.appendChild(m);
        var r = m.getBoundingClientRect();
        m.style.left = Math.max(4, Math.min(x, window.innerWidth - r.width - 4)) + 'px';
        m.style.top = Math.max(4, Math.min(y, window.innerHeight - r.height - 4)) + 'px';
        var outside = function (e) { if (!m.contains(e.target) && e.target !== anchor && !(anchor && anchor.contains(e.target))) closeMenu(); };
        document.addEventListener('pointerdown', outside, true);
        m.addEventListener('keydown', function (e) {
            var btns = Array.prototype.slice.call(m.querySelectorAll('button:not(:disabled)'));
            var i = btns.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
            else if (e.key === 'Escape') { e.preventDefault(); var a = anchor; closeMenu(); if (a) a.focus(); }
            else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && anchor && anchor.closest('#menubar')) {
                e.preventDefault();
                var tops = Array.prototype.slice.call(document.querySelectorAll('#leafBtn, #appName, #appMenus .mb-btn'));
                var j = tops.indexOf(anchor);
                var next = tops[(j + (e.key === 'ArrowRight' ? 1 : -1) + tops.length) % tops.length];
                next.click();
                var first = openMenuState && openMenuState.el.querySelector('button:not(:disabled)');
                if (first) first.focus();
            }
        });
        if (anchor) anchor.setAttribute('aria-expanded', 'true');
        openMenuState = { el: m, anchor: anchor, outside: outside };
        if (focusFirst) { var f = m.querySelector('button:not(:disabled)'); if (f) f.focus(); }
        return m;
    }
    function menuFrom(anchor, items, e) {
        if (openMenuState && openMenuState.anchor === anchor) { closeMenu(); return; }
        var r = anchor.getBoundingClientRect();
        showMenu(items, r.left, r.bottom + 2, anchor, e && e.detail === 0);
    }

    function leafItems() {
        return [
            { label: 'About This Laptop', action: function () { open('about'); } },
            '-',
            { label: 'System Settings…', action: function () { open('settings'); } },
            { label: 'Launchpad', kbd: 'Alt L', action: function () { toggleLaunchpad(true); } },
            '-',
            { label: 'Recent Items: Safari', action: function () { open('safari'); } },
            '-',
            { label: 'Force Quit…', action: function () { wins.slice().forEach(closeWin); } },
            '-',
            { label: 'Sleep', action: function () { lock(); } },
            { label: 'Restart…', action: function () { location.reload(); } },
            { label: 'Shut Down…', action: shutDown },
            '-',
            { label: 'Lock Screen', action: function () { lock(); } },
            { label: 'Log Out CAK3D…', action: function () { wins.slice().forEach(closeWin); lock(); } }
        ];
    }
    function appMenus(win) {
        var app = win ? win.app : apps.finder;
        var name = app.name;
        var extra = {};
        // an app's own menus need its window state, which isn't there until the app has opened
        if (win && app.menus) { try { extra = app.menus(win) || {}; } catch (e) { extra = {}; } }
        var mk = function (k, base) { return (extra[k] || []).concat(extra[k] && base.length ? ['-'] : [], base); };
        var list = [];
        list.push({
            label: name, bold: true, items: [
                { label: 'About ' + name, action: function () { open('about', { app: app.id }); } },
                '-',
                { label: 'Settings…', action: function () { open('settings'); } },
                '-',
                { label: 'Hide ' + name, kbd: 'Alt M', disabled: !win, action: function () { windowsOf(app.id).forEach(minimizeWin); } },
                { label: 'Quit ' + name, disabled: !win, action: function () { windowsOf(app.id).forEach(closeWin); } }
            ]
        });
        list.push({
            label: 'File', items: mk('File', [
                { label: 'New Window', disabled: !!app.single, action: function () { open(app.id); } },
                { label: 'Close Window', kbd: 'Alt W', disabled: !win, action: function () { if (win) closeWin(win); } }
            ])
        });
        list.push({
            label: 'Edit', items: mk('Edit', [
                { label: 'Copy', action: function () { copySelection(); } },
                { label: 'Select All', action: function () { var a = document.activeElement; if (a && a.select) a.select(); } }
            ])
        });
        list.push({
            label: 'View', items: mk('View', [
                { label: win && win.zoomed ? 'Exit Zoom' : 'Zoom', kbd: 'Alt ↵', disabled: !win, action: function () { if (win) toggleZoom(win); } },
                { label: 'Enter Full Screen', action: fullScreen }
            ])
        });
        var goTo = function (label, folder) { return { label: label, action: function () { open('finder', { folder: folder }); } }; };
        list.push({
            label: 'Go', items: [
                goTo('CAK3D HD', 'home'), goTo('Apps', 'apps'), goTo('Sites', 'sites'), goTo('Papers', 'papers'), goTo('Pictures', 'pictures'), goTo('Documents', 'documents'),
                '-',
                { label: 'Launchpad', kbd: 'Alt L', action: function () { toggleLaunchpad(true); } },
                { label: 'Screen Sharing: CAK3D PC', action: function () { open('screenshare'); } }
            ]
        });
        var winItems = [
            { label: 'Minimize', kbd: 'Alt M', disabled: !win, action: function () { if (win) minimizeWin(win); } },
            { label: 'Zoom', disabled: !win, action: function () { if (win) toggleZoom(win); } },
            { label: 'Cycle Through Windows', kbd: 'Alt `', disabled: wins.length < 2, action: cycleWindows },
            '-'
        ].concat(wins.map(function (w) { return { label: (w === active ? '✓ ' : '   ') + w.title, action: function () { focusWin(w); } }; }));
        list.push({ label: 'Window', items: winItems });
        list.push({
            label: 'Help', items: [
                { label: 'Search (Spotlight)', kbd: 'Ctrl Space', action: function () { toggleSpotlight(true); } },
                { label: 'Keyboard Shortcuts', action: function () { open('about', { shortcuts: true }); } }
            ]
        });
        return list;
    }
    function updateMenubar() {
        var win = active;
        var menus = appMenus(win);
        var nameBtn = $('#appName');
        nameBtn.textContent = win ? win.app.name : 'Finder';
        nameBtn.onclick = function (e) { menuFrom(nameBtn, menus[0].items, e); };
        var holder = $('#appMenus');
        holder.textContent = '';
        menus.slice(1).forEach(function (m) {
            var b = h('button', { class: 'mb-btn', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', text: m.label });
            b.addEventListener('click', function (e) { menuFrom(b, appMenus(active).filter(function (x) { return x.label === m.label; })[0].items, e); });
            holder.appendChild(b);
        });
    }
    // slide between menus while one is open (like a real menu bar)
    function menubarHover(e) {
        var b = e.target.closest && e.target.closest('#menubar .mb-btn[aria-haspopup]');
        if (b && openMenuState && openMenuState.anchor && openMenuState.anchor !== b && openMenuState.anchor.closest('#menubar')) b.click();
    }
    function copySelection() {
        var t = String(window.getSelection ? window.getSelection() : '');
        var a = document.activeElement;
        if (!t && a && typeof a.selectionStart === 'number') t = a.value.slice(a.selectionStart, a.selectionEnd);
        if (t && navigator.clipboard) navigator.clipboard.writeText(t).catch(function () { /* blocked */ });
    }
    function fullScreen() {
        try {
            if (document.fullscreenElement) document.exitFullscreen();
            else document.documentElement.requestFullscreen().catch(function () { toast('Full Screen', 'Full screen is not allowed here.', 'settings'); });
        } catch (e) { /* not supported */ }
    }

    /* ---------- clock / battery ---------- */
    var clockTimer = 0;
    function tick() {
        var now = new Date();
        var time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        // "Thu Oct 22  6:28 PM", like the menu bar on a Mac
        var mbText = isPhone() ? time : now.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + now.toLocaleDateString('en-US', { month: 'short' }) + ' ' + now.getDate() + ' ' + time;
        $('#clockBtn').textContent = mbText;
        // the dynamic wallpaper (and theme) follows the time of day
        var day = isDaytime();
        if (settings.wall === 'garden' && tick.lastDay !== undefined && tick.lastDay !== day) applySettings();
        tick.lastDay = day;
        $('#lockTime').textContent = time.replace(/\s?[AP]M$/i, '');
        $('#lockDate').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
        clearTimeout(clockTimer);
        clockTimer = setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    }
    function battery() {
        var show = function (b) {
            var pct = Math.round(b.level * 100);
            $('#battPct').textContent = pct + '%';
            $('#battFill').style.width = pct + '%';
            $('#battery').setAttribute('aria-label', 'Battery ' + pct + '%' + (b.charging ? ', charging' : ''));
        };
        if (navigator.getBattery) {
            navigator.getBattery().then(function (b) {
                show(b);
                b.addEventListener('levelchange', function () { show(b); });
                b.addEventListener('chargingchange', function () { show(b); });
            }).catch(function () { /* blocked */ });
        }
    }

    /* ---------- lock screen ---------- */
    var locked = true;
    function lock() {
        closeOverlays();
        locked = true;
        var l = $('#lock');
        l.hidden = false;
        // next frame so the transition runs
        requestAnimationFrame(function () { l.classList.remove('gone'); $('#unlockBtn').focus(); });
        post({ type: 'cak3d-laptop', action: 'locked' });
    }
    function unlock() {
        if (!locked) return;
        locked = false;
        var l = $('#lock');
        l.classList.add('gone');
        setTimeout(function () { if (!locked) l.hidden = true; }, 450);
        var first = $('#icons .dicon');
        if (first) first.focus({ preventScroll: true });
        post({ type: 'cak3d-laptop', action: 'unlocked' });
    }
    function shutDown() {
        closeOverlays();
        wins.slice().forEach(closeWin);
        var off = h('div', {
            style: 'position:fixed;inset:0;z-index:9500;background:#000;color:#666;display:flex;align-items:center;justify-content:center;font-size:13px;text-align:center',
            tabindex: '0', role: 'button', 'aria-label': 'Start up'
        }, 'CAK3D OS X is shut down. Click or press a key to start up.');
        var on = function () { off.remove(); lock(); };
        off.addEventListener('click', on);
        off.addEventListener('keydown', on);
        document.body.appendChild(off);
        off.focus();
    }

    /* ---------- toast / notifications ---------- */
    var notes = [];
    var toastTimer = 0;
    function toast(title, text, ic) {
        notes.unshift({ title: title, text: text, icon: ic || 'logo', at: new Date() });
        if (notes.length > 30) notes.pop();
        if (!$('#nc').hidden) renderNC();
        if (settings.dnd || locked) return;
        var t = $('#toast');
        t.textContent = '';
        t.appendChild(h('div', { class: 'row' }, icon(ic || 'logo'), h('div', null, h('b', { text: title }), h('span', { text: text }))));
        t.hidden = false;
        t.style.animation = 'none';
        void t.offsetWidth;
        t.style.animation = '';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { t.hidden = true; }, 4200);
    }

    /* ---------- desktop ---------- */
    function desktopIcons() {
        var items = [
            { label: 'CAK3D HD', icon: 'disk', run: function () { open('finder', { folder: 'home' }); } },
            { label: 'Apps', icon: 'folderPurple', run: function () { open('finder', { folder: 'apps' }); } },
            { label: 'Sites', icon: 'folderGreen', run: function () { open('finder', { folder: 'sites' }); } },
            { label: 'Papers', icon: 'folder', run: function () { open('finder', { folder: 'papers' }); } },
            { label: 'Pictures', icon: 'folder', run: function () { open('finder', { folder: 'pictures' }); } },
            { label: 'Read Me.txt', icon: 'doc', run: function () { open('notes', { file: 'Read Me.txt' }); } },
            { label: 'Screen Sharing', icon: 'pc', run: function () { open('screenshare'); } },
            { label: 'TV', icon: 'tv', run: function () { open('tv'); } }
        ];
        var holder = $('#icons');
        var lastTouch = false;
        items.forEach(function (it) {
            var b = h('button', { class: 'dicon', type: 'button', role: 'listitem', title: it.label }, icon(it.icon), h('span', { class: 'lbl', text: it.label }));
            b.addEventListener('pointerdown', function (e) { lastTouch = e.pointerType === 'touch' || e.pointerType === 'pen'; });
            b.addEventListener('click', function (e) {
                holder.querySelectorAll('.dicon').forEach(function (d) { d.classList.toggle('sel', d === b); });
                if (lastTouch || e.detail === 0) { lastTouch = false; it.run(); } // touch taps and keyboard Enter open right away
            });
            b.addEventListener('dblclick', function () { if (!lastTouch) it.run(); });
            holder.appendChild(b);
        });
        holder.addEventListener('keydown', function (e) {
            var list = Array.prototype.slice.call(holder.querySelectorAll('.dicon'));
            var i = list.indexOf(document.activeElement);
            if (i < 0) return;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); list[Math.min(list.length - 1, i + 1)].focus(); }
            if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); list[Math.max(0, i - 1)].focus(); }
        });
        var desk = $('#desktop');
        desk.addEventListener('pointerdown', function (e) {
            if (e.target === desk || e.target === holder || e.target.id === 'windows') {
                holder.querySelectorAll('.dicon').forEach(function (d) { d.classList.remove('sel'); });
                closeOverlays();
                if (active) focusWin(null);
            }
        });
        desk.addEventListener('contextmenu', function (e) {
            if (e.target.closest('.win')) return;
            e.preventDefault();
            showMenu([
                { label: 'New Note', action: function () { open('notes', { newFile: true }); } },
                { label: 'Open in Terminal', action: function () { open('terminal'); } },
                '-',
                { label: 'Change Wallpaper…', action: function () { open('settings', { page: 'wallpaper' }); } },
                { label: 'Next Wallpaper', action: function () { var i = WALLS.map(function (w) { return w.id; }).indexOf(settings.wall); setSetting('wall', WALLS[(i + 1) % WALLS.length].id); } },
                '-',
                { label: 'Get Info', action: function () { open('about'); } }
            ], e.clientX, e.clientY, null, false);
        });
    }

    /* ---------- dock ---------- */
    var PINNED = ['finder', 'launchpad', 'safari', 'screenshare', 'tv', 'fm', 'notes', 'calendar', 'calc', 'terminal', 'wallpapers', 'settings'];
    var bounceId = null;
    function bounce(id) { bounceId = id; renderDock(); bounceId = null; }
    function renderDock() {
        var dock = $('#dock');
        document.body.classList.toggle('has-win', wins.some(function (w) { return !w.minimized && !w.closing; }));
        var focused = document.activeElement && dock.contains(document.activeElement) ? document.activeElement.getAttribute('data-key') : null;
        dock.textContent = '';
        var running = {};
        wins.forEach(function (w) { running[w.appId] = true; });
        var item = function (key, label, ic, onClick, onCtx, isRunning) {
            var b = h('button', { class: 'dock-item' + (isRunning ? ' running' : '') + (bounceId === key ? ' bounce' : ''), type: 'button', 'aria-label': label + (isRunning ? ' (running)' : ''), 'data-key': key },
                icon(ic), h('span', { class: 'tip', text: label, 'aria-hidden': 'true' }));
            b.addEventListener('click', onClick);
            if (onCtx) b.addEventListener('contextmenu', function (e) { e.preventDefault(); var r = b.getBoundingClientRect(); var m = showMenu(onCtx(), r.left, 0, b, false); m.style.top = Math.max(30, r.top - m.offsetHeight - 8) + 'px'; });
            b.addEventListener('animationend', function () { b.classList.remove('bounce'); });
            dock.appendChild(b);
            return b;
        };
        var appItem = function (id) {
            var app = apps[id];
            if (!app) return;
            item(id, app.name, app.icon, function () { dockClick(id); }, function () {
                var ws = windowsOf(id);
                return ws.map(function (w) { return { label: w.title, action: function () { focusWin(w); } }; })
                    .concat(ws.length ? ['-'] : [], [{ label: 'New Window', disabled: !!app.single && ws.length > 0, action: function () { open(id); } }],
                        ws.length ? [{ label: 'Quit', action: function () { ws.forEach(closeWin); } }] : []);
            }, !!running[id]);
        };
        PINNED.forEach(appItem);
        var extra = Object.keys(running).filter(function (id) { return PINNED.indexOf(id) < 0; });
        if (extra.length) { dock.appendChild(h('div', { class: 'dock-sep', 'aria-hidden': 'true' })); extra.forEach(appItem); }
        dock.appendChild(h('div', { class: 'dock-sep', 'aria-hidden': 'true' }));
        wins.filter(function (w) { return w.minimized; }).forEach(function (w) {
            var b = item('min-' + w.id, w.title + ' (minimized)', w.app.icon, function () { restoreWin(w); }, null, false);
            b.appendChild(h('span', { class: 'mini', html: I.logo, 'aria-hidden': 'true' }));
        });
        item('trash', 'Trash', 'bin', function () { open('finder', { folder: 'trash' }); }, null, false);
        if (focused) { var f = dock.querySelector('[data-key="' + focused + '"]'); if (f) f.focus(); }
        dockMag.centers = null;
        if (dockMag.x != null) magnify();
    }

    /* Dock magnification: icons near the pointer grow with a smooth falloff, like a real dock.
     * Driven by pointermove only (no animation loop); CSS transitions do the easing. */
    var dockMag = { x: null, centers: null };
    var MAG_BASE = 57, MAG_MAX = 96, MAG_RANGE = 175;
    function magnify() {
        var items = Array.prototype.slice.call($('#dock').querySelectorAll('.dock-item'));
        if (dockMag.x == null || !settings.magnify || isPhone()) {
            items.forEach(function (b) { b.style.width = ''; b.style.height = ''; });
            return;
        }
        // centers measured at rest size, so growing icons don't push the targets around
        if (!dockMag.centers) {
            items.forEach(function (b) { b.style.width = ''; b.style.height = ''; });
            dockMag.centers = items.map(function (b) { var r = b.getBoundingClientRect(); return r.left + r.width / 2; });
        }
        items.forEach(function (b, i) {
            var d = Math.abs(dockMag.x - dockMag.centers[i]);
            var f = d < MAG_RANGE ? (Math.cos(Math.PI * d / MAG_RANGE) + 1) / 2 : 0;
            var size = MAG_BASE + (MAG_MAX - MAG_BASE) * f;
            b.style.width = size.toFixed(1) + 'px';
            b.style.height = (size + 4).toFixed(1) + 'px';
        });
    }
    function bindDockMagnify() {
        var dock = $('#dock');
        var idle = 0;
        dock.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { dockMag.centers = null; } });
        dock.addEventListener('pointermove', function (e) {
            if (e.pointerType !== 'mouse') return;
            dockMag.x = e.clientX;
            dock.classList.add('tracking');
            clearTimeout(idle);
            idle = setTimeout(function () { dock.classList.remove('tracking'); }, 120);
            magnify();
        });
        dock.addEventListener('pointerleave', function () { dockMag.x = null; dockMag.centers = null; dock.classList.remove('tracking'); magnify(); });
    }
    function dockClick(id) {
        if (id === 'launchpad') { toggleLaunchpad(); return; }
        var ws = windowsOf(id);
        if (!ws.length) { open(id); return; }
        var visible = ws.filter(function (w) { return !w.minimized; });
        if (!visible.length) { restoreWin(ws[ws.length - 1]); return; }
        closeOverlays();
        visible.sort(function (a, b) { return +a.el.style.zIndex - +b.el.style.zIndex; });
        focusWin(visible[visible.length - 1]);
    }
    function cycleWindows() {
        var list = wins.slice().sort(function (a, b) { return +a.el.style.zIndex - +b.el.style.zIndex; });
        if (list.length) focusWin(list[0]);
    }

    /* ---------- Launchpad ---------- */
    function lpApps() {
        return Object.keys(apps).map(function (k) { return apps[k]; }).filter(function (a) { return !a.hidden; });
    }
    function renderLaunchpad(q) {
        var grid = $('#lpGrid');
        grid.textContent = '';
        q = (q || '').toLowerCase();
        lpApps().filter(function (a) { return !q || (a.name + ' ' + (a.keywords || '')).toLowerCase().indexOf(q) >= 0; }).forEach(function (a) {
            grid.appendChild(h('button', { class: 'lp-app', type: 'button', onclick: function () { toggleLaunchpad(false); open(a.id); } }, icon(a.icon), h('span', { text: a.name })));
        });
    }
    function toggleLaunchpad(force) {
        var lp = $('#launchpad');
        var show = force == null ? lp.hidden : force;
        if (show) {
            closeOverlays();
            lp.hidden = false;
            $('#lpSearch').value = '';
            renderLaunchpad('');
            requestAnimationFrame(function () { lp.classList.remove('hide'); $('#lpSearch').focus(); });
        } else if (!lp.hidden) {
            lp.classList.add('hide');
            setTimeout(function () { if (lp.classList.contains('hide')) lp.hidden = true; }, 200);
        }
    }

    /* ---------- Spotlight ---------- */
    var slSel = 0, slItems = [], slAbort = null, slTimer = 0;
    var KEYWORDS = {};
    function looksLikeUrl(q) {
        q = q.trim();
        if (/\s/.test(q)) return false;
        return /^(https?:\/\/|about:|localhost)/i.test(q) || /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(q);
    }
    function projectsIndex() {
        var out = [];
        D.featured.forEach(function (p) { out.push({ name: p.name, sub: 'Featured', url: p.url || p.repo, text: p.description }); });
        D.apps.forEach(function (p) { out.push({ name: p.name, sub: p.language || 'Project', url: p.url || p.repo, text: p.description }); });
        D.sites.forEach(function (p) { out.push({ name: p.name, sub: 'Site', url: p.url, text: p.note || '' }); });
        D.papers.forEach(function (p) { out.push({ name: p.name, sub: 'Paper · ' + p.when, url: p.repo || D.NEWSSTAND_URL, text: p.motto }); });
        return out;
    }
    function renderSpotlight() {
        var q = $('#slInput').value.trim();
        var res = $('#slRes');
        res.textContent = '';
        slItems = [];
        if (!q) return;
        var ql = q.toLowerCase();
        var group = function (title, items) {
            if (!items.length) return;
            res.appendChild(h('h3', { text: title }));
            items.forEach(function (it) {
                var idx = slItems.length;
                var b = h('button', { class: 'sl-item', type: 'button', role: 'option', id: 'sl-' + idx, onclick: function () { runSl(idx); }, onmousemove: function () { if (slSel !== idx) { slSel = idx; markSl(); } } },
                    it.icon ? icon(it.icon) : h('span', { class: 'ic', text: it.emoji || '🔎', 'aria-hidden': 'true' }),
                    h('span', { class: 't' }, it.label, it.sub ? h('span', { class: 'sub', text: '— ' + it.sub }) : null));
                slItems.push(it);
                res.appendChild(b);
            });
        };
        if (looksLikeUrl(q)) group('Open', [{ label: 'Open ' + q, sub: 'Safari', icon: 'browser', run: function () { openUrl(q); } }]);
        group('Applications', lpApps().filter(function (a) { return (a.name + ' ' + (a.keywords || '')).toLowerCase().indexOf(ql) >= 0; }).slice(0, 6)
            .map(function (a) { return { label: a.name, icon: a.icon, sub: 'Application', run: function () { open(a.id); } }; }));
        var cmds = [
            { label: 'Dark Mode', sub: 'System Settings', icon: 'settings', run: function () { setSetting('theme', 'dark'); } },
            { label: 'Light Mode', sub: 'System Settings', icon: 'settings', run: function () { setSetting('theme', 'light'); } },
            { label: 'Lock Screen', sub: 'System', icon: 'logo', run: lock },
            { label: 'Change Wallpaper', sub: 'System Settings', icon: 'settings', run: function () { open('settings', { page: 'wallpaper' }); } }
        ].filter(function (c) { return c.label.toLowerCase().indexOf(ql) >= 0; });
        group('System', cmds);
        group('Projects & Sites', projectsIndex().filter(function (p) { return (p.name + ' ' + p.text).toLowerCase().indexOf(ql) >= 0; }).slice(0, 6)
            .map(function (p) { return { label: p.name, sub: p.sub, icon: 'link', run: function () { openUrl(p.url); } }; }));
        group('Search the Web', [
            { label: 'Search “' + q + '” in Safari', sub: 'Wikipedia results', emoji: '🔎', run: function () { open('safari', { search: q }); } },
            { label: 'DuckDuckGo: ' + q, sub: 'opens a new browser tab', emoji: '🦆', run: function () { window.open('https://duckduckgo.com/?q=' + encodeURIComponent(q), '_blank', 'noopener'); } },
            { label: 'Google: ' + q, sub: 'opens a new browser tab', emoji: '🌐', run: function () { window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank', 'noopener'); } }
        ]);
        var wikiHolder = h('div');
        res.appendChild(wikiHolder);
        if (slSel >= slItems.length) slSel = 0;
        markSl();
        // Wikipedia, debounced
        clearTimeout(slTimer);
        if (slAbort) slAbort.abort();
        slTimer = setTimeout(function () {
            slAbort = typeof AbortController !== 'undefined' ? new AbortController() : null;
            wikiSearch(q, 5, slAbort && slAbort.signal).then(function (list) {
                if ($('#slInput').value.trim() !== q || !list.length) return;
                wikiHolder.appendChild(h('h3', { text: 'Wikipedia' }));
                list.forEach(function (r) {
                    var idx = slItems.length;
                    var it = { label: r.title, run: function () { openUrl(wikiUrl(r.title)); } };
                    slItems.push(it);
                    wikiHolder.appendChild(h('button', { class: 'sl-item', type: 'button', role: 'option', id: 'sl-' + idx, onclick: function () { runSl(idx); }, onmousemove: function () { if (slSel !== idx) { slSel = idx; markSl(); } } },
                        h('span', { class: 'ic', text: '📚', 'aria-hidden': 'true' }), h('span', { class: 't' }, r.title, h('span', { class: 'sub', text: '— ' + stripTags(r.snippet).slice(0, 80) }))));
                });
            }).catch(function () { /* offline or aborted */ });
        }, 280);
    }
    function markSl() {
        var res = $('#slRes');
        res.querySelectorAll('.sl-item').forEach(function (b) { b.classList.remove('hl'); b.setAttribute('aria-selected', 'false'); });
        var cur = $('#sl-' + slSel);
        if (cur) { cur.classList.add('hl'); cur.setAttribute('aria-selected', 'true'); cur.scrollIntoView({ block: 'nearest' }); $('#slInput').setAttribute('aria-activedescendant', cur.id); }
    }
    function runSl(i) {
        var it = slItems[i];
        if (!it) return;
        toggleSpotlight(false);
        it.run();
    }
    function toggleSpotlight(force) {
        var sp = $('#spotlight');
        var show = force == null ? sp.hidden : force;
        if (show) {
            closeOverlays();
            sp.hidden = false;
            $('#slInput').value = '';
            $('#slRes').textContent = '';
            slSel = 0;
            $('#slInput').focus();
        } else sp.hidden = true;
    }
    function stripTags(s) { var d = document.createElement('div'); d.innerHTML = s || ''; return d.textContent || ''; }
    function wikiUrl(title) { return 'https://en.m.wikipedia.org/wiki/' + encodeURIComponent(String(title).replace(/ /g, '_')); }
    function wikiSearch(q, limit, signal) {
        var url = 'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=' + (limit || 10) + '&srsearch=' + encodeURIComponent(q);
        return fetch(url, signal ? { signal: signal } : undefined).then(function (r) { if (!r.ok) throw new Error('wiki ' + r.status); return r.json(); })
            .then(function (j) { return (j.query && j.query.search) || []; });
    }

    /* ---------- Control Center ---------- */
    var fmState = { playing: false, title: '' };
    function ccToggle(label, sub, emoji, key, onChange) {
        var b = h('button', { class: 'cc-toggle', type: 'button', 'aria-pressed': String(!!settings[key]) },
            h('span', { class: 'dot', text: emoji, 'aria-hidden': 'true' }), h('span', null, label, h('small', { text: sub(settings[key]) })));
        b.addEventListener('click', function () {
            var v = !settings[key];
            if (onChange) onChange(v); else setSetting(key, v);
            b.setAttribute('aria-pressed', String(!!settings[key]));
            b.querySelector('small').textContent = sub(settings[key]);
        });
        return b;
    }
    function renderCC() {
        var cc = $('#cc');
        cc.textContent = '';
        settings.darkMode = settings.theme === 'dark';
        var big = function (label, emoji, pressed, onClick) {
            var b = h('button', { class: 'cc-mod big', type: 'button', 'aria-pressed': String(!!pressed) }, h('span', { class: 'dot', text: emoji, 'aria-hidden': 'true' }), label);
            b.addEventListener('click', function () { onClick(); renderCC(); var again = $('#cc').querySelectorAll('.cc-mod.big')[label === 'Dark mode' ? 0 : 1]; if (again) again.focus(); });
            return b;
        };
        cc.appendChild(big('Dark mode', '◐', settings.darkMode, function () { setSetting('theme', settings.darkMode ? 'light' : 'dark'); }));
        cc.appendChild(big('Animations', '✦', settings.animations !== false, function () { setSetting('animations', settings.animations === false); }));
        var colors = h('div', { class: 'cc-colors', role: 'radiogroup', 'aria-label': 'System color' });
        ACCENTS.forEach(function (a) {
            var on = settings.accent === a.c;
            colors.appendChild(h('button', { class: 'cc-color', type: 'button', role: 'radio', 'aria-checked': String(on), 'aria-label': a.n, title: a.n, style: 'background:' + a.c, text: on ? '✓' : '',
                onclick: function () { setSetting('accent', a.c); renderCC(); var f = $('#cc .cc-color[aria-checked="true"]'); if (f) f.focus(); } }));
        });
        cc.appendChild(h('div', { class: 'cc-mod wide' }, h('h4', { text: 'System Color' }), colors));
        var wall = WALLS.filter(function (w) { return w.id === settings.wall; })[0] || WALLS[0];
        cc.appendChild(h('button', { class: 'cc-mod wide cc-wall', type: 'button', onclick: function () { closeOverlays(); open('wallpapers'); } },
            h('span', { class: 'thumb wall-' + wall.id + (wall.id === 'garden' && isDaytime() ? ' is-day' : ''), 'aria-hidden': 'true' }),
            h('span', null, h('b', { text: wall.name }), h('span', { class: 'sub', text: wall.sub || 'Wallpaper' }))));
        cc.appendChild(h('div', { class: 'cc-mod' },
            ccToggle('Wi-Fi', function (v) { return v ? 'GardenNet 5G' : 'Off'; }, '📶', 'wifi'),
            ccToggle('Focus', function (v) { return v ? 'Do Not Disturb' : 'Off'; }, '🌙', 'dnd')));
        cc.appendChild(h('div', { class: 'cc-mod' },
            ccToggle('Night Shift', function (v) { return v ? 'On' : 'Off'; }, '☀', 'nightShift'),
            ccToggle('Blur', function (v) { return v ? 'On' : 'Reduced'; }, '◫', 'blur')));
        var bright = h('input', { type: 'range', class: 'cc-slider', min: '0.3', max: '1', step: '0.05', value: String(settings.brightness), 'aria-label': 'Display brightness' });
        bright.addEventListener('input', function () { setSetting('brightness', +bright.value); });
        cc.appendChild(h('div', { class: 'cc-mod wide' }, h('h4', { text: 'Display' }), bright));
        var vol = h('input', { type: 'range', class: 'cc-slider', min: '0', max: '1', step: '0.05', value: String(settings.volume), 'aria-label': 'Sound volume (laptop)' });
        vol.addEventListener('input', function () { setSetting('volume', +vol.value); });
        cc.appendChild(h('div', { class: 'cc-mod wide' }, h('h4', { text: 'Sound' }), vol));
        cc.appendChild(h('div', { class: 'cc-mod wide' },
            h('h4', { text: 'CAK3D FM' }),
            h('div', { class: 'muted', style: 'font-size:12px;margin-bottom:6px', text: fmState.playing ? '♪ ' + (fmState.title || 'Now playing') : 'Not playing' }),
            h('button', { class: 'btn', type: 'button', text: 'Open CAK3D FM', onclick: function () { closeOverlays(); open('fm'); } })));
    }
    function togglePanel(id, render) {
        var p = $(id);
        var show = p.hidden;
        closeOverlays();
        if (show) {
            render();
            p.hidden = false;
            p.classList.remove('anim'); void p.offsetWidth; p.classList.add('anim');
            var btn = id === '#cc' ? $('#ccBtn') : $('#clockBtn');
            btn.setAttribute('aria-expanded', 'true');
            var f = p.querySelector('button, input');
            if (f) f.focus();
        }
    }

    /* ---------- Notification Center ---------- */
    function renderNC() {
        var nc = $('#nc');
        nc.textContent = '';
        var now = new Date();
        var first = new Date(now.getFullYear(), now.getMonth(), 1);
        var days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        var cal = h('div', { class: 'cal', role: 'grid', 'aria-label': 'Calendar' });
        'SMTWTFS'.split('').forEach(function (d) { cal.appendChild(h('span', { class: 'dow', text: d })); });
        for (var i = 0; i < first.getDay(); i++) cal.appendChild(h('span'));
        for (var d = 1; d <= days; d++) cal.appendChild(h('span', { class: d === now.getDate() ? 'today' : '', text: String(d) }));
        nc.appendChild(h('div', { class: 'widget' }, h('h4', { text: now.toLocaleDateString([], { month: 'long', year: 'numeric' }) }), cal));
        var wx = h('div', { class: 'widget' }, h('h4', { text: 'Weather · Lewiston, ME', style: 'color:#5bd1ff' }), h('div', { class: 'muted', text: 'Getting the latest…' }));
        nc.appendChild(wx);
        getWeather().then(function (w) {
            wx.lastChild.remove();
            wx.appendChild(h('div', { style: 'font-size:30px;font-weight:600', text: w.temp + '°F' }));
            wx.appendChild(h('div', { class: 'muted', text: w.text + ' · H ' + w.hi + '° L ' + w.lo + '°' }));
        }).catch(function () { wx.lastChild.textContent = 'Weather is unavailable right now.'; });
        nc.appendChild(h('div', { class: 'nc-head' }, h('span', { text: 'Notifications' }),
            notes.length ? h('button', { type: 'button', text: 'Clear', onclick: function () { notes = []; renderNC(); } }) : null));
        if (!notes.length) nc.appendChild(h('div', { class: 'muted', style: 'padding:6px 4px;font-size:12px', text: 'No new notifications' }));
        notes.forEach(function (n) {
            nc.appendChild(h('div', { class: 'notif' }, h('b', { text: n.title }), h('span', { text: n.text }), h('br'),
                h('small', { text: n.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) })));
        });
    }
    var wxCache = null;
    var WX_CODES = { 0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog', 51: 'Drizzle', 53: 'Drizzle', 55: 'Drizzle', 61: 'Rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain', 71: 'Snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Showers', 81: 'Showers', 82: 'Heavy showers', 85: 'Snow showers', 86: 'Snow showers', 95: 'Thunderstorms', 96: 'Thunderstorms', 99: 'Thunderstorms' };
    function getWeather() {
        if (wxCache && Date.now() - wxCache.at < 15 * 60000) return Promise.resolve(wxCache.data);
        var url = 'https://api.open-meteo.com/v1/forecast?latitude=44.1004&longitude=-70.2148&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&timezone=America%2FNew_York&forecast_days=1';
        return fetch(url).then(function (r) { if (!r.ok) throw new Error('weather'); return r.json(); }).then(function (j) {
            var data = {
                temp: Math.round(j.current.temperature_2m), text: WX_CODES[j.current.weather_code] || 'Weather',
                hi: Math.round(j.daily.temperature_2m_max[0]), lo: Math.round(j.daily.temperature_2m_min[0])
            };
            wxCache = { at: Date.now(), data: data };
            return data;
        });
    }

    function closeOverlays() {
        closeMenu();
        $('#cc').hidden = true;
        $('#nc').hidden = true;
        $('#ccBtn').setAttribute('aria-expanded', 'false');
        $('#clockBtn').setAttribute('aria-expanded', 'false');
        if (!$('#spotlight').hidden) $('#spotlight').hidden = true;
        toggleLaunchpad(false);
    }

    /* ---------- room messages ---------- */
    var stereoListeners = [];
    window.addEventListener('message', function (e) {
        if (!inRoom || e.source !== window.parent) return;
        var m = e.data;
        if (!m || typeof m !== 'object') return;
        if (m.type === 'cak3d-stereo') {
            var was = fmState.playing + '|' + fmState.title;
            fmState = { playing: !!m.playing, title: typeof m.title === 'string' ? m.title.slice(0, 200) : '' };
            var chip = $('#npChip');
            chip.hidden = !fmState.playing;
            chip.textContent = fmState.playing ? '♪ ' + (fmState.title || 'CAK3D FM') : '';
            stereoListeners.forEach(function (f) { try { f(fmState); } catch (err) { /* ignore */ } });
            if (fmState.playing && was !== fmState.playing + '|' + fmState.title && fmState.title) toast('CAK3D FM', fmState.title, 'fm');
        } else if (m.type === 'cak3d-laptop-control') {
            if (m.action === 'unlock') unlock();
            else if (m.action === 'lock') lock();
            else if (m.action === 'open' && typeof m.app === 'string' && apps[m.app]) { unlock(); open(m.app); }
        } else if (m.type === 'cak3d-tv-state') {
            document.dispatchEvent(new CustomEvent('cak3d:tvstate', { detail: m }));
        }
    });

    /* ---------- keyboard ---------- */
    function onKey(e) {
        if (locked) {
            if (!$('#lock').hidden && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Tab') { e.preventDefault(); unlock(); }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && (e.code === 'Space' || e.key === ' ')) { e.preventDefault(); toggleSpotlight(); return; }
        if (e.key === 'Escape') {
            if (!$('#spotlight').hidden || !$('#launchpad').hidden || !$('#cc').hidden || !$('#nc').hidden) { e.preventDefault(); closeOverlays(); }
            return;
        }
        if (e.altKey && !e.ctrlKey && !e.metaKey) {
            if (e.code === 'Backquote') { e.preventDefault(); cycleWindows(); }
            else if (e.code === 'KeyW' && active) { e.preventDefault(); closeWin(active); }
            else if (e.code === 'KeyM' && active) { e.preventDefault(); minimizeWin(active); }
            else if (e.key === 'Enter' && active) { e.preventDefault(); toggleZoom(active); }
            else if (e.code === 'KeyL') { e.preventDefault(); toggleLaunchpad(); }
        }
    }

    /* ---------- boot ---------- */
    function boot() {
        document.body.appendChild(h('div', { id: 'shade', style: 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:9900', 'aria-hidden': 'true' }));
        document.body.appendChild(h('div', { id: 'nightshift', hidden: true, style: 'position:fixed;inset:0;background:rgba(255,140,40,.16);mix-blend-mode:multiply;pointer-events:none;z-index:9901', 'aria-hidden': 'true' }));
        $('#lockAvatar').innerHTML = I.user;
        $('#lockLogo').innerHTML = I.logo;
        $('#leafBtn').innerHTML = '<span class="ic">' + I.leafMono + '</span>';
        $('#wifiBtn').innerHTML = '<span class="ic">' + I.wifi + '</span>';
        $('#spotBtn').innerHTML = '<span class="ic">' + I.search + '</span>';
        $('#ccBtn').innerHTML = '<span class="ic">' + I.cc + '</span>';
        $('#slIcon').innerHTML = I.search;
        applySettings();
        tick();
        battery();
        desktopIcons();
        updateMenubar();
        renderDock();
        bindDockMagnify();

        $('#leafBtn').addEventListener('click', function (e) { menuFrom($('#leafBtn'), leafItems(), e); });
        $('#menubar').addEventListener('pointerover', menubarHover);
        $('#spotBtn').addEventListener('click', function () { toggleSpotlight(); });
        $('#ccBtn').addEventListener('click', function () { togglePanel('#cc', renderCC); });
        $('#clockBtn').addEventListener('click', function () { togglePanel('#nc', renderNC); });
        $('#wifiBtn').addEventListener('click', function (e) {
            menuFrom($('#wifiBtn'), [
                { label: settings.wifi ? 'Wi-Fi: On' : 'Wi-Fi: Off', disabled: true },
                { label: settings.wifi ? 'Turn Wi-Fi Off' : 'Turn Wi-Fi On', action: function () { setSetting('wifi', !settings.wifi); } },
                '-',
                { label: (settings.wifi ? '✓ ' : '') + 'GardenNet 5G', disabled: !settings.wifi },
                { label: 'Network Settings…', action: function () { open('settings', { page: 'about' }); } }
            ], e);
        });
        $('#npChip').addEventListener('click', function () { open('fm'); });

        $('#launchpad').addEventListener('click', function (e) { if (e.target.id === 'launchpad' || e.target.id === 'lpGrid') toggleLaunchpad(false); });
        $('#lpSearch').addEventListener('input', function () { renderLaunchpad(this.value); });
        $('#lpSearch').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { var f = $('#lpGrid .lp-app'); if (f) f.click(); }
        });
        $('#slInput').addEventListener('input', function () { slSel = 0; renderSpotlight(); });
        $('#slInput').addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); slSel = Math.min(slItems.length - 1, slSel + 1); markSl(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); slSel = Math.max(0, slSel - 1); markSl(); }
            else if (e.key === 'Enter') { e.preventDefault(); runSl(slSel); }
        });
        document.addEventListener('pointerdown', function (e) {
            var t = e.target;
            if (!$('#spotlight').hidden && !t.closest('#spotlight') && !t.closest('#spotBtn')) $('#spotlight').hidden = true;
            ['#cc', '#nc'].forEach(function (id) {
                var btn = id === '#cc' ? '#ccBtn' : '#clockBtn';
                if (!$(id).hidden && !t.closest(id) && !t.closest(btn)) { $(id).hidden = true; $(btn).setAttribute('aria-expanded', 'false'); }
            });
        }, true);
        document.addEventListener('keydown', onKey);

        var lockEl = $('#lock');
        lockEl.addEventListener('click', unlock);
        var touchY = null;
        lockEl.addEventListener('touchstart', function (e) { touchY = e.touches[0].clientY; }, { passive: true });
        lockEl.addEventListener('touchmove', function (e) { if (touchY != null && touchY - e.touches[0].clientY > 40) { touchY = null; unlock(); } }, { passive: true });

        var resizeTimer = 0;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                tick();
                // keep windows reachable after the viewport shrinks
                wins.forEach(function (w) {
                    var el = w.el;
                    if (el.offsetLeft > window.innerWidth - 80) el.style.left = Math.max(0, window.innerWidth - el.offsetWidth) + 'px';
                    if (el.offsetTop > window.innerHeight - 60) el.style.top = '28px';
                    if (w.app.onResize) w.app.onResize(w);
                });
            }, 150);
        });

        var params = new URLSearchParams(location.search);
        if (params.has('unlocked') || location.hash === '#desktop') {
            locked = false;
            lockEl.classList.add('gone');
            lockEl.hidden = true;
        } else {
            $('#unlockBtn').focus({ preventScroll: true });
            // the start-up screen plays once per browser session (it's one CSS animation, then it's removed)
            var seen = false;
            try { seen = sessionStorage.getItem('cak3dosx.booted') === '1'; sessionStorage.setItem('cak3dosx.booted', '1'); } catch (e) { /* storage blocked */ }
            if (!seen && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                var bootEl = $('#boot');
                $('#bootLogo').innerHTML = I.leafMono;
                bootEl.hidden = false;
                setTimeout(function () { bootEl.classList.add('done'); }, 1700);
                setTimeout(function () { bootEl.remove(); }, 2300);
            }
        }
        if (params.get('open') && apps[params.get('open')]) open(params.get('open'));
        if (!store.get('welcomed', false)) {
            store.set('welcomed', true);
            setTimeout(function () { toast('Welcome to CAK3D OS X', 'Press Ctrl+Space for Spotlight, or open Launchpad from the dock.', 'logo'); }, 900);
        }
        post({ type: 'cak3d-laptop', action: 'ready' });
    }

    window.CAK3D = {
        h: h, icon: icon, esc: esc, store: store, post: post, inRoom: inRoom, isPhone: isPhone, say: say,
        register: register, apps: apps, open: open, windowsOf: windowsOf, toast: toast,
        showMenu: showMenu, closeMenu: closeMenu,
        settings: settings, setSetting: setSetting, resetSettings: resetSettings, isDaytime: isDaytime, wallIsDark: wallIsDark, onSettings: function (f) { setListeners.push(f); }, WALLS: WALLS, ACCENTS: ACCENTS,
        onStereo: function (f) { stereoListeners.push(f); }, fmState: function () { return fmState; },
        wikiSearch: wikiSearch, wikiUrl: wikiUrl, stripTags: stripTags, looksLikeUrl: looksLikeUrl, getWeather: getWeather,
        openUrl: function (u) { return openUrl(u); },
        lock: lock, unlock: unlock, boot: boot, updateMenubar: updateMenubar, renderDock: renderDock,
        offSettings: function (f) { setListeners = setListeners.filter(function (x) { return x !== f; }); },
        offStereo: function (f) { stereoListeners = stereoListeners.filter(function (x) { return x !== f; }); }
    };
    function openUrl(u) { return apps.safari.openUrl(u); }
})();
