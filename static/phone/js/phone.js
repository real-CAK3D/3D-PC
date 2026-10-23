/* CAK3D UI - phone OS for the 3D room (Galaxy Z Fold 8 style).
 * Cover screen: One UI-style lock/home/quick panel. Inner screen: One UI unfolded
 * with widgets, a roomy grid, the Fold taskbar and an app drawer.
 * One shared app renderer, so an open app follows you across fold/unfold.
 * Idle-light: no rAF loops; the clock ticks once a minute. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var device = $('#device'), coverScreen = $('#cover'), innerScreen = $('#inner'), foldBtn = $('#foldBtn');
  var inRoom = (function () { try { return window.parent !== window; } catch (e) { return true; } })();
  if (inRoom) document.body.classList.add('embedded');
  function postParent(action) {
    if (!inRoom) return;
    try { window.parent.postMessage({ type: 'cak3d-phone', action: action }, '*'); } catch (e) {}
  }

  var params = new URLSearchParams(location.search);
  var startMode = params.get('mode');
  var mode = startMode === 'inner' ? 'inner' : startMode === 'cover' ? 'cover' : (window.innerWidth >= 760 ? 'inner' : 'cover');

  var state = { locked: true, app: null, playing: false, recents: [], dark: false, term: null };

  /* =======================================================================
   *  ICONS - all drawn here (no Samsung/Google logos or trademarks).
   * ===================================================================== */
  function svg(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
  }
  var ICON = {
    phone: svg('<path d="M6 3h4l2 5-3 2a12 12 0 0 0 5 5l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2z"/>'),
    messages: svg('<path d="M4 5h16v11H9l-4 4V5z"/><circle cx="9" cy="10.5" r="1" fill="currentColor"/><circle cx="12.5" cy="10.5" r="1" fill="currentColor"/><circle cx="16" cy="10.5" r="1" fill="currentColor"/>'),
    camera: svg('<path d="M3 7h3l2-2h8l2 2h3v12H3z"/><circle cx="12" cy="13" r="3.5"/>'),
    music: svg('<path d="M9 18V6l10-2v11"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15" r="2.5"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4 12H1M23 12h-3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
    terminal: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9l3 3-3 3M12.5 15H17"/>'),
    globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'),
    back: svg('<path d="M15 18l-6-6 6-6"/>'),
    wifi: svg('<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/>'),
    bt: svg('<path d="M8 7l8 10-4 3V4l4 3-8 10"/>'),
    moon: svg('<path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/>'),
    flash: svg('<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>'),
    plane: svg('<path d="M12 3l1 7 7 4v2l-7-2v4l2 2v1l-3-1-3 1v-1l2-2v-4l-7 2v-2l7-4 1-7z"/>'),
    rotate: svg('<path d="M21 12a9 9 0 1 1-3-6.7M21 4v4h-4"/>'),
    bell: svg('<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    sun: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>'),
    play: svg('<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>'),
    pause: svg('<rect x="7" y="5" width="3.5" height="14" fill="currentColor" stroke="none"/><rect x="13.5" y="5" width="3.5" height="14" fill="currentColor" stroke="none"/>'),
    prev: svg('<path d="M18 5v14l-9-7zM7 5v14" stroke-width="2"/>'),
    next: svg('<path d="M6 5v14l9-7zM17 5v14" stroke-width="2"/>'),
    // tool glyphs
    radar: svg('<circle cx="12" cy="12" r="9"/><path d="M12 12l7-3"/><circle cx="12" cy="12" r="4.5" opacity=".55"/>'),
    watch: svg('<rect x="7" y="7" width="10" height="10" rx="3"/><path d="M9 7l1-4h4l1 4M9 17l1 4h4l1-4"/><path d="M12 10v2.5l1.5 1"/>'),
    eyes: svg('<circle cx="8" cy="12" r="3.5"/><circle cx="16" cy="12" r="3.5"/><circle cx="8.6" cy="12" r="1.2" fill="currentColor"/><circle cx="16.6" cy="12" r="1.2" fill="currentColor"/>'),
    paw: svg('<circle cx="7" cy="10" r="1.6"/><circle cx="11" cy="7.5" r="1.6"/><circle cx="15" cy="7.5" r="1.6"/><circle cx="18" cy="10.5" r="1.4"/><path d="M8 15c0-3 8-3 8 0 0 2.5-2 4-4 4s-4-1.5-4-4z"/>'),
    map: svg('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
    ghost: svg('<path d="M5 20V11a7 7 0 0 1 14 0v9l-2.3-1.6L14.5 20l-2.5-1.6L9.5 20l-2.2-1.6z"/><circle cx="9.5" cy="10" r="1" fill="currentColor"/><circle cx="14.5" cy="10" r="1" fill="currentColor"/>'),
    chip: svg('<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/>'),
    // drawn glyphs for the room's apps (inner screen)
    spider: svg('<circle cx="12" cy="13.5" r="3"/><circle cx="12" cy="9" r="1.8"/><path d="M9 12.5L4 9.5M9 14.5l-5 1M9.6 16L6 20M15 12.5l5-3M15 14.5l5 1M14.4 16L18 20"/>'),
    house: svg('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>'),
    timer: svg('<circle cx="12" cy="13" r="7.5"/><path d="M12 13V9M10 2.5h4M18.5 6.5L20 5"/>'),
    web: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><path d="M12 3.5v17M3.5 12h17M6 6l12 12M18 6L6 18"/>'),
    box: svg('<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>'),
    pin: svg('<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    dog: svg('<path d="M6.5 5L4 11l3 1M17.5 5L20 11l-3 1"/><path d="M7 7c1.5-2 8.5-2 10 0l1 7c0 4-3 6-6 6s-6-2-6-6z"/><circle cx="10" cy="12" r=".9" fill="currentColor"/><circle cx="14" cy="12" r=".9" fill="currentColor"/><path d="M11 15.5h2l-1 1.2z" fill="currentColor"/>'),
    leaf: svg('<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z"/><path d="M5 19l8-8"/>'),
    spark: svg('<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>'),
    headphones: svg('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3.5" y="14" width="4" height="6" rx="1.5"/><rect x="16.5" y="14" width="4" height="6" rx="1.5"/>'),
    cake: svg('<path d="M4 20h16v-7H4z"/><path d="M4 16.5c2 1.5 4 1.5 5.3 0 1.4 1.5 4 1.5 5.4 0 1.3 1.5 3.3 1.5 5.3 0"/><path d="M8 13v-3M12 13v-3M16 13v-3"/>'),
    news: svg('<rect x="3.5" y="4.5" width="14" height="15" rx="1.5"/><path d="M17.5 8.5H20v9a2 2 0 0 1-2 2"/><path d="M6.5 8h8M6.5 11.5h8M6.5 15h5"/>'),
    grid: (function () { var c = ''; for (var y = 0; y < 3; y++) for (var x = 0; x < 3; x++) c += '<circle cx="' + (6 + x * 6) + '" cy="' + (6 + y * 6) + '" r="1.7" fill="currentColor" stroke="none"/>'; return svg(c); })()
  };
  var APP_GLYPH = {
    'Arachnotes': 'spider', 'Scanimal': 'paw', 'HomeInventory': 'house', 'MapPI3': 'map', 'TorqueClock': 'timer',
    'Arachnotes Web': 'web', 'Home Inventory': 'box', 'Map-Pi': 'pin', 'MyPetID': 'dog', 'CAK3D Creations': 'leaf',
    'real-cak3d': 'spark', 'TheRealZayne': 'headphones', "Zayne's B-day": 'cake', 'Corner Chronicle': 'news'
  };

  /* =======================================================================
   *  APPS
   * ===================================================================== */
  var coverApps = window.CAK3D_PHONE_APPS || [];
  var tools = window.CAK3D_TOOLS || [];
  var toolApps = tools.map(function (t) { return { name: t.name, kind: 'tool', tool: t, color: t.color, glyph: t.glyph, url: t.launch, repo: t.repo }; });
  var terminalApp = { name: 'Terminal', kind: 'stub', builtin: 'terminal', color: '#2b2f36', icon: '>_', url: '' };
  var allApps = coverApps.concat(toolApps, [terminalApp]);
  var PINNED = ['Phone', 'Messages', 'Camera', 'Music', 'Settings'];
  function findApp(name) {
    var n = String(name || '').toLowerCase();
    return allApps.filter(function (a) { return a.name.toLowerCase() === n || (a.tool && a.tool.id === n); })[0];
  }

  function lighten(hex, amt) {
    var c = hex.replace('#', ''); if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    var n = parseInt(c, 16), r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function grad(color) { return 'linear-gradient(145deg,' + lighten(color, 26) + ',' + color + ')'; }
  function iconHtml(app, drawn) {
    if (app.builtin && ICON[app.builtin]) return ICON[app.builtin];
    if (drawn) { var g = app.glyph || APP_GLYPH[app.name]; if (g && ICON[g]) return ICON[g]; }
    return '<span class="emoji">' + esc(app.icon) + '</span>';
  }
  function makeAppBtn(app, drawn) {
    var b = el('button', 'app'); b.type = 'button';
    var ic = el('span', 'icon'); ic.style.background = grad(app.color);
    ic.innerHTML = iconHtml(app, drawn);
    if (!drawn && app.kind === 'android') { var tag = el('span', 'kind-tag', '▼'); tag.title = 'Android app'; ic.appendChild(tag); }
    b.appendChild(ic);
    b.appendChild(el('span', 'label', app.name));
    b.addEventListener('click', function () { openApp(app, true); });
    b.setAttribute('aria-label', app.name + (app.kind === 'android' ? ' (Android app)' : app.kind === 'web' ? ' (web app)' : ''));
    return b;
  }

  /* =======================================================================
   *  SCREENS + MODE
   * ===================================================================== */
  var S = {
    cover: { key: 'cover', root: coverScreen, view: $('#appView'), body: $('#appBody'), title: $('#appTitle'), act: $('#appAct'), toast: $('#toast'), big: false },
    inner: { key: 'inner', root: innerScreen, view: $('#iApp'), body: $('#iAppBody'), title: $('#iAppTitle'), act: $('#iAppAct'), toast: $('#iToast'), big: true }
  };
  function cur() { return S[mode]; }

  function applyMode(m) {
    var prev = mode; mode = m;
    device.classList.toggle('inner', m === 'inner');
    var showCover = m === 'cover';
    coverScreen.classList.toggle('on', showCover); coverScreen.setAttribute('aria-hidden', String(!showCover)); coverScreen.inert = !showCover;
    innerScreen.classList.toggle('on', !showCover); innerScreen.setAttribute('aria-hidden', String(showCover)); innerScreen.inert = showCover;
    foldBtn.textContent = showCover ? 'Unfold' : 'Fold';
    $('meta[name=theme-color]').setAttribute('content', showCover ? '#12040f' : '#1a1440');
    if (prev !== m) {
      closeOverlays(); closeQuick();
      if (state.app) { hideView(S[prev]); render(S[m], state.app); } // same app follows the fold
    }
    syncLock(); buildTaskbar(); fit();
  }
  window.addEventListener('message', function (ev) {
    var d = ev.data; if (!d || d.type !== 'cak3d-phone') return;
    if (d.action === 'fold') applyMode('cover');
    else if (d.action === 'unfold') applyMode('inner');
  });
  foldBtn.addEventListener('click', function () { applyMode(mode === 'cover' ? 'inner' : 'cover'); });

  // standalone: scale the device down to fit small windows (event-driven only)
  var fitTimer = null;
  function fit() {
    if (inRoom) return;
    var w = mode === 'inner' ? 900 : 412, h = mode === 'inner' ? 991 : 968;
    var s = Math.min(1, window.innerWidth / w, window.innerHeight / h);
    device.style.transform = s < 1 ? 'scale(' + s.toFixed(4) + ')' : '';
  }
  window.addEventListener('resize', function () { clearTimeout(fitTimer); fitTimer = setTimeout(fit, 120); });

  /* ---------- toast ---------- */
  var toastTimer;
  function showToast(msg) {
    var t = cur().toast; $$('.toast').forEach(function (x) { x.classList.remove('show'); });
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  /* ---------- clock (aligned to the minute, then once a minute) ---------- */
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function fmtTime(d) { var h = d.getHours(), m = d.getMinutes(); return ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m; }
  function fmtDate(d) { return DAYS[d.getDay()] + ', ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  var calKey = '';
  function tickClock() {
    var now = new Date(), t = fmtTime(now), dt = fmtDate(now);
    $('#sbTime').textContent = t; $('#lockTime').textContent = t; $('#lockDate').textContent = dt;
    $$('[data-time]').forEach(function (n) { n.textContent = t; });
    $$('[data-date]').forEach(function (n) { n.textContent = dt; });
    var key = now.toDateString(); if (key !== calKey) { calKey = key; buildCalendar(now); }
  }
  function scheduleClock() {
    tickClock();
    setTimeout(function () { tickClock(); setInterval(tickClock, 60000); }, (60 - new Date().getSeconds()) * 1000 + 50);
  }
  function buildCalendar(now) {
    var y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), prevDays = new Date(y, m, 0).getDate();
    var h = '<div class="cal-head"><b>' + MON[m] + '</b><span>' + y + '</span></div><div class="cal-grid">';
    'SMTWTFS'.split('').forEach(function (d) { h += '<span class="dow">' + d + '</span>'; });
    for (var i = first - 1; i >= 0; i--) h += '<span class="d mute">' + (prevDays - i) + '</span>';
    for (var d = 1; d <= days; d++) h += '<span class="d' + (d === now.getDate() ? ' today' : '') + '">' + d + '</span>';
    var trail = (7 - (first + days) % 7) % 7;
    for (var k = 1; k <= trail; k++) h += '<span class="d mute">' + k + '</span>';
    $('#wCal').innerHTML = h + '</div>';
  }

  /* ---------- weather (api.weather.gov, Lewiston ME) ---------- */
  function wxGlyph(short) {
    var s = (short || '').toLowerCase();
    if (/snow|sleet|ice|flurr/.test(s)) return '❄';
    if (/thunder|storm/.test(s)) return '⛈';
    if (/rain|shower|drizzle/.test(s)) return '🌧';
    if (/fog|haze|mist/.test(s)) return '🌫';
    if (/cloud|overcast/.test(s)) return '☁';
    if (/clear|sunny|fair/.test(s)) return '☀';
    return '⛅';
  }
  function fillWx(w) {
    $('#wxTemp').textContent = w.temp; $('#wxDesc').textContent = w.desc;
    $('#lockWeather .wx-ico').textContent = w.ico; $('#lockWeather').hidden = false;
    $$('[data-wx-temp]').forEach(function (n) { n.textContent = w.temp; });
    $$('[data-wx-desc]').forEach(function (n) { n.textContent = w.desc; });
    $$('[data-wx-ico]').forEach(function (n) { n.textContent = w.ico; });
    $$('[data-wx-next]').forEach(function (n) { n.textContent = w.next || ''; });
  }
  function loadWeather() {
    var H = { headers: { 'Accept': 'application/geo+json' } };
    fetch('https://api.weather.gov/points/44.1004,-70.2148', H)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { return fetch(j.properties.forecast, H); })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) {
        var p = j.properties.periods[0], n = j.properties.periods[1];
        fillWx({ temp: p.temperature + '°' + p.temperatureUnit, desc: p.shortForecast + ' · Lewiston, ME', ico: wxGlyph(p.shortForecast),
          next: n ? n.name + ' · ' + n.temperature + '° ' + n.shortForecast : '' });
      })
      .catch(function () { fillWx({ temp: '', desc: 'Lewiston, ME · weather offline', ico: '⛅', next: '' }); });
  }

  /* =======================================================================
   *  LOCK (shared state across both screens)
   * ===================================================================== */
  var lockLayer = $('#lockLayer'), home = $('#home'), iLock = $('#iLock'), iHome = $('#iHome');
  function syncLock() {
    lockLayer.classList.toggle('unlocked', !state.locked);
    iLock.classList.toggle('unlocked', !state.locked);
    home.setAttribute('aria-hidden', String(state.locked));
    iHome.setAttribute('aria-hidden', String(state.locked));
    innerScreen.classList.toggle('locked', state.locked);
  }
  function unlock() { if (!state.locked) return; state.locked = false; syncLock(); }
  $('#unlockBtn').addEventListener('click', unlock);
  $('#iUnlockBtn').addEventListener('click', unlock);
  lockLayer.addEventListener('click', function (e) { if (e.target === lockLayer || e.target.classList.contains('lock-body')) unlock(); });
  iLock.addEventListener('click', function (e) { if (e.target === iLock || e.target.closest('.ilock-top')) unlock(); });
  [lockLayer, iLock].forEach(function (n) {
    addSwipe(n, function (dir) { if (dir === 'up') unlock(); });
    n.tabIndex = 0;
    n.addEventListener('keydown', function (e) { if (e.target === n && (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === ' ')) { e.preventDefault(); unlock(); } });
  });
  var lp = $('#iLockPhone'), lc = $('#iLockCam');
  lp.innerHTML = ICON.phone; lc.innerHTML = ICON.camera;
  lp.addEventListener('click', function () { unlock(); openApp(findApp('Phone'), true); });
  lc.addEventListener('click', function () { unlock(); openApp(findApp('Camera'), true); });

  /* =======================================================================
   *  COVER: home, dock, quick panel (unchanged look)
   * ===================================================================== */
  function buildCoverHome() {
    var grid = $('#homeGrid'), dock = $('#dock');
    grid.innerHTML = ''; dock.innerHTML = '';
    var dockNames = ['Phone', 'Messages', 'Camera', 'Settings'];
    coverApps.forEach(function (a) { (dockNames.indexOf(a.name) >= 0 ? dock : grid).appendChild(makeAppBtn(a, false)); });
  }
  var quick = $('#quick'), pullTab = $('#pullTab');
  function openQuick() { quick.classList.add('open'); }
  function closeQuick() { quick.classList.remove('open'); }
  pullTab.addEventListener('click', openQuick);
  addSwipe(pullTab, function (dir) { if (dir === 'down') openQuick(); });
  addSwipe(quick, function (dir) { if (dir === 'up') closeQuick(); });
  quick.addEventListener('click', function (e) { if (e.target === quick || e.target.classList.contains('quick-grip')) closeQuick(); });
  var TOGGLES = [
    { name: 'Wi-Fi', ico: 'wifi', on: true }, { name: 'Bluetooth', ico: 'bt', on: true }, { name: 'Do Not Disturb', ico: 'moon', on: false },
    { name: 'Flashlight', ico: 'flash', on: false }, { name: 'Airplane', ico: 'plane', on: false }, { name: 'Auto rotate', ico: 'rotate', on: true }
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

  /* =======================================================================
   *  INNER: home grid, Maker folder, drawer, taskbar
   * ===================================================================== */
  var drawer = $('#iDrawer'), folder = $('#iFolder'), search = $('#iSearch');
  function buildInnerHome() {
    var g = $('#iGrid'); g.innerHTML = '';
    g.appendChild(makeFolderBtn());
    g.appendChild(makeAppBtn(terminalApp, true));
    coverApps.filter(function (a) { return PINNED.indexOf(a.name) === -1; }).forEach(function (a) { g.appendChild(makeAppBtn(a, true)); });
    var fg = $('#iFolderGrid'); fg.innerHTML = '';
    toolApps.forEach(function (a) { fg.appendChild(makeAppBtn(a, true)); });
  }
  function makeFolderBtn() {
    var b = el('button', 'app'); b.type = 'button';
    var ic = el('span', 'icon folder');
    toolApps.slice(0, 4).forEach(function (a) { var i = el('i'); i.style.background = a.color; i.innerHTML = ICON[a.glyph]; ic.appendChild(i); });
    b.appendChild(ic); b.appendChild(el('span', 'label', 'Maker'));
    b.setAttribute('aria-label', 'Maker folder, ' + toolApps.length + ' apps');
    b.addEventListener('click', openFolder);
    return b;
  }
  function openFolder() { folder.classList.add('open'); folder.setAttribute('aria-hidden', 'false'); }
  function closeFolder() { folder.classList.remove('open'); folder.setAttribute('aria-hidden', 'true'); }
  folder.addEventListener('click', function (e) { if (e.target === folder) closeFolder(); });

  function buildDrawer() {
    var q = search.value.trim().toLowerCase(), g = $('#iDrawerGrid'); g.innerHTML = '';
    allApps.slice().sort(function (a, b) { return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1; })
      .filter(function (a) { return !q || a.name.toLowerCase().indexOf(q) >= 0 || (a.tool && a.tool.tag.indexOf(q) >= 0); })
      .forEach(function (a) { g.appendChild(makeAppBtn(a, true)); });
  }
  search.addEventListener('input', buildDrawer);
  function openDrawer() { closeFolder(); drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); }
  function closeDrawer() {
    if (!drawer.classList.contains('open')) return;
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    if (search.value) { search.value = ''; buildDrawer(); }
  }
  function closeOverlays() { closeDrawer(); closeFolder(); }
  addSwipe(iHome, function (dir) { if (dir === 'up') openDrawer(); });
  addSwipe(drawer, function (dir) { if (dir === 'down' && drawer.scrollTop <= 0) closeDrawer(); });
  iHome.addEventListener('wheel', function (e) { if (e.deltaY > 25) openDrawer(); }, { passive: true });
  drawer.addEventListener('wheel', function (e) { if (e.deltaY < -25 && drawer.scrollTop <= 0) closeDrawer(); }, { passive: true });

  function buildTaskbar() {
    var tb = $('#taskbar'); tb.innerHTML = '';
    var d = el('button', 'tb-drawer'); d.type = 'button'; d.innerHTML = ICON.grid; d.setAttribute('aria-label', 'Apps');
    d.addEventListener('click', function () {
      if (state.app) { closeApp(); openDrawer(); return; }
      if (drawer.classList.contains('open')) closeDrawer(); else openDrawer();
    });
    tb.appendChild(d);
    PINNED.forEach(function (n) { var a = findApp(n); if (a) tb.appendChild(taskbarBtn(a)); });
    var rec = state.recents.map(findApp).filter(Boolean);
    if (rec.length) { tb.appendChild(el('span', 'tb-div')); rec.forEach(function (a) { tb.appendChild(taskbarBtn(a)); }); }
  }
  function taskbarBtn(a) { var b = makeAppBtn(a, true); b.title = a.name; if (state.app === a) b.classList.add('running'); return b; }

  /* =======================================================================
   *  APP RENDERING (shared by both screens)
   * ===================================================================== */
  function openApp(app, byUser) {
    if (!app) return;
    state.app = app;
    if (PINNED.indexOf(app.name) === -1) state.recents = [app.name].concat(state.recents.filter(function (n) { return n !== app.name; })).slice(0, 3);
    closeOverlays(); closeQuick();
    render(cur(), app, byUser);
    buildTaskbar();
  }
  function closeApp() { state.app = null; hideView(cur()); buildTaskbar(); }
  function hideView(s) {
    s.view.classList.remove('open', 'scrolled'); s.view.setAttribute('aria-hidden', 'true');
    s.body.innerHTML = ''; stopUptime(); termOut = null;
    if (s.key === 'inner') innerScreen.classList.remove('in-app');
  }
  function subtitle(app) {
    if (app.kind === 'tool') return app.tool.tag;
    if (app.kind === 'android') return 'Android app';
    return { phone: 'Keypad', messages: '4 conversations', settings: 'CAK3D UI 8' }[app.builtin] || '';
  }
  function render(s, app, byUser) {
    stopUptime(); termOut = null;
    var body = s.body; body.innerHTML = '';
    body.className = s.key === 'inner' ? 'ou-scroll' : 'app-body'; body.scrollTop = 0;
    s.view.classList.remove('scrolled', 'nobig');
    s.title.textContent = app.name; s.act.hidden = true; s.act.onclick = null;
    var full = app.kind === 'web' || ['camera', 'music', 'terminal'].indexOf(app.builtin) >= 0;
    var host = body;
    if (s.big && !full) {
      var hd = el('header', 'ou-big'); hd.appendChild(el('h1', null, app.name));
      var sub = subtitle(app); if (sub) hd.appendChild(el('p', null, sub));
      body.appendChild(hd);
    }
    if (!full && (s.big || app.kind === 'tool')) { host = el('div', 'ou-content'); body.appendChild(host); }
    if (s.big && full) { s.view.classList.add('nobig'); body.classList.add('full'); }
    var ctx = { s: s, host: host, body: body, big: s.big, user: !!byUser, q: function (sel) { return body.querySelector(sel); } };
    if (app.kind === 'android') buildInstall(ctx, app);
    else if (app.kind === 'web') buildWebView(ctx, app);
    else if (app.kind === 'tool') buildTool(ctx, app);
    else buildStub(ctx, app);
    s.view.classList.add('open'); s.view.setAttribute('aria-hidden', 'false');
    if (s.key === 'inner') innerScreen.classList.add('in-app');
  }
  $('#appBack').addEventListener('click', closeApp);
  $('#iAppBack').innerHTML = ICON.back;
  $('#iAppBack').addEventListener('click', closeApp);
  addSwipe(S.cover.view, function (dir) { if (dir === 'right') closeApp(); }, 'edge');
  addSwipe(S.inner.view, function (dir) { if (dir === 'right') closeApp(); }, 'edge');
  S.inner.body.addEventListener('scroll', function () { S.inner.view.classList.toggle('scrolled', S.inner.body.scrollTop > 130); }, { passive: true });

  function buildWebView(ctx, app) {
    var s = ctx.s;
    s.act.hidden = false; s.act.textContent = 'Open in tab';
    s.act.onclick = function () { window.open(app.url, '_blank', 'noopener'); };
    var frame = el('iframe'); frame.src = app.url; frame.title = app.name; frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    if (app.note && !ctx.big) { var n = el('div', null, app.note); n.style.cssText = 'padding:8px 14px;font-size:12px;color:var(--c-dim)'; ctx.host.appendChild(n); }
    ctx.host.appendChild(frame);
    if (app.note && ctx.big) showToast(app.note);
  }

  function buildInstall(ctx, app) {
    var wrap = el('div', 'install');
    var glyph = el('div', 'glyph'); glyph.style.background = grad(app.color);
    glyph.innerHTML = iconHtml(app, ctx.big);
    wrap.appendChild(glyph);
    if (!ctx.big) wrap.appendChild(el('h2', null, app.name));
    wrap.appendChild(el('p', null, 'Android app · scan the code from a real phone to grab the APK from the latest GitHub release.' + (app.note ? ' ' + app.note + '.' : '')));
    var qr = el('div', 'qr'); qr.innerHTML = makeQR(app.url); wrap.appendChild(qr);
    var links = el('div', 'links');
    links.innerHTML = '<a href="' + esc(app.url) + '" target="_blank" rel="noopener">Open release page</a>' +
      (app.repo ? '<a class="ghost" href="' + esc(app.repo) + '" target="_blank" rel="noopener">View source on GitHub</a>' : '');
    wrap.appendChild(links);
    if (ctx.big) { var card = el('div', 'ou-card'); card.appendChild(wrap); ctx.host.appendChild(card); }
    else ctx.host.appendChild(wrap);
  }
  function makeQR(url) {
    try { var qr = qrcode(0, 'M'); qr.addData(url); qr.make(); return qr.createImgTag(4, 8, 'QR code for ' + url); }
    catch (e) { return '<div style="padding:40px;color:#333;font-size:12px">QR unavailable</div>'; }
  }

  /* ---- tool apps (ESP32 / XIAO projects): One UI cards, real info, display + links only ---- */
  var uptimeBase = {}, upTimer = null;
  function buildTool(ctx, app) {
    var t = app.tool; ctx.host.style.setProperty('--tc', t.color);
    if (!uptimeBase[t.id]) uptimeBase[t.id] = Date.now() - Math.floor(3e6 + Math.random() * 9e6);
    var feats = t.features.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');
    var stats = t.status.map(function (r) { return '<div class="ou-row"><span><i class="ou-dot"></i>' + esc(r.k) + '</span><b>' + esc(r.v) + '</b></div>'; }).join('');
    var blips = [[30, 30], [73, 38], [60, 74]].map(function (p) { return '<span class="blip" style="left:' + p[0] + '%;top:' + p[1] + '%"></span>'; }).join('');
    var radar = t.radar ?
      '<div class="ou-card"><h3>Flock radar</h3><div class="ou-radar"><span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>' +
      '<span class="ax v"></span><span class="ax h"></span><span class="sweep"></span><span class="me"></span>' + blips + '</div>' +
      '<div class="ou-legend"><span><i style="background:#fff;border:1px solid #999"></i>You</span><span><i style="background:#ff6b7d"></i>ALPR camera (demo)</span></div>' +
      '<p class="ou-note">Passive sweep · simulated blips</p></div>' : '';
    ctx.host.innerHTML =
      '<div class="ou-two"><div>' +
        '<div class="ou-card"><div class="ou-hero"><span class="icon" style="background:' + grad(t.color) + '">' + ICON[t.glyph] + '</span>' +
          '<div><h2>' + esc(t.name) + '</h2><div class="tag">' + esc(t.tag) + '</div></div></div>' +
          '<div class="ou-actions"><a class="ou-btn" href="' + esc(t.launch) + '" target="_blank" rel="noopener">' + esc(t.launchLabel || 'Launch') + '</a>' +
          (t.repo !== t.launch ? '<a class="ou-btn tonal" href="' + esc(t.repo) + '" target="_blank" rel="noopener">GitHub repo</a>' : '') + '</div></div>' +
        '<div class="ou-card"><h3>About</h3><p>' + esc(t.desc) + '</p></div>' +
        '<div class="ou-card"><h3>Hardware</h3><div class="ou-hw">' + esc(t.hw) + '</div></div>' +
        '<div class="ou-card"><h3>Features</h3><ul class="ou-list">' + feats + '</ul></div>' +
      '</div><div>' +
        '<div class="ou-card"><h3>Status</h3>' + stats + '<div class="ou-row"><span><i class="ou-dot"></i>uptime</span><b class="ou-up">00:00:00</b></div></div>' +
        radar +
        '<p class="ou-note">Display and links only. Nothing here controls a device or touches a network.</p>' +
      '</div></div>';
    startUptime(ctx.q('.ou-up'), uptimeBase[t.id]);
  }
  function startUptime(node, base) {
    stopUptime(); if (!node) return;
    var tick = function () {
      if (!node.isConnected) return stopUptime();
      var s = Math.floor((Date.now() - base) / 1000);
      node.textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(function (x) { return (x < 10 ? '0' : '') + x; }).join(':');
    };
    tick(); upTimer = setInterval(tick, 1000); // only while a tool app is on screen
  }
  function stopUptime() { if (upTimer) { clearInterval(upTimer); upTimer = null; } }

  /* ---- built-in stubs ---- */
  function buildStub(ctx, app) {
    var f = { phone: stubPhone, messages: stubMessages, camera: stubCamera, settings: stubSettings, music: stubMusic, terminal: stubTerminal }[app.builtin];
    if (f) f(ctx);
  }
  function stubPhone(ctx) {
    var wrap = el('div', 'stub');
    var read = el('div', 'dial-readout', '');
    var card = el('div', 'card');
    card.innerHTML = '<div style="font-size:12px;color:var(--c-dim);margin-bottom:6px">Dialer · goes nowhere (on purpose)</div>';
    card.appendChild(read); wrap.appendChild(card);
    var pad = el('div', 'dialpad');
    [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']].forEach(function (k) {
      var b = el('button'); b.type = 'button'; b.innerHTML = k[0] + '<small>' + k[1] + '</small>';
      b.addEventListener('click', function () { read.textContent = (read.textContent + k[0]).slice(-14); });
      pad.appendChild(b);
    });
    wrap.appendChild(pad);
    var call = el('button', 'call-btn', '📞 Call'); call.type = 'button';
    call.addEventListener('click', function () { showToast('Ring… ring… ' + (read.textContent || 'the void') + ' didn’t pick up 🙊'); });
    wrap.appendChild(call);
    if (!ctx.big) { ctx.host.appendChild(wrap); return; }
    // unfolded: recents list beside the keypad
    var two = el('div', 'ou-two'), left = el('div'), right = el('div');
    var rec = el('div', 'ou-card'); rec.innerHTML = '<h3>Recents</h3>' +
      [['The Void', 'Missed · 2:14 AM'], ['Pizza place', 'Outgoing · Yesterday'], ['Spac3-Gh0st', 'Incoming · Mon'], ['Unknown (Lewiston, ME)', 'Declined · Sun']]
        .map(function (r) { return '<div class="ou-row"><b>' + r[0] + '</b><span>' + r[1] + '</span></div>'; }).join('');
    left.appendChild(rec); right.appendChild(wrap);
    two.appendChild(left); two.appendChild(right); ctx.host.appendChild(two);
  }
  var CONVOS = [
    { name: 'Crew', color: '#7a5cff', msgs: [['them', 'yo did the silk console deploy?'], ['me', 'pushing to vercel rn 🕷️'], ['them', 'the room looks unreal btw'], ['me', 'wait till you unfold the phone']] },
    { name: 'Spac3-Gh0st', color: '#b96bff', msgs: [['them', '(◕‿◕) all services up'], ['me', 'nice, tailnet only right?'], ['them', 'always. loopback or tailscale.']] },
    { name: 'CYD-Buddy', color: '#e0a800', msgs: [['them', 'feed me pls'], ['me', 'feed'], ['them', 'nom. health +2.0']] },
    { name: 'WhatTheFlock', color: '#22b864', msgs: [['them', 'drive logged: 0 detections'], ['me', 'quiet road today']] }
  ];
  var convoIdx = 0;
  function stubMessages(ctx) {
    var split = el('div', 'msg-split');
    var list = el('div', 'msg-list ou-card flush');
    var wrap = el('div', 'stub'), chat = el('div', 'chat');
    function showConvo(i) {
      convoIdx = i; chat.innerHTML = '';
      CONVOS[i].msgs.forEach(function (m) { chat.appendChild(bubble(m[0], m[1])); });
      $$('.conv', list).forEach(function (c, j) { c.classList.toggle('on', j === i); });
    }
    CONVOS.forEach(function (c, i) {
      var b = el('button', 'conv'); b.type = 'button'; b.style.width = '100%'; b.style.textAlign = 'left';
      b.innerHTML = '<span class="av" style="background:' + c.color + '">' + esc(c.name[0]) + '</span><span><b>' + esc(c.name) + '</b><small>' + esc(c.msgs[c.msgs.length - 1][1]) + '</small></span>';
      b.addEventListener('click', function () { showConvo(i); });
      list.appendChild(b);
    });
    wrap.appendChild(chat);
    var input = el('div', 'chat-input');
    input.innerHTML = '<input placeholder="Message" aria-label="Message" /><button type="button">Send</button>';
    wrap.appendChild(input);
    split.appendChild(list); split.appendChild(wrap);
    ctx.host.appendChild(ctx.big ? split : wrap);
    showConvo(convoIdx);
    var inp = input.querySelector('input');
    function send() {
      var v = inp.value.trim(); if (!v) return;
      CONVOS[convoIdx].msgs.push(['me', v]); chat.appendChild(bubble('me', v)); inp.value = ''; chat.scrollTop = chat.scrollHeight;
      var at = convoIdx;
      setTimeout(function () {
        var replies = ['lol', 'fr fr', 'ok the crawler icon is sick', 'scan it from a real phone', 'spac3-gh0st says hi 👻', 'copy that'];
        var r = replies[Math.floor(Math.random() * replies.length)];
        CONVOS[at].msgs.push(['them', r]);
        if (chat.isConnected && convoIdx === at) { chat.appendChild(bubble('them', r)); chat.scrollTop = chat.scrollHeight; }
      }, 700);
    }
    input.querySelector('button').addEventListener('click', send);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
    function bubble(side, text) { var b = el('div', 'bubble ' + side); b.textContent = text; return b; }
  }
  function stubCamera(ctx) {
    var wrap = el('div', 'cam');
    wrap.innerHTML =
      '<div class="view"><div class="scene" style="background:radial-gradient(120% 90% at 50% 0,#3a1b55,#0a0414)"></div>' +
      '<div class="reticle"></div><div class="flash"></div></div>' +
      '<div class="filters"></div><button class="shutter" type="button" aria-label="Take photo"></button>';
    ctx.host.appendChild(wrap);
    var fbox = $('.filters', wrap), scene = $('.scene', wrap);
    [['None', ''], ['Noir', 'grayscale(1) contrast(1.2)'], ['Purple', 'hue-rotate(260deg) saturate(1.4)'], ['Vivid', 'saturate(1.8) contrast(1.1)'], ['Dream', 'blur(1px) brightness(1.2) saturate(1.3)']].forEach(function (f, i) {
      var b = el('button', i === 0 ? 'on' : '', f[0]); b.type = 'button';
      b.addEventListener('click', function () { $$('button', fbox).forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); scene.style.filter = f[1]; });
      fbox.appendChild(b);
    });
    $('.shutter', wrap).addEventListener('click', function () {
      var fl = $('.flash', wrap); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
      showToast('Snap! Saved to nowhere 📸');
    });
  }
  function stubSettings(ctx) {
    var list = el('div', 'settings-list' + (ctx.big ? ' ou-card flush' : ''));
    var rows = [
      ['wifi', 'Wi-Fi', 'CAK3D-silk', true], ['bt', 'Bluetooth', 'Spac3-Gh0st, GTA-Watch', true],
      ['moon', 'Do Not Disturb', 'Off', false], ['sun', 'Dark mode (inner screen)', 'One UI dark surfaces', state.dark, function (on) { state.dark = on; innerScreen.classList.toggle('dark', on); }],
      ['bell', 'Notifications', 'Allowed', true], ['globe', 'About phone', 'CAK3D UI 8 · Fold edition', null]
    ];
    rows.forEach(function (r) {
      var row = el('div', 'set-row');
      var ic = el('div', 'ico'); ic.innerHTML = ICON[r[0]] || ICON.settings; ic.style.color = '#fff'; row.appendChild(ic);
      var grow = el('div', 'grow'); grow.innerHTML = '<div>' + esc(r[1]) + '</div><div class="sub">' + esc(r[2]) + '</div>'; row.appendChild(grow);
      if (r[3] !== null) {
        var sw = el('div', 'switch' + (r[3] ? ' on' : '')); sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(!!r[3]));
        sw.tabIndex = 0; sw.setAttribute('aria-label', r[1]);
        var toggle = function () {
          var on = !sw.classList.contains('on'); sw.classList.toggle('on', on); sw.setAttribute('aria-checked', String(on));
          if (r[4]) r[4](on); showToast(r[1] + ' ' + (on ? 'on' : 'off'));
        };
        sw.addEventListener('click', toggle);
        sw.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        row.appendChild(sw);
      }
      list.appendChild(row);
    });
    ctx.host.appendChild(list);
  }
  function stubMusic(ctx) {
    var wrap = el('div', 'music');
    wrap.innerHTML =
      '<div class="art">' + ICON.music + '</div>' +
      '<div class="meta"><h2>Purple Haze (Silk Mix)</h2><p>CAK3D · Room Sessions</p></div>' +
      '<div class="seek"><i></i></div>' +
      '<div class="ctrls"><button type="button" aria-label="Previous">' + ICON.prev + '</button>' +
      '<button type="button" class="play" aria-label="Play">' + ICON.play + '</button>' +
      '<button type="button" aria-label="Next">' + ICON.next + '</button></div>' +
      '<div class="stereo-note">♪ Tapping play tells the room to spin up the stereo.</div>';
    ctx.host.appendChild(wrap);
    var play = $('.play', wrap);
    function paint() { play.innerHTML = state.playing ? ICON.pause : ICON.play; play.setAttribute('aria-label', state.playing ? 'Pause' : 'Play'); }
    paint();
    play.addEventListener('click', function () {
      state.playing = !state.playing; paint();
      postParent('stereo');
      showToast(state.playing ? 'Sent “stereo” to the room 🎶' : 'Paused');
    });
  }

  /* ---- Terminal app (Termux-like). Output persists across fold/unfold. ---- */
  var termOut = null;
  function termPrint(cls, text) {
    state.term.push([cls, text]);
    if (termOut) { termOut.appendChild(el('div', 'ln ' + cls, text)); termOut.scrollTop = termOut.scrollHeight; }
  }
  function stubTerminal(ctx) {
    if (!state.term) {
      state.term = [];
      termPrint('ok', 'Welcome to CAK3D Terminal (fold edition).');
      termPrint('dim', 'Type `help`. Everything here is simulated: no real radio, no network actions.');
    }
    var wrap = el('div', 'termapp');
    wrap.innerHTML = '<div class="term-tabs"><span>~ silk</span><span class="off">+</span></div><div class="term-out" aria-live="polite"></div>' +
      '<div class="term-keys"></div><div class="term-in"><span class="ps">~ $</span><input aria-label="Terminal input" autocomplete="off" spellcheck="false" autocapitalize="off" /></div>';
    ctx.host.appendChild(wrap);
    termOut = $('.term-out', wrap);
    state.term.forEach(function (l) { termOut.appendChild(el('div', 'ln ' + l[0], l[1])); });
    termOut.scrollTop = termOut.scrollHeight;
    var input = $('.term-in input', wrap), keys = $('.term-keys', wrap);
    ['help', 'ls', 'scan', 'flock', 'neofetch', 'clear'].forEach(function (c) {
      var b = el('button', null, c); b.type = 'button';
      b.addEventListener('click', function () { runLine(c); input.focus(); });
      keys.appendChild(b);
    });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var v = input.value; input.value = ''; runLine(v); } });
    if (ctx.user) setTimeout(function () { if (input.isConnected) input.focus(); }, 320);
  }
  function stagger(arr, each, done) { var i = 0; (function step() { if (i >= arr.length) return done && done(); each(arr[i++]); setTimeout(step, 240); })(); }
  var CMDS = {
    help: function () {
      termPrint('ok', 'commands: help, ls, scan, flock, status <tool>, open <app>, neofetch, uptime, whoami, date, clear');
      termPrint('dim', 'everything here is simulated — no real RF, no network actions.');
    },
    ls: function () { termPrint('', tools.map(function (t) { return (t.id + '              ').slice(0, 14) + t.tag; }).join('\n')); },
    clear: function () { state.term = []; if (termOut) termOut.innerHTML = ''; },
    whoami: function () { termPrint('', 'cak3d'); },
    date: function () { termPrint('', new Date().toString()); },
    uptime: function () { termPrint('', 'up ' + (1 + Math.floor(Math.random() * 40)) + ' days, load avg ' + [0, 1, 2].map(function () { return (Math.random() * 1.5).toFixed(2); }).join(' ')); },
    neofetch: function () {
      termPrint('ok', 'cak3d@fold\n----------\nOS:     CAK3D UI 8 (web)\nHost:   foldable in the 3D room\nShell:  silk-sh\nBoards: XIAO ESP32-S3 Sense, CYD 2432S028, ESP32-S3 AMOLED\nApps:   ' + allApps.length);
    },
    scan: function () {
      termPrint('warn', 'passive sweep (simulated)…');
      var seen = ['ssid "CAK3D-silk"   ch 6   -41dBm', 'ssid "Spac3-Gh0st"  ch 1   -58dBm', 'ble  "GTA-Watch"    -66dBm', 'ble  "CYD-Buddy"    -71dBm'];
      stagger(seen, function (x) { termPrint('', '  ' + x); }, function () { termPrint('ok', 'done — ' + seen.length + ' devices (owned lab only)'); });
    },
    flock: function () {
      termPrint('warn', 'WhatTheFlock passive detector (simulated)');
      termPrint('', '  listening 2.4GHz, hop 11/6/1, OUI set=34');
      stagger(['  ..... no matches', '  ..... no matches', '  demo hit: OUI b4:1e:52 tier1'], function (x) { termPrint('', x); },
        function () { termPrint('ok', 'passive only, no transmit. Open WhatTheFlock for the radar.'); });
    },
    status: function (arg) {
      var t = tools.filter(function (x) { return x.id === arg || x.name.toLowerCase() === (arg || '').toLowerCase(); })[0];
      if (!t) { termPrint('', 'usage: status <tool>   e.g. status whattheflock'); return; }
      termPrint('ok', t.name + ' — ' + t.tag);
      t.status.forEach(function (r) { termPrint('', '  ' + (r.k + '          ').slice(0, 10) + r.v); });
    },
    open: function (arg) {
      var a = findApp(arg);
      if (!a) { termPrint('err', 'open: no such app: ' + arg); return; }
      termPrint('ok', 'launching ' + a.name + '…');
      setTimeout(function () { openApp(a, true); }, 350);
    }
  };
  function runLine(line) {
    state.term.push(['cmd', line]);
    if (termOut) { termOut.appendChild(el('div', 'ln cmd', line)); termOut.scrollTop = termOut.scrollHeight; }
    var parts = line.trim().split(/\s+/), cmd = parts.shift(), arg = parts.join(' ');
    if (!cmd) return;
    if (CMDS[cmd]) CMDS[cmd](arg); else termPrint('err', cmd + ': command not found (try `help`)');
  }

  /* ---------- swipe helper (touch + mouse) ---------- */
  function addSwipe(node, cb, edge) {
    var x0 = 0, y0 = 0, active = false, md = false;
    function start(x, y) {
      if (edge) { var r = node.getBoundingClientRect(); if (x - r.left > 40) return false; }
      x0 = x; y0 = y; active = true; return true;
    }
    function end(x, y) {
      if (!active) return; active = false;
      var dx = x - x0, dy = y - y0, ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < 40) return;
      if (ay > ax) cb(dy < 0 ? 'up' : 'down'); else cb(dx < 0 ? 'left' : 'right');
    }
    node.addEventListener('touchstart', function (e) { var t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
    node.addEventListener('touchend', function (e) { var t = e.changedTouches[0]; end(t.clientX, t.clientY); }, { passive: true });
    node.addEventListener('mousedown', function (e) { md = start(e.clientX, e.clientY); });
    window.addEventListener('mouseup', function (e) { if (md) { md = false; end(e.clientX, e.clientY); } });
  }

  // Escape backs out of whatever is on top
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (folder.classList.contains('open')) return closeFolder();
    if (state.app) return closeApp();
    if (drawer.classList.contains('open')) return closeDrawer();
    if (quick.classList.contains('open')) return closeQuick();
  });

  /* ---------- boot ---------- */
  buildCoverHome(); buildQuick(); buildInnerHome(); buildDrawer();
  applyMode(mode);
  scheduleClock();
  loadWeather();

  // small hook for tests / debugging
  window.CAK3DPhone = {
    setMode: function (m) { applyMode(m); }, getMode: function () { return mode; }, unlock: unlock,
    open: function (name) { openApp(findApp(name), true); }, current: function () { return state.app && state.app.name; },
    apps: function () { return allApps.map(function (a) { return a.name; }); },
    openDrawer: openDrawer, openFolder: openFolder
  };
})();
