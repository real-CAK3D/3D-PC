/* CAK3D OS X apps: Safari, Screen Sharing, Finder, Notes, Calculator,
 * System Settings, Photos, Paint and About. */
(function () {
    'use strict';
    var C = window.CAK3D, D = window.CAK3D_DATA, I = window.ICONS;
    var h = C.h, icon = C.icon;

    /* ======================= Safari ======================= */
    // Sites that refuse to be framed (X-Frame-Options / CSP) or can't load in one
    function blockedReason(u) {
        var url;
        try { url = new URL(u); } catch (e) { return 'That address doesn’t look right.'; }
        var host = url.hostname.replace(/^www\./, '');
        if (url.protocol === 'http:' && location.protocol === 'https:') {
            if (/\.ts\.net$/.test(host)) return host + ' is on the tailnet over plain http, which a secure page can’t show.';
            return 'This page isn’t secure (http), so it can’t load inside a secure page.';
        }
        if (/(^|\.)github\.com$/.test(host)) return 'GitHub doesn’t allow its pages inside other sites.';
        if (/(^|\.)google\.[a-z.]+$/.test(host)) return 'Google doesn’t allow its pages inside other sites.';
        if (/(^|\.)youtube\.com$/.test(host) && !/^\/embed\//.test(url.pathname)) return 'YouTube pages can’t be framed, but the video can play here.';
        if (host === 'youtu.be') return 'YouTube pages can’t be framed, but the video can play here.';
        if (host === 'arachnotes-web.vercel.app') return 'Arachnotes’ website doesn’t allow being framed.';
        var refuse = ['duckduckgo.com', 'bing.com', 'discord.com', 'discord.gg', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'reddit.com', 'linkedin.com',
            'paypal.me', 'paypal.com', 'patreon.com', 'open.spotify.com', 'buymeacoffee.com', 'amazon.com', 'netflix.com', 'chatgpt.com', 'claude.ai', 'vercel.com'];
        for (var i = 0; i < refuse.length; i++) if (host === refuse[i] || host.slice(-refuse[i].length - 1) === '.' + refuse[i]) return host + ' doesn’t allow being shown inside other sites.';
        return '';
    }
    function youtubeId(u) {
        try {
            var url = new URL(u);
            if (url.hostname === 'youtu.be') return url.pathname.slice(1);
            if (/youtube\.com$/.test(url.hostname)) return url.searchParams.get('v') || (url.pathname.match(/^\/(?:shorts|live)\/([\w-]+)/) || [])[1] || '';
        } catch (e) { /* bad url */ }
        return '';
    }
    function normalizeUrl(q) {
        q = q.trim();
        if (/^(https?:|about:)/i.test(q)) return q;
        if (/^localhost|^127\.|^\[::1\]/.test(q)) return 'http://' + q;
        return 'https://' + q;
    }
    function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } }
    function realTab(u) { window.open(u, '_blank', 'noopener'); }
    var FRAME_SANDBOX = 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads allow-pointer-lock allow-presentation';
    var FRAME_ALLOW = 'autoplay; fullscreen; clipboard-write; gamepad; encrypted-media; picture-in-picture';

    var tabSeq = 0;
    function Safari(win) {
        var self = this;
        this.win = win;
        this.tabs = [];
        this.cur = null;
        var back = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Back', text: '‹', style: 'font-size:22px' });
        var fwd = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Forward', text: '›', style: 'font-size:22px' });
        var reload = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Reload', text: '↻' });
        var home = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Start Page', text: '⌂' });
        var addr = h('input', { class: 'field', type: 'text', placeholder: 'Search or enter website name', 'aria-label': 'Address and search', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'go' });
        var form = h('form', { role: 'search' }, addr);
        var ext = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Open this page in a new browser tab', title: 'Open in a new browser tab', text: '↗' });
        var newTab = h('button', { class: 'br-new', type: 'button', 'aria-label': 'New tab', text: '+' });
        this.tabbar = h('div', { class: 'br-tabs', role: 'tablist', 'aria-label': 'Tabs' }, newTab);
        this.views = h('div', { class: 'br-views' });
        this.addr = addr; this.back = back; this.fwd = fwd;
        win.body.appendChild(h('div', { class: 'br-bar' }, back, fwd, reload, home, form, ext));
        win.body.appendChild(this.tabbar);
        win.body.appendChild(this.views);
        back.addEventListener('click', function () { self.go(-1); });
        fwd.addEventListener('click', function () { self.go(1); });
        reload.addEventListener('click', function () { if (self.cur) self.render(self.cur); });
        home.addEventListener('click', function () { if (self.cur) self.navigate(self.cur, { type: 'home' }); });
        ext.addEventListener('click', function () {
            var e = self.cur && self.cur.entries[self.cur.idx];
            if (!e) return;
            if (e.type === 'url') realTab(e.url);
            else if (e.type === 'search') realTab('https://duckduckgo.com/?q=' + encodeURIComponent(e.q));
        });
        newTab.addEventListener('click', function () { self.addTab({ type: 'home' }); self.addr.focus(); });
        addr.addEventListener('focus', function () { addr.select(); });
        form.addEventListener('submit', function (e) { e.preventDefault(); self.submit(addr.value); });
    }
    Safari.prototype.submit = function (text, tab) {
        text = (text || '').trim();
        tab = tab || this.cur;
        if (!text) return;
        if (C.looksLikeUrl(text)) this.navigate(tab, { type: 'url', url: normalizeUrl(text) });
        else this.navigate(tab, { type: 'search', q: text });
        if (document.activeElement === this.addr) this.addr.blur();
    };
    Safari.prototype.addTab = function (entry) {
        var self = this;
        var tab = { id: ++tabSeq, entries: [], idx: -1, title: 'Start Page' };
        tab.view = h('div', { class: 'br-view', role: 'tabpanel' });
        var label = h('span', { class: 'tt', text: 'Start Page' });
        var x = h('span', { class: 'x', role: 'button', tabindex: '-1', 'aria-label': 'Close tab', text: '×' });
        tab.btn = h('button', { class: 'br-tab', type: 'button', role: 'tab', 'aria-selected': 'false' }, label, x);
        tab.label = label;
        tab.btn.addEventListener('click', function (e) { if (e.target === x) self.closeTab(tab); else self.select(tab); });
        tab.btn.addEventListener('auxclick', function (e) { if (e.button === 1) self.closeTab(tab); });
        tab.btn.addEventListener('keydown', function (e) { if (e.key === 'Delete') self.closeTab(tab); });
        this.tabbar.insertBefore(tab.btn, this.tabbar.lastChild);
        this.views.appendChild(tab.view);
        this.tabs.push(tab);
        this.select(tab);
        this.navigate(tab, entry || { type: 'home' });
        return tab;
    };
    Safari.prototype.select = function (tab) {
        this.cur = tab;
        this.tabs.forEach(function (t) {
            t.view.hidden = t !== tab;
            t.btn.classList.toggle('on', t === tab);
            t.btn.setAttribute('aria-selected', String(t === tab));
        });
        this.sync();
    };
    Safari.prototype.closeTab = function (tab) {
        var i = this.tabs.indexOf(tab);
        if (i < 0) return;
        tab.view.querySelectorAll('iframe').forEach(function (f) { f.src = 'about:blank'; });
        tab.view.remove();
        tab.btn.remove();
        this.tabs.splice(i, 1);
        if (!this.tabs.length) { this.win.close(); return; }
        if (this.cur === tab) this.select(this.tabs[Math.max(0, i - 1)]);
    };
    Safari.prototype.navigate = function (tab, entry) {
        tab.entries = tab.entries.slice(0, tab.idx + 1);
        tab.entries.push(entry);
        tab.idx = tab.entries.length - 1;
        this.render(tab);
    };
    Safari.prototype.go = function (d) {
        var t = this.cur;
        if (!t) return;
        var n = t.idx + d;
        if (n < 0 || n >= t.entries.length) return;
        t.idx = n;
        this.render(t);
    };
    Safari.prototype.setTitle = function (tab, title) {
        tab.title = title;
        tab.label.textContent = title;
        tab.btn.title = title;
        if (tab === this.cur) this.win.setTitle(title + ' — Safari');
    };
    Safari.prototype.sync = function () {
        var t = this.cur;
        if (!t) return;
        var e = t.entries[t.idx] || { type: 'home' };
        if (document.activeElement !== this.addr) this.addr.value = e.type === 'url' ? e.url : e.type === 'search' ? e.q : '';
        this.back.disabled = t.idx <= 0;
        this.fwd.disabled = t.idx >= t.entries.length - 1;
        this.win.setTitle(t.title + ' — Safari');
    };
    Safari.prototype.render = function (tab) {
        var self = this;
        var e = tab.entries[tab.idx];
        var v = tab.view;
        v.querySelectorAll('iframe').forEach(function (f) { f.src = 'about:blank'; });
        v.textContent = '';
        v.scrollTop = 0;
        if (e.type !== 'home' && !C.settings.wifi) {
            this.setTitle(tab, 'Not Connected');
            v.appendChild(card('📡', 'You Are Not Connected to the Internet', 'Wi-Fi is turned off. Turn it on in Control Center to browse.', [
                h('button', { class: 'btn primary', type: 'button', text: 'Turn Wi-Fi On', onclick: function () { C.setSetting('wifi', true); self.render(tab); } })
            ]));
        } else if (e.type === 'home') this.renderHome(tab, v);
        else if (e.type === 'search') this.renderSearch(tab, v, e.q);
        else this.renderUrl(tab, v, e.url);
        if (tab === this.cur) this.sync();
    };
    Safari.prototype.renderHome = function (tab, v) {
        var self = this;
        this.setTitle(tab, 'Start Page');
        var input = h('input', { class: 'field', type: 'search', placeholder: 'Search Wikipedia or enter a website', 'aria-label': 'Search or enter website', enterkeyhint: 'search' });
        var form = h('form', { role: 'search', onsubmit: function (ev) { ev.preventDefault(); self.submit(input.value, tab); } }, input);
        var grid = h('div', { class: 'qlinks' });
        D.quickLinks.forEach(function (q) {
            grid.appendChild(h('button', { class: 'qlink', type: 'button', title: q.url, onclick: function () { self.navigate(tab, { type: 'url', url: q.url }); } },
                h('span', { class: 'e', text: q.emoji, 'aria-hidden': 'true' }), h('span', { text: q.name })));
        });
        v.appendChild(h('div', { class: 'br-home' },
            h('div', { class: 'brand' }, h('span', { class: 'logo', html: I.browser }), 'Favorites'),
            form, grid,
            h('p', { class: 'muted', style: 'font-size:12px;margin-top:22px;text-align:center', text: 'Searches show Wikipedia results here. Some sites refuse to open inside a window; those get a button to open them in a real browser tab.' })));
    };
    Safari.prototype.renderSearch = function (tab, v, q) {
        var self = this;
        this.setTitle(tab, q + ' — Search');
        var list = h('div', { 'aria-live': 'polite' }, h('p', { class: 'muted', text: 'Searching Wikipedia…' }));
        v.appendChild(h('div', { class: 'br-results' },
            h('h2', { style: 'font-weight:400;font-size:20px;margin:0 0 6px' }, 'Results for “', q, '”'),
            h('div', { class: 'engines' },
                h('button', { class: 'btn primary', type: 'button', text: '🦆 Search the web (DuckDuckGo)', onclick: function () { realTab('https://duckduckgo.com/?q=' + encodeURIComponent(q)); } }),
                h('button', { class: 'btn', type: 'button', text: '🌐 Search Google', onclick: function () { realTab('https://www.google.com/search?q=' + encodeURIComponent(q)); } }),
                h('button', { class: 'btn', type: 'button', text: '📚 All Wikipedia results', onclick: function () { self.navigate(tab, { type: 'url', url: 'https://en.m.wikipedia.org/w/index.php?search=' + encodeURIComponent(q) + '&fulltext=1' }); } })),
            h('p', { class: 'muted', style: 'font-size:12px;margin:0 0 14px', text: 'Web search engines open in a new browser tab (they can’t be shown inside a window).' }),
            list));
        C.wikiSearch(q, 10).then(function (res) {
            list.textContent = '';
            if (!res.length) { list.appendChild(h('p', { class: 'muted', text: 'No Wikipedia articles matched. Try the web search buttons above.' })); return; }
            res.forEach(function (r) {
                var url = C.wikiUrl(r.title);
                var snip = h('p');
                // the API marks matches with <span class="searchmatch">; keep only that markup
                snip.innerHTML = String(r.snippet || '').replace(/<(?!\/?span( class="searchmatch")?>)[^>]*>/g, '');
                list.appendChild(h('div', { class: 'br-result' },
                    h('button', { class: 't', type: 'button', text: r.title, onclick: function () { self.navigate(tab, { type: 'url', url: url }); } }),
                    h('div', { class: 'u', text: 'en.wikipedia.org › wiki › ' + r.title }), snip));
            });
        }).catch(function () {
            list.textContent = '';
            list.appendChild(h('p', { class: 'muted', text: 'Couldn’t reach Wikipedia. Check the connection, or use the web search buttons above.' }));
        });
    };
    Safari.prototype.renderUrl = function (tab, v, url) {
        var self = this;
        var host = hostOf(url);
        this.setTitle(tab, host);
        var reason = blockedReason(url);
        if (reason) {
            var yt = youtubeId(url);
            var actions = [h('button', { class: 'btn primary', type: 'button', text: 'Open in a new tab ↗', onclick: function () { realTab(url); } })];
            if (yt) actions.unshift(h('button', { class: 'btn green', type: 'button', text: '▶ Play the video here', onclick: function () { self.navigate(tab, { type: 'url', url: 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(yt) + '?autoplay=1&rel=0' }); } }));
            actions.push(h('button', { class: 'btn', type: 'button', text: 'Go Back', onclick: function () { if (tab.idx > 0) self.go(-1); else self.navigate(tab, { type: 'home' }); } }));
            v.appendChild(card('🪟', host + ' opens in its own tab', reason, actions));
            return;
        }
        var frame = h('iframe', { title: host, src: url, sandbox: FRAME_SANDBOX, allow: FRAME_ALLOW, referrerpolicy: 'strict-origin-when-cross-origin' });
        v.appendChild(h('div', { class: 'br-framebar' },
            h('span', { text: '🔒 ' + host }),
            h('span', { style: 'margin-left:auto', text: 'Blank page?' }),
            h('button', { class: 'linklike', type: 'button', text: 'Open in a new tab ↗', onclick: function () { realTab(url); } })));
        v.appendChild(frame);
    };
    function card(emoji, title, text, actions) {
        return h('div', { class: 'card', role: 'alert' }, h('div', { class: 'big', text: emoji, 'aria-hidden': 'true' }), h('h2', { text: title }), h('p', { text: text }),
            h('div', { style: 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap' }, actions));
    }

    C.register('safari', {
        name: 'Safari', icon: 'browser', keywords: 'browser web internet edge chrome search wikipedia', w: 1000, h: 660,
        open: function (win, opts) {
            var s = new Safari(win);
            win.data.safari = s;
            if (opts.url) s.addTab({ type: 'url', url: normalizeUrl(opts.url) });
            else if (opts.search) s.addTab({ type: 'search', q: opts.search });
            else { s.addTab({ type: 'home' }); setTimeout(function () { s.addr.focus(); }, 50); }
        },
        menus: function (win) {
            var s = win.data.safari;
            return {
                File: [
                    { label: 'New Tab', action: function () { s.addTab({ type: 'home' }); s.addr.focus(); } },
                    { label: 'Open Location…', action: function () { s.addr.focus(); } },
                    { label: 'Close Tab', disabled: !s.cur, action: function () { s.closeTab(s.cur); } }
                ],
                View: [
                    { label: 'Reload Page', action: function () { s.render(s.cur); } },
                    { label: 'Start Page', action: function () { s.navigate(s.cur, { type: 'home' }); } },
                    { label: 'Back', action: function () { s.go(-1); } },
                    { label: 'Forward', action: function () { s.go(1); } }
                ]
            };
        },
        openUrl: function (u) {
            if (!u) return null;
            var ws = C.windowsOf('safari');
            if (ws.length) {
                var w = ws[ws.length - 1];
                w.focus();
                w.data.safari.addTab({ type: 'url', url: normalizeUrl(u) });
                return w;
            }
            return C.open('safari', { url: u });
        }
    });
    C.safariHelpers = { blockedReason: blockedReason, normalizeUrl: normalizeUrl };

    /* ======================= Screen Sharing ======================= */
    C.register('screenshare', {
        name: 'Screen Sharing', icon: 'pc', keywords: 'this pc cak3d pc computer desktop remote', w: 1080, h: 700, single: true,
        open: function (win) {
            win.setTitle('Screen Sharing: CAK3D PC');
            var frame = h('iframe', { class: 'appframe', title: 'CAK3D PC desktop', src: D.INNER_PC_URL, allow: FRAME_ALLOW });
            win.body.appendChild(h('div', { class: 'toolbar' },
                h('span', { class: 'status-pill ok', text: '● Connected to CAK3D PC' }),
                h('span', { class: 'muted', style: 'font-size:12px;margin-left:6px', text: 'The room’s PC, live. Everything on it works from here.' }),
                h('span', { style: 'flex:1' }),
                h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Reload the PC', title: 'Reload', text: '↻', onclick: function () { frame.src = D.INNER_PC_URL; } }),
                h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Open the PC in a new browser tab', title: 'Open in a new tab', text: '↗', onclick: function () { realTab(D.INNER_PC_URL); } })));
            win.body.appendChild(frame);
        }
    });

    /* ======================= Notes ======================= */
    var README = 'Read Me\n\nWelcome to CAK3D OS X, the laptop in the Garden.\n\n• Safari browses the web and CAK3D’s sites (searches show Wikipedia results).\n• Screen Sharing drives the room’s PC.\n• TV watches the room’s channels here, or works as a remote for the real TV.\n• CAK3D FM opens the stereo.\n• Finder has the Apps, Sites, Papers and Pictures.\n• Terminal: type help.\n\nShortcuts: Ctrl+Space Spotlight · Alt+W close window · Alt+M minimize · Alt+` cycle windows · Alt+L Launchpad.\n\nNotes save on this device automatically.';
    function loadNotes() {
        var n = C.store.get('notes', null);
        if (!Array.isArray(n) || !n.length) n = [{ id: 'readme', text: README, updated: Date.now() }];
        return n;
    }
    function noteTitle(n) { var t = (n.text || '').split('\n')[0].trim(); return t || 'New Note'; }
    C.notes = { list: loadNotes, title: noteTitle };
    C.register('notes', {
        name: 'Notes', icon: 'notes', keywords: 'notepad text editor write', w: 760, h: 500, single: true,
        open: function (win, opts) {
            var notes = loadNotes();
            var cur = null;
            var list = h('div', { class: 'ex-side', role: 'listbox', 'aria-label': 'Notes', style: 'width:200px' });
            var text = h('textarea', { class: 'np-text', 'aria-label': 'Note text', spellcheck: 'true' });
            var status = h('span', { text: '' });
            var count = h('span', { text: '' });
            var saveTimer = 0;
            var save = function () {
                var ok = C.store.set('notes', notes);
                status.textContent = ok ? 'Saved on this device' : 'Couldn’t save: storage is blocked in this browser';
            };
            var draw = function () {
                list.textContent = '';
                list.appendChild(h('h4', { text: 'On My Laptop' }));
                notes.slice().sort(function (a, b) { return b.updated - a.updated; }).forEach(function (n) {
                    list.appendChild(h('button', { type: 'button', role: 'option', 'aria-selected': String(n === cur), class: n === cur ? 'on' : '', onclick: function () { pick(n); } },
                        h('span', { style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap', text: noteTitle(n) })));
                });
            };
            var pick = function (n) {
                cur = n;
                text.value = n.text;
                count.textContent = n.text.length + ' characters';
                draw();
            };
            var add = function () {
                var n = { id: 'n' + Date.now(), text: '', updated: Date.now() };
                notes.push(n);
                pick(n);
                save();
                text.focus();
            };
            var del = function () {
                if (!cur) return;
                notes = notes.filter(function (n) { return n !== cur; });
                if (!notes.length) notes.push({ id: 'n' + Date.now(), text: '', updated: Date.now() });
                save();
                pick(notes[0]);
            };
            text.addEventListener('input', function () {
                if (!cur) return;
                cur.text = text.value;
                cur.updated = Date.now();
                count.textContent = text.value.length + ' characters';
                status.textContent = 'Editing…';
                clearTimeout(saveTimer);
                saveTimer = setTimeout(function () { save(); draw(); }, 400);
            });
            var wrap = true;
            var size = 14;
            win.body.appendChild(h('div', { class: 'np-menu' },
                h('button', { type: 'button', text: '＋ New Note', onclick: add }),
                h('button', { type: 'button', text: '🗑 Delete', onclick: del }),
                h('button', { type: 'button', text: 'Wrap', 'aria-pressed': 'true', onclick: function (e) { wrap = !wrap; text.classList.toggle('nowrap', !wrap); e.currentTarget.setAttribute('aria-pressed', String(wrap)); } }),
                h('button', { type: 'button', text: 'A−', 'aria-label': 'Smaller text', onclick: function () { size = Math.max(10, size - 1); text.style.fontSize = size + 'px'; } }),
                h('button', { type: 'button', text: 'A+', 'aria-label': 'Bigger text', onclick: function () { size = Math.min(28, size + 1); text.style.fontSize = size + 'px'; } })));
            win.body.appendChild(h('div', { class: 'ex' }, list, h('div', { style: 'flex:1;display:flex;flex-direction:column;min-width:0' }, text)));
            win.body.appendChild(h('div', { class: 'statusbar' }, status, count));
            win.data.add = add;
            win.data.pickTitle = function (t) {
                var n = notes.filter(function (x) { return noteTitle(x) === t || (t === 'Read Me.txt' && x.id === 'readme'); })[0];
                if (n) pick(n);
            };
            win.onClose(function () { clearTimeout(saveTimer); if (cur) save(); });
            pick(notes.filter(function (n) { return n.id === 'readme'; })[0] || notes[0]);
            this.reopen(win, opts);
        },
        reopen: function (win, opts) {
            if (opts.newFile) win.data.add();
            else if (opts.file) win.data.pickTitle(opts.file);
        },
        menus: function (win) { return { File: [{ label: 'New Note', action: function () { win.data.add(); } }] }; }
    });

    /* ======================= Finder ======================= */
    var FOLDERS = [
        { id: 'home', name: 'CAK3D HD', icon: 'disk' },
        { id: 'apps', name: 'Apps', icon: 'folderPurple' },
        { id: 'sites', name: 'Sites', icon: 'folderGreen' },
        { id: 'papers', name: 'Papers', icon: 'folder' },
        { id: 'pictures', name: 'Pictures', icon: 'folder' },
        { id: 'documents', name: 'Documents', icon: 'folder' },
        { id: 'trash', name: 'Trash', icon: 'bin' }
    ];
    function folderItems(id) {
        if (id === 'home') return FOLDERS.filter(function (f) { return f.id !== 'home' && f.id !== 'trash'; }).map(function (f) { return { name: f.name, kind: 'Folder', icon: f.icon, folder: f.id, info: '' }; });
        if (id === 'apps') return D.featured.map(function (p) { return { name: p.name, kind: 'Featured' + (p.language ? ' · ' + p.language : ''), icon: p.url ? 'link' : 'code', desc: p.description, url: p.url, repo: p.repo, info: p.language || '' }; })
            .concat(D.apps.map(function (p) { return { name: p.name, kind: (p.language || 'Project'), icon: p.url ? 'link' : 'code', desc: p.description, url: p.url, repo: p.repo, info: p.url ? hostOf(p.url) : 'GitHub' }; }));
        if (id === 'sites') return D.sites.map(function (s) { return { name: s.name, kind: 'Website', icon: 'link', desc: s.note || '', url: s.url, repo: s.repo, info: hostOf(s.url) }; });
        if (id === 'papers') return D.papers.map(function (p) { return { name: p.name, kind: 'Paper · ' + p.when, paper: p, desc: p.motto + ' (by ' + p.by + ')', url: p.repo || D.NEWSSTAND_URL, repo: p.repo, newsstand: true, info: p.when }; });
        if (id === 'pictures') return D.pictures.map(function (p) { return { name: p.name, kind: 'JPEG image', picture: p, info: 'Photo' }; });
        if (id === 'documents') return C.notes.list().map(function (n) { return { name: C.notes.title(n), kind: 'Note', icon: 'doc', note: n, info: new Date(n.updated).toLocaleDateString() }; });
        return [];
    }
    function openItem(it, win) {
        if (it.folder) { win.data.go(it.folder); return; }
        if (it.picture) { C.open('photos', { src: it.picture.src, name: it.picture.name }); return; }
        if (it.note) { C.open('notes', { file: C.notes.title(it.note) }); return; }
        C.openUrl(it.url || it.repo);
    }
    C.register('finder', {
        name: 'Finder', icon: 'finder', keywords: 'files explorer folders projects apps sites papers pictures', w: 860, h: 520,
        open: function (win, opts) {
            var hist = [], hi = -1, folder = 'home', view = 'icons', sel = null, filter = '';
            var side = h('nav', { class: 'ex-side', 'aria-label': 'Sidebar' });
            var main = h('div', { class: 'ex-main', role: 'region', 'aria-label': 'Folder contents' });
            var details = h('aside', { class: 'ex-details', 'aria-label': 'Details' });
            var back = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Back', text: '‹', style: 'font-size:22px' });
            var fwd = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Forward', text: '›', style: 'font-size:22px' });
            var crumb = h('strong', { class: 'crumbs', text: '' });
            var vIcons = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Icon view', 'aria-pressed': 'true', text: '▦' });
            var vList = h('button', { class: 'ibtn', type: 'button', 'aria-label': 'List view', 'aria-pressed': 'false', text: '☰' });
            var search = h('input', { class: 'field', type: 'search', placeholder: 'Search', 'aria-label': 'Search this folder', style: 'width:150px' });
            win.body.appendChild(h('div', { class: 'toolbar' }, back, fwd, crumb, vIcons, vList, search));
            win.body.appendChild(h('div', { class: 'ex' }, side, main, details));
            var status = h('div', { class: 'statusbar' });
            win.body.appendChild(status);

            side.appendChild(h('h4', { text: 'Favorites' }));
            FOLDERS.forEach(function (f) {
                if (f.id === 'trash') side.appendChild(h('h4', { text: 'Locations' }));
                side.appendChild(h('button', { type: 'button', 'data-f': f.id, onclick: function () { go(f.id); } }, icon(f.icon), h('span', { text: f.name })));
            });
            side.appendChild(h('button', { type: 'button', onclick: function () { C.open('screenshare'); } }, icon('pc'), h('span', { text: 'CAK3D PC' })));

            function go(id, noHist) {
                folder = id; sel = null; filter = ''; search.value = '';
                if (!noHist) { hist = hist.slice(0, hi + 1); hist.push(id); hi = hist.length - 1; }
                draw();
            }
            win.data.go = go;
            function showDetails(it) {
                details.textContent = '';
                if (!it) {
                    var f = FOLDERS.filter(function (x) { return x.id === folder; })[0];
                    details.appendChild(h('div', { style: 'width:64px;height:64px', html: I[f.icon] }));
                    details.appendChild(h('h3', { text: f.name }));
                    details.appendChild(h('p', { text: folderItems(folder).length + ' items' }));
                    return;
                }
                if (it.paper) details.appendChild(h('div', { class: 'swatch', style: 'width:70px;height:88px;border-radius:3px;display:grid;place-items:center;font-weight:800;padding:6px;text-align:center;font-size:11px;background:' + it.paper.color + ';color:' + it.paper.ink, text: it.name }));
                else if (it.picture) details.appendChild(h('img', { src: it.picture.src, alt: it.name, style: 'width:100%;border-radius:4px' }));
                else details.appendChild(h('div', { style: 'width:64px;height:64px', html: I[it.icon] || I.doc }));
                details.appendChild(h('h3', { text: it.name }));
                details.appendChild(h('div', { class: 'muted', style: 'font-size:12px', text: it.kind }));
                if (it.desc) details.appendChild(h('p', { text: it.desc }));
                var acts = h('div', { class: 'actions' });
                if (it.url && !it.newsstand) acts.appendChild(h('button', { class: 'btn primary', type: 'button', text: 'Open ' + hostOf(it.url), onclick: function () { C.openUrl(it.url); } }));
                if (it.newsstand) acts.appendChild(h('button', { class: 'btn primary', type: 'button', text: 'Open in the NewsStand', onclick: function () { C.openUrl(D.NEWSSTAND_URL); } }));
                if (it.repo) acts.appendChild(h('button', { class: 'btn', type: 'button', text: 'View on GitHub', onclick: function () { C.openUrl(it.repo); } }));
                if (it.folder || it.picture || it.note) acts.appendChild(h('button', { class: 'btn primary', type: 'button', text: 'Open', onclick: function () { openItem(it, win); } }));
                details.appendChild(acts);
            }
            function draw() {
                var f = FOLDERS.filter(function (x) { return x.id === folder; })[0];
                crumb.textContent = f.name;
                win.setTitle(f.name);
                back.disabled = hi <= 0; fwd.disabled = hi >= hist.length - 1;
                side.querySelectorAll('button[data-f]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-f') === folder); });
                var items = folderItems(folder).filter(function (it) { return !filter || (it.name + ' ' + (it.desc || '') + ' ' + it.kind).toLowerCase().indexOf(filter) >= 0; });
                main.textContent = '';
                status.textContent = items.length + ' item' + (items.length === 1 ? '' : 's') + (folder === 'documents' ? ' · notes saved on this device' : '');
                if (!items.length) {
                    main.appendChild(h('p', { class: 'muted', style: 'text-align:center;margin-top:60px', text: folder === 'trash' ? 'Trash is empty.' : 'No items.' }));
                    showDetails(null);
                    return;
                }
                var lastTouch = false;
                var bind = function (el, it) {
                    el.addEventListener('pointerdown', function (e) { lastTouch = e.pointerType !== 'mouse'; });
                    el.addEventListener('click', function (e) {
                        sel = it;
                        main.querySelectorAll('.sel').forEach(function (x) { x.classList.remove('sel'); });
                        el.classList.add('sel');
                        showDetails(it);
                        if (lastTouch || e.detail === 0) openItem(it, win);
                    });
                    el.addEventListener('dblclick', function () { if (!lastTouch) openItem(it, win); });
                    el.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter' && el.tagName === 'TR') { e.preventDefault(); openItem(it, win); }
                        var all = Array.prototype.slice.call(main.querySelectorAll('[data-item]'));
                        var i = all.indexOf(el);
                        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); if (all[i + 1]) all[i + 1].focus(); }
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); if (all[i - 1]) all[i - 1].focus(); }
                        if (e.key === 'Backspace' && hi > 0) { e.preventDefault(); hi--; go(hist[hi], true); }
                    });
                    el.addEventListener('focus', function () { showDetails(it); });
                };
                var thumb = function (it) {
                    if (it.paper) return h('span', { class: 'swatch', style: 'background:' + it.paper.color + ';color:' + it.paper.ink, text: it.name.replace(/^The /, ''), 'aria-hidden': 'true' });
                    if (it.picture) return h('img', { class: 'thumb', src: it.picture.src, alt: '', loading: 'lazy' });
                    return icon(it.icon);
                };
                if (view === 'icons') {
                    var grid = h('div', { class: 'ex-grid', role: 'list' });
                    items.forEach(function (it) {
                        var b = h('button', { class: 'ex-item', type: 'button', role: 'listitem', 'data-item': '1', title: it.desc || it.name }, thumb(it), h('span', { text: it.name }));
                        bind(b, it);
                        grid.appendChild(b);
                    });
                    main.appendChild(grid);
                } else {
                    var tb = h('tbody');
                    items.forEach(function (it) {
                        var nm = h('div', { class: 'nm' }, it.paper ? h('span', { class: 'ic', style: 'background:' + it.paper.color + ';border-radius:2px', 'aria-hidden': 'true' }) : icon(it.picture ? 'photos' : it.icon), h('span', { text: it.name }));
                        var tr = h('tr', { class: 'row', tabindex: '0', 'data-item': '1' }, h('td', null, nm), h('td', { class: 'muted', text: it.kind }), h('td', { class: 'muted', text: it.info || '' }));
                        bind(tr, it);
                        tb.appendChild(tr);
                    });
                    main.appendChild(h('table', { class: 'ex-list' }, h('thead', null, h('tr', null, h('th', { text: 'Name' }), h('th', { text: 'Kind' }), h('th', { text: 'Info' }))), tb));
                }
                showDetails(sel);
            }
            back.addEventListener('click', function () { if (hi > 0) { hi--; go(hist[hi], true); } });
            fwd.addEventListener('click', function () { if (hi < hist.length - 1) { hi++; go(hist[hi], true); } });
            vIcons.addEventListener('click', function () { view = 'icons'; vIcons.setAttribute('aria-pressed', 'true'); vList.setAttribute('aria-pressed', 'false'); draw(); });
            vList.addEventListener('click', function () { view = 'list'; vList.setAttribute('aria-pressed', 'true'); vIcons.setAttribute('aria-pressed', 'false'); draw(); });
            search.addEventListener('input', function () { filter = search.value.trim().toLowerCase(); var keep = search.value; draw(); search.value = keep; });
            go(opts.folder || 'home');
        },
        menus: function (win) {
            return {
                File: [{ label: 'Go to Apps', action: function () { win.data.go('apps'); } }, { label: 'Go to Sites', action: function () { win.data.go('sites'); } },
                    { label: 'Go to Papers', action: function () { win.data.go('papers'); } }, { label: 'Go to Pictures', action: function () { win.data.go('pictures'); } }]
            };
        }
    });

    /* ======================= Calculator ======================= */
    C.register('calc', {
        name: 'Calculator', icon: 'calc', keywords: 'math numbers', w: 300, h: 440,
        open: function (win) {
            var cur = '0', acc = null, op = null, fresh = true, lastOp = null, lastVal = null;
            var exprEl = h('div', { class: 'expr', 'aria-hidden': 'true' });
            var valEl = h('div', { class: 'val', role: 'status', 'aria-live': 'polite' });
            var fmt = function (n) {
                if (!isFinite(n)) return 'Error';
                var s = String(+n.toPrecision(12));
                if (s.length > 14) s = (+n).toExponential(6);
                return s;
            };
            var sym = { '+': '+', '-': '−', '*': '×', '/': '÷' };
            var show = function () { valEl.textContent = cur; exprEl.textContent = acc != null && op ? fmt(acc) + ' ' + sym[op] : ''; acBtn.textContent = cur !== '0' || acc != null ? 'C' : 'AC'; };
            var calc = function (a, o, b) { return o === '+' ? a + b : o === '-' ? a - b : o === '*' ? a * b : b === 0 ? NaN : a / b; };
            var input = function (k) {
                if (cur === 'Error') { cur = '0'; acc = null; op = null; fresh = true; }
                if (/^[0-9]$/.test(k)) { cur = fresh || cur === '0' ? k : (cur.length < 15 ? cur + k : cur); fresh = false; }
                else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (cur.indexOf('.') < 0) cur += '.'; }
                else if (k === 'AC') { if (acBtn.textContent === 'C' && cur !== '0') { cur = '0'; fresh = true; } else { cur = '0'; acc = null; op = null; fresh = true; } }
                else if (k === '±') { if (cur !== '0') cur = cur.charAt(0) === '-' ? cur.slice(1) : '-' + cur; }
                else if (k === '%') { cur = fmt(parseFloat(cur) / 100); fresh = true; }
                else if (k === '⌫') { if (!fresh) { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; if (cur === '-') cur = '0'; } }
                else if (sym[k]) {
                    if (op && !fresh) { acc = calc(acc, op, parseFloat(cur)); cur = fmt(acc); }
                    else if (acc == null || !op) acc = parseFloat(cur);
                    op = k; fresh = true;
                } else if (k === '=') {
                    if (op) { lastOp = op; lastVal = parseFloat(cur); cur = fmt(calc(acc, op, lastVal)); acc = null; op = null; }
                    else if (lastOp) cur = fmt(calc(parseFloat(cur), lastOp, lastVal));
                    fresh = true;
                }
                show();
            };
            var keys = h('div', { class: 'keys' });
            var acBtn;
            [['AC', 'fn'], ['±', 'fn'], ['%', 'fn'], ['/', 'op'], ['7', 'num'], ['8', 'num'], ['9', 'num'], ['*', 'op'], ['4', 'num'], ['5', 'num'], ['6', 'num'], ['-', 'op'],
                ['1', 'num'], ['2', 'num'], ['3', 'num'], ['+', 'op'], ['0', 'num zero'], ['.', 'num'], ['=', 'eq']].forEach(function (k) {
                var b = h('button', { type: 'button', class: k[1], text: sym[k[0]] || k[0], 'aria-label': { '/': 'divide', '*': 'multiply', '-': 'minus', '+': 'plus', '=': 'equals', '±': 'plus minus', '%': 'percent', 'AC': 'clear' }[k[0]] || k[0], onclick: function () { input(k[0]); } });
                if (k[1] === 'op') b.className = 'eq';
                if (k[0] === '=') b.className = 'eq';
                if (k[0] === '0') b.style.gridColumn = 'span 2';
                if (k[0] === 'AC') acBtn = b;
                keys.appendChild(b);
            });
            var root = h('div', { class: 'calc', tabindex: '0', 'aria-label': 'Calculator. Type numbers and operators.' }, h('div', { class: 'disp' }, exprEl, valEl), keys);
            win.body.appendChild(root);
            win.el.addEventListener('keydown', function (e) {
                if (e.altKey || e.ctrlKey || e.metaKey) return;
                var k = e.key;
                var map = { Enter: '=', '=': '=', Escape: 'AC', Backspace: '⌫', Delete: 'AC', ',': '.', x: '*', X: '*' };
                if (map[k]) k = map[k];
                if (/^[0-9.%=]$/.test(k) || sym[k] || k === 'AC' || k === '⌫') {
                    if (k === '=' && e.target.tagName === 'BUTTON' && e.key === 'Enter') return; // Enter on a focused key presses it
                    e.preventDefault();
                    input(k);
                }
            });
            show();
            root.focus();
        }
    });

    /* ======================= System Settings ======================= */
    C.register('settings', {
        name: 'System Settings', icon: 'settings', keywords: 'preferences control panel wallpaper theme dark light accent appearance', w: 800, h: 540, single: true,
        open: function (win, opts) {
            var nav = h('nav', { 'aria-label': 'Settings sections' });
            var sec = h('section', { 'aria-live': 'polite' });
            win.body.appendChild(h('div', { class: 'set' }, nav, sec));
            var pages = {
                wallpaper: { name: '🖼  Wallpaper', draw: function () {
                    sec.appendChild(h('h2', { text: 'Wallpaper' }));
                    var g = h('div', { class: 'walls', role: 'radiogroup', 'aria-label': 'Wallpaper' });
                    C.WALLS.forEach(function (w) {
                        g.appendChild(h('button', { class: 'wall wall-' + w.id, type: 'button', role: 'radio', 'aria-checked': String(C.settings.wall === w.id), 'aria-label': w.name, onclick: function () { C.setSetting('wall', w.id); render('wallpaper'); } }, h('span', { text: w.name })));
                    });
                    sec.appendChild(g);
                } },
                appearance: { name: '🎨  Appearance', draw: function () {
                    sec.appendChild(h('h2', { text: 'Appearance' }));
                    sec.appendChild(h('h3', { text: 'Appearance' }));
                    var seg = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Appearance' });
                    [['light', 'Light'], ['dark', 'Dark']].forEach(function (t) {
                        seg.appendChild(h('button', { type: 'button', role: 'radio', 'aria-checked': String(C.settings.theme === t[0]), text: t[1], onclick: function () { C.setSetting('theme', t[0]); render('appearance'); } }));
                    });
                    sec.appendChild(seg);
                    sec.appendChild(h('h3', { text: 'Accent color' }));
                    var sw = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Accent color' });
                    C.ACCENTS.forEach(function (a) {
                        sw.appendChild(h('button', { class: 'swatch-btn', type: 'button', role: 'radio', title: a.n, 'aria-label': a.n, 'aria-checked': String(C.settings.accent === a.c), style: 'background:' + a.c, onclick: function () { C.setSetting('accent', a.c); render('appearance'); } }));
                    });
                    sec.appendChild(sw);
                    sec.appendChild(h('h3', { text: 'Desktop & Dock' }));
                    sec.appendChild(check('Translucent menu bar, Dock and panels (blur)', 'blur'));
                    sec.appendChild(check('Magnify Dock icons on hover', 'magnify'));
                } },
                displays: { name: '☀️  Displays', draw: function () {
                    sec.appendChild(h('h2', { text: 'Displays' }));
                    var r = h('input', { type: 'range', min: '0.3', max: '1', step: '0.05', value: String(C.settings.brightness), 'aria-label': 'Brightness', style: 'width:260px;accent-color:var(--accent)' });
                    r.addEventListener('input', function () { C.setSetting('brightness', +r.value); });
                    sec.appendChild(h('h3', { text: 'Brightness' }));
                    sec.appendChild(r);
                    sec.appendChild(h('h3', { text: 'Night Shift' }));
                    sec.appendChild(check('Warmer colors (Night Shift)', 'nightShift'));
                } },
                sound: { name: '🔊  Sound', draw: function () {
                    sec.appendChild(h('h2', { text: 'Sound' }));
                    var r = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(C.settings.volume), 'aria-label': 'Output volume', style: 'width:260px;accent-color:var(--accent)' });
                    r.addEventListener('input', function () { C.setSetting('volume', +r.value); });
                    sec.appendChild(h('h3', { text: 'Output volume (videos played on the laptop)' }));
                    sec.appendChild(r);
                    sec.appendChild(h('p', { class: 'muted', text: 'The room TV’s volume is on the TV app’s Remote tab.' }));
                } },
                notifications: { name: '🔔  Notifications', draw: function () {
                    sec.appendChild(h('h2', { text: 'Notifications' }));
                    sec.appendChild(check('Do Not Disturb (hide banners)', 'dnd'));
                } },
                network: { name: '📶  Wi-Fi', draw: function () {
                    sec.appendChild(h('h2', { text: 'Wi-Fi' }));
                    sec.appendChild(check('Wi-Fi (GardenNet 5G)', 'wifi'));
                    sec.appendChild(h('p', { class: 'muted', text: navigator.onLine ? 'This device is online.' : 'This device looks offline.' }));
                } },
                about: { name: '🌿  About', draw: function () {
                    sec.appendChild(h('h2', { text: 'About' }));
                    var kv = h('dl', { class: 'kv' });
                    var row = function (k, v) { kv.appendChild(h('dt', { text: k })); kv.appendChild(h('dd', { text: v })); };
                    row('Name', 'CAK3D’s Laptop');
                    row('System', 'CAK3D OS X 14.20 “Sonoma Haze”');
                    row('Chip', 'Garden Silicon G4.20');
                    row('Memory', (navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '8 GB') + ' unified');
                    row('Cores', String(navigator.hardwareConcurrency || 8));
                    row('Display', window.innerWidth + ' × ' + window.innerHeight + ' @ ' + (window.devicePixelRatio || 1) + 'x');
                    row('Running in', C.inRoom ? 'the 3D room (laptop screen)' : 'a browser tab');
                    row('Storage', C.store.set('probe', 1) ? 'Available' : 'Blocked (settings won’t be kept)');
                    sec.appendChild(kv);
                    sec.appendChild(h('div', { style: 'margin-top:18px' }, h('button', { class: 'btn', type: 'button', text: 'Reset all settings', onclick: function () {
                        C.store.set('settings', {});
                        Object.assign(C.settings, { theme: 'dark', accent: '#8a5cff', wall: 'haze', blur: true, nightShift: false, brightness: 1, dnd: false, volume: 0.8, wifi: true, magnify: true });
                        C.setSetting('theme', 'dark');
                        render('about');
                    } })));
                } }
            };
            function check(label, key) {
                var id = 'chk-' + key + '-' + win.id;
                var c = h('input', { type: 'checkbox', id: id, checked: !!C.settings[key], style: 'accent-color:var(--accent);width:16px;height:16px' });
                c.addEventListener('change', function () { C.setSetting(key, c.checked); });
                return h('div', { style: 'display:flex;gap:8px;align-items:center;margin:6px 0' }, c, h('label', { for: id, text: label }));
            }
            var current = 'wallpaper';
            function render(p) {
                current = p;
                nav.textContent = '';
                Object.keys(pages).forEach(function (k) {
                    nav.appendChild(h('button', { type: 'button', class: k === p ? 'on' : '', 'aria-current': k === p ? 'page' : null, text: pages[k].name, onclick: function () { render(k); } }));
                });
                sec.textContent = '';
                pages[p].draw();
            }
            win.data.render = render;
            render(pages[opts.page] ? opts.page : 'wallpaper');
            var onSet = function () { /* keep checkboxes in sync when Control Center changes things */ if (!sec.contains(document.activeElement)) render(current); };
            C.onSettings(onSet);
            win.onClose(function () { C.offSettings(onSet); });
        },
        reopen: function (win, opts) { if (opts.page) win.data.render(opts.page); }
    });

    /* ======================= Photos ======================= */
    C.register('photos', {
        name: 'Photos', icon: 'photos', keywords: 'pictures images viewer', w: 820, h: 560, single: true,
        open: function (win, opts) {
            var i = 0;
            var img = h('img', { alt: '' });
            var name = h('span', { class: 'muted' });
            var show = function () {
                var p = D.pictures[i];
                img.src = p.src; img.alt = p.name; name.textContent = p.name + '  (' + (i + 1) + ' of ' + D.pictures.length + ')';
                win.setTitle(p.name);
            };
            win.body.appendChild(h('div', { class: 'toolbar' },
                h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Previous photo', text: '‹', style: 'font-size:22px', onclick: function () { i = (i - 1 + D.pictures.length) % D.pictures.length; show(); } }),
                h('button', { class: 'ibtn', type: 'button', 'aria-label': 'Next photo', text: '›', style: 'font-size:22px', onclick: function () { i = (i + 1) % D.pictures.length; show(); } }),
                name));
            win.body.appendChild(h('div', { class: 'photo' }, img));
            win.el.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowRight') { i = (i + 1) % D.pictures.length; show(); }
                if (e.key === 'ArrowLeft') { i = (i - 1 + D.pictures.length) % D.pictures.length; show(); }
            });
            win.data.show = function (src) { var j = D.pictures.map(function (p) { return p.src; }).indexOf(src); if (j >= 0) i = j; show(); };
            win.data.show(opts.src);
        },
        reopen: function (win, opts) { if (opts.src) win.data.show(opts.src); }
    });

    /* ======================= Paint ======================= */
    C.register('paint', {
        name: 'Paint', icon: 'paint', keywords: 'draw sketch canvas art', w: 760, h: 520,
        open: function (win) {
            var color = h('input', { type: 'color', value: '#8a5cff', 'aria-label': 'Brush color' });
            var size = h('input', { type: 'range', min: '1', max: '40', value: '6', 'aria-label': 'Brush size', style: 'width:110px' });
            var eraser = false;
            var erBtn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false', text: 'Eraser' });
            var cv = h('canvas', { 'aria-label': 'Drawing canvas', role: 'img' });
            var wrap = h('div', { class: 'paint-wrap' }, cv);
            win.body.appendChild(h('div', { class: 'toolbar' }, color, size, erBtn,
                h('button', { class: 'btn', type: 'button', text: 'Clear', onclick: function () { fill(); } }),
                h('button', { class: 'btn', type: 'button', text: 'Save PNG', onclick: function () {
                    var a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'cak3d-paint.png'; document.body.appendChild(a); a.click(); a.remove();
                } })));
            win.body.appendChild(wrap);
            var ctx = cv.getContext('2d');
            var fill = function () { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); };
            var fit = function () {
                var w = Math.max(50, wrap.clientWidth), hh = Math.max(50, wrap.clientHeight);
                if (cv.width === w && cv.height === hh) return;
                var old = cv.width ? ctx.getImageData(0, 0, cv.width, cv.height) : null;
                cv.width = w; cv.height = hh; fill();
                if (old) ctx.putImageData(old, 0, 0);
            };
            setTimeout(fit, 30);
            win.data.fit = fit;
            erBtn.addEventListener('click', function () { eraser = !eraser; erBtn.setAttribute('aria-pressed', String(eraser)); erBtn.classList.toggle('primary', eraser); });
            var last = null;
            cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); last = [e.offsetX, e.offsetY]; dot(e); });
            cv.addEventListener('pointermove', function (e) { if (last) dot(e); });
            var end = function () { last = null; };
            cv.addEventListener('pointerup', end);
            cv.addEventListener('pointercancel', end);
            function dot(e) {
                ctx.strokeStyle = eraser ? '#fff' : color.value;
                ctx.lineWidth = +size.value; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke();
                last = [e.offsetX, e.offsetY];
            }
        },
        onResize: function (win) { if (win.data.fit) setTimeout(win.data.fit, 30); }
    });

    /* ======================= About ======================= */
    C.register('about', {
        name: 'About', icon: 'logo', hidden: true, w: 400, h: 400,
        open: function (win, opts) {
            var b = h('div', { class: 'scroll', style: 'padding:22px;text-align:center' });
            win.body.appendChild(b);
            if (opts.shortcuts) {
                win.setTitle('Keyboard Shortcuts');
                var kv = h('dl', { class: 'kv', style: 'text-align:left;grid-template-columns:120px 1fr' });
                [['Ctrl/⌘ Space', 'Spotlight'], ['Alt L', 'Launchpad'], ['Alt W', 'Close window'], ['Alt M', 'Minimize window'], ['Alt Enter', 'Zoom window'], ['Alt `', 'Cycle windows'], ['Esc', 'Close menus and panels'], ['Arrows', 'Move through menus, icons and files'], ['Enter / Space', 'Open the focused item']]
                    .forEach(function (r) { kv.appendChild(h('dt', null, h('kbd', { text: r[0] }))); kv.appendChild(h('dd', { text: r[1] })); });
                b.appendChild(kv);
                return;
            }
            var app = opts.app && C.apps[opts.app];
            if (app && app.id !== 'finder') {
                win.setTitle('About ' + app.name);
                b.appendChild(h('div', { style: 'width:84px;height:84px;margin:0 auto', html: I[app.icon] }));
                b.appendChild(h('h2', { text: app.name, style: 'margin:12px 0 4px' }));
                b.appendChild(h('p', { class: 'muted', text: 'Version 1.0 · part of CAK3D OS X' }));
                return;
            }
            win.setTitle('About CAK3D OS X');
            b.appendChild(h('div', { style: 'width:96px;height:96px;margin:0 auto', html: I.logo }));
            b.appendChild(h('h2', { style: 'margin:10px 0 2px;font-size:24px', text: 'CAK3D OS X' }));
            b.appendChild(h('div', { class: 'muted', text: 'Sonoma Haze · Version 14.20' }));
            var kv = h('dl', { class: 'kv', style: 'text-align:left;margin-top:16px;grid-template-columns:90px 1fr' });
            [['Chip', 'Garden Silicon G4.20'], ['Memory', '8 GB'], ['Startup', 'CAK3D HD'], ['Serial', 'GRDN-420-OSX'], ['Made in', 'the Garden, by CAK3D']].forEach(function (r) { kv.appendChild(h('dt', { text: r[0] })); kv.appendChild(h('dd', { text: r[1] })); });
            b.appendChild(kv);
            b.appendChild(h('div', { style: 'margin-top:16px;display:flex;gap:8px;justify-content:center' },
                h('button', { class: 'btn', type: 'button', text: 'More Info…', onclick: function () { C.open('settings', { page: 'about' }); } }),
                h('button', { class: 'btn', type: 'button', text: 'real-cak3d.github.io', onclick: function () { C.openUrl('https://real-cak3d.github.io/'); } })));
        }
    });

    /* Launchpad tile only */
    C.register('launchpad', { name: 'Launchpad', icon: 'launchpad', hidden: true, launch: function () { var b = document.querySelector('[data-key="launchpad"]'); if (b) b.click(); } });
})();
