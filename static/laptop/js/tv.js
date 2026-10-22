/* CAK3D OS X: TV (watch the room's channels here, or remote-control the room TV) and CAK3D FM */
(function () {
    'use strict';
    var C = window.CAK3D, D = window.CAK3D_DATA;
    var h = C.h;
    var CH = D.channels;

    var tvData = null;
    function loadTv() {
        if (!tvData) {
            tvData = fetch('../tv.json', { cache: 'no-cache' }).then(function (r) {
                if (!r.ok) throw new Error('tv.json ' + r.status);
                return r.json();
            }).catch(function (e) { tvData = null; throw e; });
        }
        return tvData;
    }
    /** the same live schedule as the room TV: clips have been playing back to back since midnight */
    function nowIn(list) {
        var now = new Date();
        var total = list.reduce(function (a, c) { return a + c.secs; }, 0);
        var t = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % Math.max(1, total);
        var i = 0;
        while (list.length && t > list[i].secs) { t -= list[i].secs; i = (i + 1) % list.length; }
        return { i: i, t: t };
    }
    function tvPost(action, value) {
        return C.post({ type: 'cak3d-laptop-tv', action: action, value: value === undefined ? null : value });
    }

    C.register('tv', {
        name: 'TV', icon: 'tv', keywords: 'television channels watch remote cartoons movies mtv', w: 960, h: 600, single: true,
        open: function (win, opts) {
            var st = { ch: -1, timers: [], media: null, raf: 0, minimized: false, remoteCh: 0, remoteVol: 0.7, remoteMuted: false, remotePower: true };
            win.data.tv = st;
            var tabWatch = h('button', { type: 'button', role: 'tab', 'aria-selected': 'true', text: '📺 Watch here' });
            var tabRemote = h('button', { type: 'button', role: 'tab', 'aria-selected': 'false', text: '🎛 Remote' });
            var watch = h('div', { class: 'tv', role: 'tabpanel', 'aria-label': 'Watch here' });
            var remote = h('div', { class: 'remote', role: 'tabpanel', 'aria-label': 'Remote', hidden: true });
            win.body.appendChild(h('div', { class: 'tabs-row', role: 'tablist' }, tabWatch, tabRemote));
            win.body.appendChild(watch);
            win.body.appendChild(remote);
            var setTab = function (r) {
                tabWatch.setAttribute('aria-selected', String(!r));
                tabRemote.setAttribute('aria-selected', String(r));
                watch.hidden = r; remote.hidden = !r;
            };
            tabWatch.addEventListener('click', function () { setTab(false); });
            tabRemote.addEventListener('click', function () { setTab(true); });
            [tabWatch, tabRemote].forEach(function (b) {
                b.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var other = b === tabWatch ? tabRemote : tabWatch; other.click(); other.focus(); } });
            });

            /* ----- watch here ----- */
            var list = h('div', { class: 'tv-list', role: 'listbox', 'aria-label': 'Channels' });
            var screen = h('div', { class: 'tv-screen', role: 'region', 'aria-label': 'TV picture' });
            var chEl = h('span', { class: 'ch' });
            var nowEl = h('span', { class: 'now' });
            var toRoom = h('button', { class: 'btn', type: 'button', text: 'Show on the room TV', title: 'Tune the room TV to this channel', onclick: function () { if (st.ch >= 0) { remoteTune(st.ch); } } });
            watch.appendChild(list);
            watch.appendChild(h('div', { class: 'tv-main' }, screen, h('div', { class: 'tv-info' }, chEl, nowEl, toRoom)));
            CH.forEach(function (c, i) {
                var b = h('button', { type: 'button', role: 'option', 'aria-selected': 'false', 'data-i': String(i) }, h('span', { class: 'n', text: String(i) }), h('span', { text: c.name }));
                b.addEventListener('click', function () { play(i); });
                list.appendChild(b);
            });
            list.addEventListener('keydown', function (e) {
                var btns = Array.prototype.slice.call(list.querySelectorAll('button'));
                var i = btns.indexOf(document.activeElement);
                if (e.key === 'ArrowDown') { e.preventDefault(); if (btns[i + 1]) btns[i + 1].focus(); }
                if (e.key === 'ArrowUp') { e.preventDefault(); if (btns[i - 1]) btns[i - 1].focus(); }
            });

            function stop() {
                st.timers.forEach(function (t) { clearTimeout(t); clearInterval(t); });
                st.timers = [];
                if (st.media) { try { if (st.media.pause) st.media.pause(); st.media.removeAttribute('src'); if (st.media.load) st.media.load(); } catch (e) { /* ignore */ } }
                st.media = null;
                if (st.staticStop) { st.staticStop(); st.staticStop = null; }
                screen.textContent = '';
            }
            function info(text) { nowEl.textContent = text; nowEl.title = text; }
            function play(i) {
                stop();
                st.ch = i;
                var c = CH[i];
                list.querySelectorAll('button').forEach(function (b) { var on = +b.getAttribute('data-i') === i; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
                chEl.textContent = 'CH ' + i + ' · ' + c.name;
                win.setTitle('TV: ' + c.name);
                info('');
                if (c.kind === 'static') return drawStatic();
                if (c.kind === 'bars') return drawBars();
                if (c.kind === 'fm') return drawFm();
                if (c.kind === 'jellyfin') return drawJelly();
                if (c.kind === 'weather') return drawWeather();
                if (c.kind === 'markets') return drawMarkets();
                info('Tuning…');
                loadTv().then(function (data) {
                    if (st.ch !== i) return;
                    if (c.kind === 'news') return drawNews(data.headlines || []);
                    var clips = data[c.key] || [];
                    if (!clips.length) { info('Nothing scheduled on this channel.'); return; }
                    var at = nowIn(clips);
                    var clip = clips[at.i];
                    var next = clips[(at.i + 1) % clips.length];
                    var left = Math.max(1, Math.round(clip.secs - at.t));
                    info('Now: ' + c.label(clip) + '   ·   Up next: ' + c.label(next));
                    if (c.kind === 'video') playVideo(clip, at.t, i);
                    else playYouTube(clip, at.t);
                    // when this clip ends, land on whatever the schedule says is on
                    st.timers.push(setTimeout(function () { if (st.ch === i) play(i); }, (left + 1) * 1000));
                }).catch(function () { info('Couldn’t load the channel lineup (tv.json).'); });
            }
            win.data.play = play;
            function playVideo(clip, t, i) {
                var v = h('video', { playsinline: true, controls: true, preload: 'auto', title: clip.title });
                v.volume = C.settings.volume;
                v.addEventListener('loadedmetadata', function () { try { v.currentTime = Math.min(t, Math.max(0, (v.duration || t) - 1)); } catch (e) { /* ignore */ } });
                v.addEventListener('error', function () { if (st.media === v) info('This clip couldn’t load from archive.org. Try again in a moment.'); });
                v.src = clip.url;
                screen.appendChild(v);
                st.media = v;
                var p = v.play();
                if (p && p.catch) p.catch(function () { v.muted = true; v.play().catch(function () { /* user can press play */ }); });
                void i;
            }
            function playYouTube(clip, t) {
                var f = h('iframe', {
                    title: clip.title, allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen', referrerpolicy: 'strict-origin-when-cross-origin',
                    src: 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(clip.id) + '?autoplay=1&start=' + Math.floor(t) + '&rel=0&modestbranding=1&playsinline=1'
                });
                screen.appendChild(f);
                st.media = f;
            }
            function drawStatic() {
                info('Snow. Nothing on but the cosmic background.');
                var cv = h('canvas', { width: '160', height: '90', 'aria-hidden': 'true' });
                screen.appendChild(cv);
                var ctx = cv.getContext('2d');
                var img = ctx.createImageData(160, 90);
                var timer = 0;
                var frame = function () {
                    var d = img.data;
                    for (var k = 0; k < d.length; k += 4) { var x = (Math.random() * 255) | 0; d[k] = d[k + 1] = d[k + 2] = x; d[k + 3] = 255; }
                    ctx.putImageData(img, 0, 0);
                };
                // ~12 fps, only while the window is showing
                var start = function () { if (!timer) timer = setInterval(frame, 85); };
                st.staticStop = function () { clearInterval(timer); timer = 0; };
                st.staticStart = start;
                frame();
                if (!st.minimized) start();
            }
            function drawBars() {
                info('THE GARDEN · OFF THE AIR · PLEASE STAND BY');
                var top = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
                var low = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
                var g = h('div', { class: 'tv-bars', 'aria-hidden': 'true' });
                top.forEach(function (c) { g.appendChild(h('div', { style: 'background:' + c })); });
                low.forEach(function (c) { g.appendChild(h('div', { style: 'background:' + c })); });
                g.appendChild(h('div', { class: 'label' }, h('b', { text: 'THE GARDEN' }), h('span', { text: 'OFF THE AIR · PLEASE STAND BY' })));
                screen.appendChild(g);
            }
            function drawNews(heads) {
                var box = h('div', { class: 'tv-card tv-news' });
                var hdr = h('div', { class: 'hdr' }, h('span', { text: 'WDWN  NEWS AT SIX' }), h('span', { text: '● LIVE' }));
                var story = h('div', { class: 'story' });
                var crawl = h('div', { class: 'crawl' });
                box.appendChild(hdr); box.appendChild(story); box.appendChild(crawl);
                screen.appendChild(box);
                var items = heads.length ? heads : D.papers.map(function (p) { return { tag: p.when, title: p.name, dek: p.motto }; });
                crawl.textContent = items.map(function (x) { return x.title; }).join('   ◆   ');
                var k = 0;
                var show = function () {
                    var s = items[k % items.length];
                    var p = D.papers[k % D.papers.length];
                    story.style.borderLeftColor = p.color;
                    story.textContent = '';
                    story.appendChild(h('small', { text: 'TOP STORY · ' + String(s.tag || 'NEWS').toUpperCase() }));
                    story.appendChild(h('h2', { text: s.title }));
                    if (s.dek) story.appendChild(h('p', { text: s.dek }));
                    info('Story ' + ((k % items.length) + 1) + ' of ' + items.length + ': ' + s.title);
                    k++;
                };
                show();
                st.timers.push(setInterval(function () { if (!st.minimized) show(); }, 7000));
            }
            function drawWeather() {
                var box = h('div', { class: 'tv-card tv-weather' }, h('div', { class: 'hdr', text: 'THE WEATHER CHANNEL · LOCAL FORECAST' }));
                var body = h('div', { class: 'body' }, h('div', { style: 'font-size:clamp(18px,3vw,32px);font-weight:700', text: 'LEWISTON, MAINE' }));
                var temp = h('div', { class: 'temp', text: '--' });
                var txt = h('div', { style: 'font-size:clamp(16px,2.6vw,30px)', text: 'Getting the latest…' });
                body.appendChild(temp); body.appendChild(txt);
                box.appendChild(body);
                screen.appendChild(box);
                info('Local forecast for Lewiston, Maine');
                C.getWeather().then(function (w) { temp.textContent = w.temp + '°F'; txt.textContent = w.text + ' · High ' + w.hi + '° · Low ' + w.lo + '°'; })
                    .catch(function () { txt.textContent = 'The forecast is unavailable right now.'; });
            }
            function drawMarkets() {
                var open = 4200, idx = open;
                var stocks = [['KUSH', 42.0], ['BUDZ', 13.37], ['DANK', 69.42], ['ROLL', 4.2], ['SEED', 20.0], ['RESN', 71.1], ['BAKE', 8.8], ['LEAF', 31.4]].map(function (s) { return { sym: s[0], px: s[1], open: s[1] }; });
                var box = h('div', { class: 'tv-card tv-markets' });
                var head = h('div', { style: 'font-weight:700;font-size:clamp(16px,2.4vw,24px)', text: 'GNBC · MARKETS LIVE · GARDEN TOKEN AVERAGE' });
                var big = h('div', { class: 'idx' });
                var chg = h('div', { style: 'font-weight:700;font-size:clamp(14px,2vw,22px)' });
                var tape = h('div', { class: 'tape' });
                box.appendChild(head); box.appendChild(big); box.appendChild(chg); box.appendChild(tape);
                screen.appendChild(box);
                info('Not financial advice. It’s a TV channel in a stoner room.');
                var upd = function () {
                    idx *= 1 + (Math.random() - 0.48) * 0.003;
                    stocks.forEach(function (s) { s.px *= 1 + (Math.random() - 0.485) * 0.02; });
                    var up = idx >= open;
                    big.textContent = idx.toFixed(2);
                    chg.className = up ? 'up' : 'down';
                    chg.textContent = (up ? '▲ ' : '▼ ') + Math.abs(idx - open).toFixed(2) + ' (' + (((idx - open) / open) * 100).toFixed(2) + '%)';
                    tape.textContent = stocks.map(function (s) { return s.sym + ' ' + s.px.toFixed(2) + (s.px >= s.open ? ' ▲' : ' ▼'); }).join('    ');
                };
                upd();
                st.timers.push(setInterval(function () { if (!st.minimized) upd(); }, 2500));
            }
            function drawFm() {
                var fm = C.fmState();
                var t = h('div', { text: fm.playing ? '♪ ' + (fm.title || 'Now playing') : 'The stereo is quiet.' });
                screen.appendChild(h('div', { class: 'tv-card tv-fm' }, h('h2', { text: 'CAK3D FM' }), t,
                    h('button', { class: 'btn primary', type: 'button', text: 'Open the stereo', onclick: openStereo }),
                    h('small', { class: 'muted', text: C.inRoom ? 'Pick a station on the stereo in the room.' : 'The stereo is in the 3D room; this only works inside the room.' })));
                info('CAK3D FM plays on the room’s stereo.');
            }
            function drawJelly() {
                screen.appendChild(h('div', { class: 'tv-card tv-jelly' }, h('h2', { text: 'JELLYFIN' }), h('div', { text: 'CAK3D - NUKEBOX media server (on the tailnet)' }),
                    h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center' },
                        h('button', { class: 'btn primary', type: 'button', text: 'Open Jellyfin ↗', onclick: function () { window.open(D.JELLYFIN_URL, '_blank', 'noopener'); } }),
                        h('button', { class: 'btn', type: 'button', text: 'Put it on the room TV', onclick: function () { remoteTune(CH.length - 1); } })),
                    h('small', { style: 'opacity:.75', text: 'Only reachable from devices on CAK3D’s tailnet.' })));
                info('Jellyfin lives on the tailnet, so it opens in its own tab.');
            }
            var onSet = function (s) { if (st.media && st.media.tagName === 'VIDEO') st.media.volume = s.volume; };
            C.onSettings(onSet);
            var onStereo = function () { if (st.ch >= 0 && CH[st.ch].kind === 'fm') play(st.ch); };
            C.onStereo(onStereo);
            win.onClose(function () { stop(); C.offSettings(onSet); C.offStereo(onStereo); });

            /* ----- remote ----- */
            var lcd = h('div', { class: 'lcd', role: 'status', 'aria-live': 'polite', text: 'Ready' });
            var pill = h('span', { class: 'status-pill' + (C.inRoom ? ' ok' : ''), text: C.inRoom ? '● Paired with the room TV' : '○ Not in the room' });
            var sel = h('select', { 'aria-label': 'Channel' });
            CH.forEach(function (c, i) { sel.appendChild(h('option', { value: String(i), text: i + '  ' + c.name })); });
            var vol = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(st.remoteVol), 'aria-label': 'Room TV volume' });
            var send = function (action, value, label) {
                var ok = tvPost(action, value);
                lcd.textContent = (ok ? '' : '(not in the room) ') + label;
            };
            function remoteTune(i) {
                st.remoteCh = (i + CH.length) % CH.length;
                sel.value = String(st.remoteCh);
                send('tune', st.remoteCh, 'CH ' + st.remoteCh + ' · ' + CH[st.remoteCh].name);
                if (!C.inRoom) C.toast('TV Remote', 'The remote only works when the laptop is inside the 3D room.', 'tv');
            }
            sel.addEventListener('change', function () { remoteTune(+sel.value); });
            var volTimer = 0;
            vol.addEventListener('input', function () {
                st.remoteVol = +vol.value;
                clearTimeout(volTimer);
                volTimer = setTimeout(function () { send('volume', st.remoteVol, 'VOLUME ' + Math.round(st.remoteVol * 100)); }, 60);
            });
            remote.appendChild(h('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center' }, pill));
            remote.appendChild(h('div', { class: 'remote-body', role: 'group', 'aria-label': 'TV remote' },
                lcd,
                h('div', { class: 'row' },
                    h('button', { class: 'rbtn red', type: 'button', text: '⏻ Power', onclick: function () { st.remotePower = !st.remotePower; send('power', null, 'POWER'); } }),
                    h('button', { class: 'rbtn purple', type: 'button', text: 'Input', onclick: function () { send('input', null, 'INPUT'); } }),
                    h('button', { class: 'rbtn', type: 'button', text: '🔇 Mute', onclick: function () { st.remoteMuted = !st.remoteMuted; send('mute', st.remoteMuted, st.remoteMuted ? 'MUTED' : 'SOUND ON'); } })),
                h('div', { class: 'row' },
                    h('button', { class: 'rbtn', type: 'button', 'aria-label': 'Channel down', text: 'CH ▼', onclick: function () { remoteTune(st.remoteCh - 1); } }),
                    h('button', { class: 'rbtn', type: 'button', 'aria-label': 'Channel up', text: 'CH ▲', onclick: function () { remoteTune(st.remoteCh + 1); } })),
                sel,
                h('div', { class: 'row' }, h('span', { text: '🔈', 'aria-hidden': 'true' }), vol, h('span', { text: '🔊', 'aria-hidden': 'true' })),
                h('div', { class: 'row' },
                    h('button', { class: 'rbtn green', type: 'button', text: 'Watch this channel here', onclick: function () { setTab(false); play(st.remoteCh); } }))));
            remote.appendChild(h('p', { class: 'note', style: 'text-align:center;max-width:340px', text: 'The remote controls the real TV in the 3D room, so it only works while this laptop is open inside the room. “Watch here” works anywhere.' }));
            document.addEventListener('cak3d:tvstate', onState);
            function onState(e) {
                var m = e.detail || {};
                if (typeof m.channel === 'number' && CH[m.channel]) { st.remoteCh = m.channel; sel.value = String(m.channel); }
                if (typeof m.volume === 'number') { st.remoteVol = m.volume; vol.value = String(m.volume); }
                if (typeof m.muted === 'boolean') st.remoteMuted = m.muted;
                if (typeof m.power === 'boolean') st.remotePower = m.power;
                lcd.textContent = (st.remotePower ? 'ON' : 'OFF') + ' · CH ' + st.remoteCh + ' · ' + CH[st.remoteCh].name + (st.remoteMuted ? ' · MUTED' : '');
            }
            win.onClose(function () { document.removeEventListener('cak3d:tvstate', onState); });

            this.reopen(win, opts);
            if (opts.remote) setTab(true);
            if (st.ch < 0) play(typeof opts.channel === 'number' ? opts.channel : 2);
        },
        reopen: function (win, opts) {
            if (typeof opts.channel === 'number' && win.data.play) win.data.play(opts.channel);
        },
        onMinimize: function (win, min) {
            var st = win.data.tv;
            if (!st) return;
            st.minimized = min;
            if (st.staticStop && min) st.staticStop();
            else if (!min && st.staticStart && st.ch === 0) st.staticStart();
        }
    });

    function openStereo() {
        var ok = C.post({ type: 'cak3d-laptop-stereo', action: 'open' });
        if (!ok) C.toast('CAK3D FM', 'The stereo is in the 3D room. Open the laptop inside the room to use it.', 'fm');
        return ok;
    }

    C.register('fm', {
        name: 'CAK3D FM', icon: 'fm', keywords: 'radio music stereo spotify audio', w: 420, h: 440, single: true,
        open: function (win) {
            var box = h('div', { class: 'fm' });
            var title = h('div', { class: 'title', role: 'status', 'aria-live': 'polite' });
            var sub = h('div', { class: 'muted', style: 'font-size:12.5px' });
            var eq = h('div', { class: 'eq', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'), h('i'));
            box.appendChild(h('div', { class: 'disc', 'aria-hidden': 'true' }));
            box.appendChild(eq);
            box.appendChild(title);
            box.appendChild(sub);
            box.appendChild(h('button', { class: 'btn primary', type: 'button', text: '📻 Open the stereo', onclick: openStereo }));
            box.appendChild(h('p', { class: 'note', style: 'max-width:300px', text: C.inRoom ? 'Opens the room’s stereo so you can pick a station. What’s playing shows up here.' : 'CAK3D FM is the stereo in the 3D room. This only works when the laptop is opened inside the room.' }));
            win.body.appendChild(box);
            var upd = function (s) {
                box.classList.toggle('playing', !!s.playing && !win.minimized);
                title.textContent = s.playing ? (s.title || 'Now playing') : 'Nothing playing';
                sub.textContent = s.playing ? 'Now playing on CAK3D FM' : 'The stereo is quiet';
            };
            upd(C.fmState());
            C.onStereo(upd);
            win.data.upd = upd;
            win.onClose(function () { C.offStereo(upd); });
        },
        // the spinning disc is a CSS animation: stop it while minimized
        onMinimize: function (win) { if (win.data.upd) win.data.upd(C.fmState()); }
    });

    C.tv = { nowIn: nowIn, post: tvPost };
})();
