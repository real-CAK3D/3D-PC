/* CAK3D UI - phone OS. Idle-light: no rAF loops; the clock ticks once a minute.
 * Two modes (cover + inner) morph live via postMessage from the 3D room. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  var device = $('#device'), coverScreen = $('#cover'), innerScreen = $('#inner'), foldBtn = $('#foldBtn');

  var inRoom = (function () { try { return window.parent !== window; } catch (e) { return true; } })();
  if (inRoom) document.body.classList.add('embedded');
  function postParent(action) {
    if (!inRoom) return;
    try { window.parent.postMessage({ type: 'cak3d-phone', action: action }, '*'); } catch (e) {}
  }

  /* ---------- mode selection ---------- */
  var params = new URLSearchParams(location.search);
  var startMode = params.get('mode'); // 'cover' | 'inner' | null
  var mode = startMode === 'inner' ? 'inner'
    : startMode === 'cover' ? 'cover'
    : (window.innerWidth >= 760 ? 'inner' : 'cover');

  function applyMode(m, animate) {
    mode = m;
    device.classList.toggle('inner', m === 'inner');
    document.documentElement.setAttribute('data-theme', m === 'inner' ? 'dark' : 'dark');
    var showCover = m === 'cover';
    coverScreen.classList.toggle('on', showCover);
    coverScreen.setAttribute('aria-hidden', showCover ? 'false' : 'true');
    innerScreen.classList.toggle('on', !showCover);
    innerScreen.setAttribute('aria-hidden', showCover ? 'true' : 'false');
    foldBtn.textContent = showCover ? 'Unfold' : 'Fold';
    document.querySelector('meta[name=theme-color]').setAttribute('content', showCover ? '#12040f' : '#04070a');
    tickClock();
    if (!showCover) startInnerHeartbeatSoon();
  }

  // room controls modes with postMessage({type:'cak3d-phone', action:'fold'|'unfold'})
  window.addEventListener('message', function (ev) {
    var d = ev.data; if (!d || d.type !== 'cak3d-phone') return;
    if (d.action === 'fold') applyMode('cover', true);
    else if (d.action === 'unfold') applyMode('inner', true);
  });
  foldBtn.addEventListener('click', function () { applyMode(mode === 'cover' ? 'inner' : 'cover', true); });

  /* ---------- shared clock (once a minute, no rAF) ---------- */
  var clockTimer = null;
  function fmtTime(d) { var h = d.getHours(), m = d.getMinutes(); var hh = ((h % 12) || 12); return hh + ':' + (m < 10 ? '0' : '') + m; }
  function fmtDate(d) {
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var mon = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return days[d.getDay()] + ', ' + mon[d.getMonth()] + ' ' + d.getDate();
  }
  function tickClock() {
    var now = new Date(), t = fmtTime(now);
    $('#sbTime').textContent = t; $('#lockTime').textContent = t; $('#lockDate').textContent = fmtDate(now);
    $('#hClock').textContent = t + (now.getHours() < 12 ? ' AM' : ' PM');
  }
  function scheduleClock() {
    tickClock();
    var ms = (60 - new Date().getSeconds()) * 1000 + 50;
    clockTimer = setTimeout(function () { tickClock(); clockTimer = setInterval(tickClock, 60000); }, ms);
  }

  /* =======================================================================
   *  ICONS - we draw our own glyphs (no Samsung/Google logos/trademarks).
   * ===================================================================== */
  var ICON = {}; // name -> svg string (inner content)
  function svg(paths, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + paths + '</svg>';
  }
  ICON.phone = svg('<path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>');
  ICON.messages = svg('<path d="M4 5h16v11H9l-4 4V5z"/><circle cx="9" cy="10.5" r="1" fill="currentColor"/><circle cx="12.5" cy="10.5" r="1" fill="currentColor"/><circle cx="16" cy="10.5" r="1" fill="currentColor"/>');
  ICON.camera = svg('<path d="M3 7h3l2-2h8l2 2h3v12H3z"/><circle cx="12" cy="13" r="3.5"/>');
  ICON.music = svg('<path d="M9 18V6l10-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>');
  ICON.settings = svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>');
  ICON.globe = svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>');
  ICON.android = svg('<path d="M7 11h10v6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-6z"/><path d="M7 11a5 5 0 0 1 10 0"/><circle cx="10" cy="8.5" r="0.6" fill="currentColor"/><circle cx="14" cy="8.5" r="0.6" fill="currentColor"/><path d="M4.5 12v4M19.5 12v4M9.5 19v2M14.5 19v2"/>');
  ICON.back = svg('<path d="M15 18l-6-6 6-6"/>');
  ICON.wifi = svg('<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>');
  ICON.bt = svg('<path d="M8 7l8 10-4 3V4l4 3-8 10"/>');
  ICON.moon = svg('<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>');
  ICON.flash = svg('<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>');
  ICON.plane = svg('<path d="M12 3l1 7 7 4v2l-7-2v4l2 2v1l-3-1-3 1v-1l2-2v-4l-7 2v-2l7-4 1-7z"/>');
  ICON.rotate = svg('<path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4"/>');
  ICON.bell = svg('<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>');
  ICON.sun = svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>');
  ICON.play = svg('<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>');
  ICON.pause = svg('<rect x="7" y="5" width="3.5" height="14" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" fill="currentColor" stroke="none"/>');
  ICON.prev = svg('<path d="M18 5v14l-9-7zM7 5v14" stroke-width="2"/>');
  ICON.next = svg('<path d="M6 5v14l9-7zM17 5v14" stroke-width="2"/>');
  // inner tool glyphs
  ICON.radar = svg('<circle cx="12" cy="12" r="9"/><path d="M12 12l7-3"/><path d="M12 12V3" opacity=".4"/><circle cx="12" cy="12" r="4.5" opacity=".5"/>');
  ICON.watch = svg('<rect x="7" y="7" width="10" height="10" rx="3"/><path d="M9 7l1-4h4l1 4M9 17l1 4h4l1-4"/><path d="M12 10v2.5l1.5 1"/>');
  ICON.eyes = svg('<circle cx="8" cy="12" r="3.5"/><circle cx="16" cy="12" r="3.5"/><circle cx="8.6" cy="12" r="1.2" fill="currentColor"/><circle cx="16.6" cy="12" r="1.2" fill="currentColor"/>');
  ICON.paw = svg('<circle cx="7" cy="10" r="1.6"/><circle cx="11" cy="7.5" r="1.6"/><circle cx="15" cy="7.5" r="1.6"/><circle cx="18" cy="10.5" r="1.4"/><path d="M8 15c0-3 8-3 8 0 0 2.5-2 4-4 4s-4-1.5-4-4z"/>');
  ICON.map = svg('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>');
  ICON.ghost = svg('<path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-1.6L14.5 20l-2.5-1.6L9.5 20l-2.2-1.6z"/><circle cx="9.5" cy="10" r="1" fill="currentColor"/><circle cx="14.5" cy="10" r="1" fill="currentColor"/>');
  ICON.chip = svg('<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/>');
  ICON.term = svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>');

  /* =======================================================================
   *  COVER SCREEN
   * ===================================================================== */
  var apps = window.CAK3D_PHONE_APPS || [];
  var toast = $('#toast'), toastTimer;
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }

  function appIconSvg(app) {
    if (app.builtin && ICON[app.builtin]) return ICON[app.builtin];
    return '<span class="emoji">' + app.icon + '</span>';
  }
  function makeAppBtn(app) {
    var b = el('button', 'app'); b.type = 'button';
    var ic = el('span', 'icon'); ic.style.background = 'linear-gradient(145deg,' + lighten(app.color, 22) + ',' + app.color + ')';
    ic.innerHTML = appIconSvg(app);
    if (app.kind === 'android') { var tag = el('span', 'kind-tag', '▼'); tag.title = 'Android app'; ic.appendChild(tag); }
    b.appendChild(ic);
    b.appendChild(el('span', 'label', app.name));
    b.addEventListener('click', function () { openApp(app); });
    b.setAttribute('aria-label', app.name + (app.kind === 'android' ? ' (Android app)' : app.kind === 'web' ? ' (web app)' : ''));
    return b;
  }
  function lighten(hex, amt) {
    var c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(function (x){return x+x;}).join('');
    var n = parseInt(c, 16), r = Math.min(255,(n>>16)+amt), g = Math.min(255,((n>>8)&255)+amt), b = Math.min(255,(n&255)+amt);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function buildHome() {
    var grid = $('#homeGrid'), dock = $('#dock');
    grid.innerHTML = ''; dock.innerHTML = '';
    var dockApps = apps.filter(function (a) { return a.builtin === 'phone' || a.builtin === 'messages' || a.builtin === 'camera' || a.builtin === 'settings'; });
    var gridApps = apps.filter(function (a) { return dockApps.indexOf(a) === -1; });
    gridApps.forEach(function (a) { grid.appendChild(makeAppBtn(a)); });
    dockApps.forEach(function (a) { dock.appendChild(makeAppBtn(a)); });
  }

  /* lock / unlock */
  var lockLayer = $('#lockLayer'), home = $('#home');
  var locked = true;
  function unlock() {
    if (!locked) return; locked = false;
    lockLayer.classList.add('unlocked'); home.setAttribute('aria-hidden', 'false');
  }
  function lock() { locked = true; lockLayer.classList.remove('unlocked'); home.setAttribute('aria-hidden', 'true'); closeApp(); }
  $('#unlockBtn').addEventListener('click', unlock);
  lockLayer.addEventListener('click', function (e) { if (e.target === lockLayer || e.target.classList.contains('lock-body')) unlock(); });
  // swipe up to unlock + keyboard
  addSwipe(lockLayer, function (dir) { if (dir === 'up') unlock(); });
  lockLayer.tabIndex = 0;
  lockLayer.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === ' ') { e.preventDefault(); unlock(); } });

  /* quick panel */
  var quick = $('#quick'), pullTab = $('#pullTab');
  function openQuick() { quick.classList.add('open'); }
  function closeQuick() { quick.classList.remove('open'); }
  pullTab.addEventListener('click', openQuick);
  addSwipe(pullTab, function (dir) { if (dir === 'down') openQuick(); });
  addSwipe(quick, function (dir) { if (dir === 'up') closeQuick(); });
  quick.addEventListener('click', function (e) { if (e.target === quick || e.target.classList.contains('quick-grip')) closeQuick(); });
  var TOGGLES = [
    { id: 'wifi', name: 'Wi-Fi', ico: 'wifi', on: true },
    { id: 'bt', name: 'Bluetooth', ico: 'bt', on: true },
    { id: 'dnd', name: 'Do Not Disturb', ico: 'moon', on: false },
    { id: 'flash', name: 'Flashlight', ico: 'flash', on: false },
    { id: 'plane', name: 'Airplane', ico: 'plane', on: false },
    { id: 'rotate', name: 'Auto rotate', ico: 'rotate', on: true }
  ];
  function buildQuick() {
    var box = $('#toggles'); box.innerHTML = '';
    TOGGLES.forEach(function (t) {
      var b = el('button', 'toggle' + (t.on ? ' on' : '')); b.type = 'button';
      b.innerHTML = ICON[t.ico] + '<span>' + t.name + '</span>';
      b.addEventListener('click', function () { t.on = !t.on; b.classList.toggle('on', t.on); showToast(t.name + ' ' + (t.on ? 'on' : 'off')); });
      box.appendChild(b);
    });
    $('#bright').addEventListener('input', function () {
      var v = +this.value; device.style.filter = v < 100 ? 'brightness(' + (0.45 + v / 100 * 0.55) + ')' : '';
    });
  }

  /* app view */
  var appView = $('#appView'), appBody = $('#appBody'), appTitle = $('#appTitle'), appAct = $('#appAct');
  var currentApp = null;
  function openApp(app) {
    currentApp = app; appTitle.textContent = app.name; appAct.hidden = true; appBody.innerHTML = '';
    if (app.kind === 'android') buildInstall(app);
    else if (app.kind === 'stub') buildStub(app);
    else buildWebView(app);
    appView.classList.add('open'); appView.setAttribute('aria-hidden', 'false');
  }
  function closeApp() { appView.classList.remove('open'); appView.setAttribute('aria-hidden', 'true'); appBody.innerHTML = ''; currentApp = null; }
  $('#appBack').addEventListener('click', closeApp);
  addSwipe(appView, function (dir) { if (dir === 'right') closeApp(); }, 'edge');

  function buildWebView(app) {
    appAct.hidden = false; appAct.textContent = 'Open in tab';
    appAct.onclick = function () { window.open(app.url, '_blank', 'noopener'); };
    var note = app.note ? '<div style="padding:8px 14px;font-size:12px;color:var(--c-dim)">' + app.note + '</div>' : '';
    appBody.innerHTML = note + '<iframe src="' + app.url + '" title="' + app.name + '" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>';
    // sites that refuse to frame: offer the fallback after a beat
    var frame = appBody.querySelector('iframe');
    frame.addEventListener('error', function () { showToast('Could not embed — use Open in tab'); });
  }

  function buildInstall(app) {
    var wrap = el('div', 'install');
    var glyph = el('div', 'glyph'); glyph.style.background = 'linear-gradient(145deg,' + lighten(app.color, 22) + ',' + app.color + ')';
    glyph.innerHTML = '<span class="emoji">' + app.icon + '</span>';
    wrap.appendChild(glyph);
    wrap.appendChild(el('h2', null, app.name));
    wrap.appendChild(el('p', null, 'Android app · scan the code from a real phone to grab the APK from the latest GitHub release.' + (app.note ? ' ' + app.note + '.' : '')));
    var qr = el('div', 'qr'); qr.innerHTML = makeQR(app.url); wrap.appendChild(qr);
    var links = el('div', 'links');
    links.innerHTML =
      '<a href="' + app.url + '" target="_blank" rel="noopener">Open release page</a>' +
      (app.repo ? '<a class="ghost" href="' + app.repo + '" target="_blank" rel="noopener">View source on GitHub</a>' : '');
    wrap.appendChild(links);
    appBody.appendChild(wrap);
  }
  function makeQR(url) {
    try {
      var qr = qrcode(0, 'M'); qr.addData(url); qr.make();
      return qr.createImgTag(4, 8);
    } catch (e) { return '<div style="padding:40px;color:#333;font-size:12px">QR unavailable</div>'; }
  }

  /* ---- stubs: Phone / Messages / Camera / Settings / Music ---- */
  function buildStub(app) {
    if (app.builtin === 'phone') return stubPhone();
    if (app.builtin === 'messages') return stubMessages();
    if (app.builtin === 'camera') return stubCamera();
    if (app.builtin === 'settings') return stubSettings();
    if (app.builtin === 'music') return stubMusic();
  }
  function stubPhone() {
    var wrap = el('div', 'stub');
    var read = el('div', 'dial-readout', '');
    var card = el('div', 'card'); card.appendChild(read);
    card.insertAdjacentHTML('afterbegin', '<div style="font-size:12px;color:var(--c-dim);margin-bottom:6px">Dialer · goes nowhere (on purpose)</div>');
    wrap.appendChild(card);
    var pad = el('div', 'dialpad');
    var keys = [['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ'],['*',''],['0','+'],['#','']];
    keys.forEach(function (k) {
      var b = el('button'); b.innerHTML = k[0] + '<small>' + k[1] + '</small>';
      b.addEventListener('click', function () { read.textContent = (read.textContent + k[0]).slice(-14); });
      pad.appendChild(b);
    });
    wrap.appendChild(pad);
    var call = el('button', 'call-btn', '📞 Call');
    call.addEventListener('click', function () {
      var who = read.textContent || 'the void';
      showToast('Ring… ring… ' + who + ' didn’t pick up 🙊');
    });
    wrap.appendChild(call);
    appBody.appendChild(wrap);
  }
  function stubMessages() {
    var wrap = el('div', 'stub');
    var chat = el('div', 'chat');
    var seed = [
      ['them', 'yo did the silk console deploy?'],
      ['me', 'pushing to vercel rn 🕷️'],
      ['them', 'the room looks unreal btw'],
      ['me', 'wait till you fold the phone'],
    ];
    seed.forEach(function (m) { chat.appendChild(bubble(m[0], m[1])); });
    wrap.appendChild(chat);
    var input = el('div', 'chat-input');
    input.innerHTML = '<input id="msgIn" placeholder="Message" aria-label="Message" /><button id="msgSend">Send</button>';
    wrap.appendChild(input);
    appBody.appendChild(wrap);
    function send() {
      var i = $('#msgIn'); var v = i.value.trim(); if (!v) return;
      chat.appendChild(bubble('me', v)); i.value = ''; chat.scrollTop = chat.scrollHeight;
      setTimeout(function () {
        var replies = ['lol', 'fr fr', 'ok the crawler icon is sick', 'scan it from a real phone', 'spac3-gh0st says hi 👻', 'copy that'];
        chat.appendChild(bubble('them', replies[Math.floor(Math.random() * replies.length)])); chat.scrollTop = chat.scrollHeight;
      }, 700);
    }
    $('#msgSend').addEventListener('click', send);
    $('#msgIn').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
    function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
    function bubble(side, text) { var b = el('div', 'bubble ' + side); b.textContent = text; return b; }
  }
  function stubCamera() {
    var wrap = el('div', 'cam');
    wrap.innerHTML =
      '<div class="view"><div class="scene" id="camScene" style="background:radial-gradient(120% 90% at 50% 0,#3a1b55,#0a0414)"></div>' +
      '<div class="reticle"></div><div class="flash" id="camFlash"></div></div>' +
      '<div class="filters" id="camFilters"></div>' +
      '<button class="shutter" id="camShot" aria-label="Take photo"></button>';
    appBody.appendChild(wrap);
    var filters = [['None',''],['Noir','grayscale(1) contrast(1.2)'],['Purple','hue-rotate(260deg) saturate(1.4)'],['Vivid','saturate(1.8) contrast(1.1)'],['Dream','blur(1px) brightness(1.2) saturate(1.3)']];
    var fbox = $('#camFilters'), scene = $('#camScene');
    filters.forEach(function (f, i) {
      var b = el('button', i === 0 ? 'on' : '', f[0]);
      b.addEventListener('click', function () { fbox.querySelectorAll('button').forEach(function (x){x.classList.remove('on');}); b.classList.add('on'); scene.style.filter = f[1]; });
      fbox.appendChild(b);
    });
    $('#camShot').addEventListener('click', function () {
      var fl = $('#camFlash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
      showToast('Snap! Saved to nowhere 📸');
    });
  }
  function stubSettings() {
    appTitle.textContent = 'Settings';
    var list = el('div', 'settings-list');
    var rows = [
      ['wifi', 'Wi-Fi', 'CAK3D-silk', true, true],
      ['bt', 'Bluetooth', 'Spac3-Gh0st, GTA-Watch', true, true],
      ['moon', 'Do Not Disturb', 'Off', false, true],
      ['sun', 'Dark mode', 'Always on', true, true],
      ['bell', 'Notifications', 'Allowed', true, true],
      ['globe', 'About phone', 'CAK3D UI · One build', null, false]
    ];
    rows.forEach(function (r) {
      var row = el('div', 'set-row');
      var ic = el('div', 'ico'); ic.innerHTML = ICON[r[0]] || ICON.settings; row.appendChild(ic);
      var grow = el('div', 'grow'); grow.innerHTML = '<div>' + r[1] + '</div><div class="sub">' + r[2] + '</div>'; row.appendChild(grow);
      if (r[3] !== null) {
        var sw = el('div', 'switch' + (r[3] ? ' on' : '')); sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', r[3]);
        sw.setAttribute('tabindex', '0'); sw.setAttribute('aria-label', r[1]);
        var toggle = function () { var on = !sw.classList.contains('on'); sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on); showToast(r[1] + ' ' + (on ? 'on' : 'off')); };
        sw.addEventListener('click', toggle);
        sw.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        row.appendChild(sw);
      }
      list.appendChild(row);
    });
    appBody.appendChild(list);
  }
  function stubMusic() {
    appTitle.textContent = 'Music';
    var wrap = el('div', 'music');
    wrap.innerHTML =
      '<div class="art">' + ICON.music + '</div>' +
      '<div class="meta"><h2>Purple Haze (Silk Mix)</h2><p>CAK3D · Room Sessions</p></div>' +
      '<div class="seek"><i></i></div>' +
      '<div class="ctrls">' +
        '<button aria-label="Previous">' + ICON.prev + '</button>' +
        '<button class="play" id="musPlay" aria-label="Play">' + ICON.play + '</button>' +
        '<button aria-label="Next">' + ICON.next + '</button>' +
      '</div>' +
      '<div class="stereo-note">♪ Tapping play tells the room to spin up the stereo.</div>';
    appBody.appendChild(wrap);
    var playing = false;
    $('#musPlay').addEventListener('click', function () {
      playing = !playing;
      this.innerHTML = playing ? ICON.pause : ICON.play;
      this.setAttribute('aria-label', playing ? 'Pause' : 'Play');
      postParent('stereo');
      showToast(playing ? 'Sent “stereo” to the room 🎶' : 'Paused');
    });
  }

  /* ---------- weather (api.weather.gov) ---------- */
  function wxGlyph(short) {
    var s = (short || '').toLowerCase();
    if (/snow|sleet|ice|flurr/.test(s)) return ICON.moon ? '❄' : '*';
    if (/thunder|storm/.test(s)) return '⛈';
    if (/rain|shower|drizzle/.test(s)) return '🌧';
    if (/fog|haze|mist/.test(s)) return '🌫';
    if (/cloud|overcast/.test(s)) return '☁';
    if (/clear|sunny|fair/.test(s)) return '☀';
    return '⛅';
  }
  function loadWeather() {
    var box = $('#lockWeather');
    fetch('https://api.weather.gov/points/44.1004,-70.2148', { headers: { 'Accept': 'application/geo+json' } })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { return fetch(j.properties.forecast, { headers: { 'Accept': 'application/geo+json' } }); })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) {
        var p = j.properties.periods[0];
        $('#wxTemp').textContent = p.temperature + '°' + p.temperatureUnit;
        $('#wxDesc').textContent = p.shortForecast + ' · Lewiston, ME';
        box.querySelector('.wx-ico').textContent = wxGlyph(p.shortForecast);
        box.hidden = false;
      })
      .catch(function () {
        $('#wxTemp').textContent = ''; $('#wxDesc').textContent = 'Lewiston, ME · weather offline';
        box.querySelector('.wx-ico').textContent = '⛅'; box.hidden = false;
      });
  }

  /* =======================================================================
   *  INNER SCREEN (hacker deck + terminal)
   * ===================================================================== */
  var tools = window.CAK3D_TOOLS || [];
  var launcher = $('#launcher'), detail = $('#detail'), terminal = $('#terminal');

  function buildDeck() {
    var grid = $('#toolGrid'); grid.innerHTML = '';
    tools.forEach(function (t) {
      var b = el('button', 'tool'); b.type = 'button'; b.style.setProperty('--tc', t.color);
      b.innerHTML =
        '<span class="blink"></span>' +
        '<span class="ico">' + (ICON[t.glyph] || ICON.chip) + '</span>' +
        '<div class="name">' + t.name + '</div>' +
        '<div class="tag">' + t.tag + '</div>' +
        '<div class="hwline">' + t.hw + '</div>';
      b.setAttribute('aria-label', t.name + ' — ' + t.tag);
      b.addEventListener('click', function () { openDetail(t); });
      grid.appendChild(b);
    });
    // terminal tile
    var tb = el('button', 'tool term'); tb.type = 'button'; tb.style.setProperty('--tc', 'var(--h-green)');
    tb.innerHTML =
      '<span class="blink"></span><span class="ico">' + ICON.term + '</span>' +
      '<div class="name" style="color:var(--h-green)">silk-console</div>' +
      '<div class="tag">live terminal</div>' +
      '<div class="hwline">Fake but plausible shell over the CAK3D tool deck. Try: help, scan, flock, status.</div>';
    tb.setAttribute('aria-label', 'Open silk-console terminal');
    tb.addEventListener('click', openTerminal);
    $('#toolGrid').appendChild(tb);
  }

  function radarHtml() {
    var blips = '';
    for (var i = 0; i < 3; i++) {
      var a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 55;
      var x = 50 + Math.cos(a) * r, y = 50 + Math.sin(a) * r;
      blips += '<span class="blip" style="left:' + x + '%;top:' + y + '%;animation-delay:' + (i * 0.4) + 's"></span>';
    }
    return '<div class="radarwrap"><div class="radar"><span class="ring r3"></span><span class="ring r2"></span><span class="ring"></span><span class="cross"></span><span class="cross2"></span><span class="sweep"></span>' + blips + '</div></div>';
  }

  function openDetail(t) {
    detail.style.setProperty('--tc', t.color);
    var feats = t.features.map(function (f) { return '<li>' + f + '</li>'; }).join('');
    var stats = t.status.map(function (s) { return '<div class="statrow"><span><span class="statled"></span>' + s.k + '</span><b>' + s.v + '</b></div>'; }).join('');
    var radar = t.radar ? '<div class="panel"><h3>Flock radar</h3>' + radarHtml() + '<p style="margin-top:8px;text-align:center;opacity:.7;font-size:11px">passive sweep · simulated blips</p></div>' : '';
    detail.innerHTML =
      '<div class="d-top">' +
        '<button class="d-back" id="dBack">‹ deck</button>' +
        '<span class="d-ico">' + (ICON[t.glyph] || ICON.chip) + '</span>' +
        '<div><h2>' + t.name + '</h2><div class="d-tag">' + t.tag + '</div></div>' +
      '</div>' +
      '<div class="d-grid">' +
        '<div>' +
          '<div class="panel"><h3>What it is</h3><p>' + t.desc + '</p>' +
            '<div class="hw"><b>Hardware:</b> ' + t.hw + '</div></div>' +
          '<div class="panel" style="margin-top:16px"><h3>Features</h3><ul class="feat">' + feats + '</ul></div>' +
        '</div>' +
        '<div>' +
          '<div class="panel"><h3>Status readout</h3>' + stats +
            '<div class="statrow"><span><span class="statled"></span>uptime</span><b id="dUptime">00:00:00</b></div></div>' +
          radar +
          '<div class="d-actions" style="margin-top:16px">' +
            '<a class="go" href="' + t.launch + '" target="_blank" rel="noopener">' + (t.launchLabel || 'Launch') + ' ↗</a>' +
            '<a class="repo" href="' + t.repo + '" target="_blank" rel="noopener">repo</a>' +
          '</div>' +
          '<p style="font-size:11px;opacity:.55;margin-top:12px">Display + links only. No real device control or network action runs from this page.</p>' +
        '</div>' +
      '</div>';
    detail.classList.add('open'); detail.setAttribute('aria-hidden', 'false');
    $('#dBack').addEventListener('click', closeDetail);
    startUptime();
  }
  function closeDetail() { detail.classList.remove('open'); detail.setAttribute('aria-hidden', 'true'); stopUptime(); }
  addSwipe(detail, function (dir) { if (dir === 'right') closeDetail(); }, 'edge');

  // uptime ticks only while a detail panel is open; cleared on close
  var upTimer = null, upStart = 0;
  function startUptime() {
    stopUptime(); upStart = Date.now() - Math.floor(Math.random() * 9e6);
    var tickUp = function () { var n = $('#dUptime'); if (!n) return stopUptime();
      var s = Math.floor((Date.now() - upStart) / 1000);
      n.textContent = [Math.floor(s/3600), Math.floor(s/60)%60, s%60].map(function (x){return (x<10?'0':'')+x;}).join(':'); };
    tickUp(); upTimer = setInterval(tickUp, 1000);
  }
  function stopUptime() { if (upTimer) { clearInterval(upTimer); upTimer = null; } }

  /* ---- terminal ---- */
  var termOut = $('#termOut'), termInput = $('#termInput');
  function openTerminal() {
    terminal.classList.add('open'); terminal.setAttribute('aria-hidden', 'false');
    if (!termOut.dataset.init) {
      termOut.dataset.init = '1';
      termPrint('ok', 'CAK3D silk-console v1.0 — type `help`. (sandbox: display only)');
      termPrint('', 'Connected tools: ' + tools.map(function (t){return t.id;}).join(', '));
    }
    setTimeout(function () { termInput.focus(); }, 320);
  }
  function closeTerminal() { terminal.classList.remove('open'); terminal.setAttribute('aria-hidden', 'true'); }
  $('#termBack').addEventListener('click', closeTerminal);
  addSwipe(terminal, function (dir) { if (dir === 'right') closeTerminal(); }, 'edge');

  function termPrint(cls, text) { var d = el('div', 'ln ' + cls, text); termOut.appendChild(d); termOut.scrollTop = termOut.scrollHeight; }
  function termCmd(line) { var d = el('div', 'ln cmd'); d.textContent = line; termOut.appendChild(d); termOut.scrollTop = termOut.scrollHeight; }

  var CMDS = {
    help: function () {
      termPrint('ok', 'commands: help, ls, scan, flock, status [tool], neofetch, uptime, deck, open <tool>, clear');
      termPrint('', 'everything here is simulated — no real RF, no network attack.');
    },
    ls: function () { termPrint('', tools.map(function (t){return t.id.padEnd(14) + t.tag;}).join('\n')); },
    deck: function () { CMDS.ls(); },
    clear: function () { termOut.innerHTML = ''; },
    uptime: function () { termPrint('', 'up ' + (1 + Math.floor(Math.random()*40)) + ' days, load avg ' + loadAvg()); },
    neofetch: function () {
      termPrint('ok',
        'cak3d@silk\n-----------\nOS:     CAK3D//silk (web)\nHost:   Galaxy Z Fold 8 (3D room)\nShell:  silk-console\nBoards: XIAO ESP32-S3, CYD 2432S028, ESP32-S3 AMOLED\nTheme:  terminal-green / purple\nMotto:  display only, never a live attack');
    },
    scan: function () {
      termPrint('warn', 'passive sweep (simulated)…');
      var seen = ['ssid "CAK3D-silk"  ch 6   -41dBm', 'ssid "Spac3-Gh0st" ch 1   -58dBm', 'ble  "GTA-Watch"   -66dBm', 'ble  "CYD-Buddy"   -71dBm'];
      stagger(seen, function (x) { termPrint('', '  ' + x); }, function () { termPrint('ok', 'done — ' + seen.length + ' devices (owned lab only)'); });
    },
    flock: function () {
      termPrint('warn', 'WhatTheFlock passive detector (simulated)');
      termPrint('', '  listening 2.4GHz, hop 11/6/1, OUI set=34');
      stagger(['  ..... no matches', '  ..... no matches', '  hit? OUI b4:1e:52  tier1  (demo)'], function (x){termPrint('',x);}, function () { termPrint('ok', 'passive only — no transmit. See the Flock radar in the WhatTheFlock tile.'); });
    },
    status: function (arg) {
      var t = tools.filter(function (x){return x.id === arg || x.name.toLowerCase() === (arg||'').toLowerCase();})[0];
      if (!t) { termPrint('', 'usage: status <tool>   e.g. status whattheflock'); return; }
      termPrint('ok', t.name + ' — ' + t.tag);
      t.status.forEach(function (s){ termPrint('', '  ' + s.k.padEnd(10) + s.v); });
    },
    open: function (arg) {
      var t = tools.filter(function (x){return x.id === arg;})[0];
      if (!t) { termPrint('err', 'unknown tool: ' + arg); return; }
      termPrint('ok', 'opening ' + t.name + ' detail…'); setTimeout(function () { closeTerminal(); openDetail(t); }, 350);
    }
  };
  function loadAvg() { return [0,1,2].map(function (){return (Math.random()*1.5).toFixed(2);}).join(' '); }
  function stagger(arr, each, done) {
    var i = 0; (function step() { if (i >= arr.length) return done && done(); each(arr[i++]); setTimeout(step, 240); })();
  }
  function runLine(line) {
    termCmd(line); var parts = line.trim().split(/\s+/); var cmd = parts.shift(); var arg = parts.join(' ');
    if (!cmd) return;
    if (CMDS[cmd]) CMDS[cmd](arg);
    else termPrint('err', cmd + ': command not found (try `help`)');
  }
  termInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var v = termInput.value; termInput.value = ''; runLine(v); }
  });
  var CHIPS = ['help', 'scan', 'flock', 'neofetch', 'status whattheflock', 'clear'];
  function buildChips() {
    var box = $('#termChips'); box.innerHTML = '';
    CHIPS.forEach(function (c) { var b = el('button', null, c); b.addEventListener('click', function () { runLine(c); termInput.focus(); }); box.appendChild(b); });
  }

  // inner heartbeat: node/load line refreshed a few times, not a rAF loop
  var hbTimer = null, hbCount = 0;
  function startInnerHeartbeatSoon() {
    if (hbTimer || mode !== 'inner') return;
    $('#hNode').textContent = 'silk-0' + (1 + Math.floor(Math.random()*8));
    var beat = function () { $('#hLoad').textContent = (Math.random()*1.4).toFixed(2); hbCount++; if (hbCount > 600) stopHeartbeat(); };
    beat(); hbTimer = setInterval(beat, 5000);
  }
  function stopHeartbeat() { if (hbTimer) { clearInterval(hbTimer); hbTimer = null; } }

  /* ---------- swipe helper (touch + mouse + pointer) ---------- */
  function addSwipe(node, cb, mode2) {
    var x0 = 0, y0 = 0, active = false;
    function start(x, y) {
      if (mode2 === 'edge' && x > 48) return false; // only from left edge for back-gesture
      x0 = x; y0 = y; active = true; return true;
    }
    function end(x, y) {
      if (!active) return; active = false;
      var dx = x - x0, dy = y - y0, ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < 36) return;
      if (ay > ax) cb(dy < 0 ? 'up' : 'down'); else cb(dx < 0 ? 'left' : 'right');
    }
    node.addEventListener('touchstart', function (e) { var t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
    node.addEventListener('touchend', function (e) { var t = e.changedTouches[0]; end(t.clientX, t.clientY); }, { passive: true });
    var md = false;
    node.addEventListener('mousedown', function (e) { md = start(e.clientX, e.clientY); });
    window.addEventListener('mouseup', function (e) { if (md) { md = false; end(e.clientX, e.clientY); } });
  }

  // global keyboard: Escape backs out of whatever is open
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (terminal.classList.contains('open')) return closeTerminal();
    if (detail.classList.contains('open')) return closeDetail();
    if (appView.classList.contains('open')) return closeApp();
    if (quick.classList.contains('open')) return closeQuick();
  });

  /* ---------- boot ---------- */
  buildHome(); buildQuick(); buildDeck(); buildChips();
  applyMode(mode, false);
  scheduleClock();
  loadWeather();

  // expose a tiny hook for tests / debugging
  window.CAK3DPhone = { setMode: function (m) { applyMode(m, true); }, getMode: function () { return mode; }, unlock: unlock };
})();
