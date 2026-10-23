/**
 * Cover-screen apps for the CAK3D UI phone. Copied from
 * src/Application/World/Stoner/phoneApps.ts (same fields), plus a few harmless
 * built-in stubs (Phone, Messages, Camera, Settings, Music) the room adds.
 *
 * PhoneApp = {
 *   name:  string
 *   kind:  'web' | 'android' | 'stub'
 *   color: string
 *   icon:  string   // a character/emoji for the home screen (we also draw our own glyphs)
 *   url:   string   // the web app, or the release page with the APK
 *   repo?: string
 *   note?: string
 *   builtin?: 'phone' | 'messages' | 'camera' | 'settings' | 'music'
 * }
 */
(function (global) {
  var gh = function (repo) { return 'https://github.com/real-CAK3D/' + repo; };
  var latest = function (repo) { return gh(repo) + '/releases/latest'; };

  var phoneApps = [
    { name: 'Arachnotes', kind: 'android', color: '#a35bff', icon: '🕷', url: latest('CAK3D-Crawler'), repo: gh('CAK3D-Crawler'), note: 'APK + AAB on every release' },
    { name: 'Scanimal', kind: 'android', color: '#ff9b3d', icon: '🐾', url: latest('Scanimal'), repo: gh('Scanimal') },
    { name: 'HomeInventory', kind: 'android', color: '#5bd16a', icon: '🏠', url: latest('HomeInventory'), repo: gh('HomeInventory') },
    { name: 'MapPI3', kind: 'android', color: '#4aa8ff', icon: '🗺', url: latest('MapPI3'), repo: gh('MapPI3') },
    { name: 'TorqueClock', kind: 'android', color: '#ff5b5b', icon: '⏱', url: latest('Torque-Timer'), repo: gh('Torque-Timer') },
    { name: 'Arachnotes Web', kind: 'web', color: '#7a3fd1', icon: '🕸', url: 'https://arachnotes.vercel.app', repo: gh('CAK3D-Crawler') },
    { name: 'Home Inventory', kind: 'web', color: '#2bb85a', icon: '📦', url: 'https://home-inventory-37.vercel.app', repo: gh('HomeInventory') },
    { name: 'Map-Pi', kind: 'web', color: '#3ad1c4', icon: '📍', url: 'https://map-pi-zeta.vercel.app', repo: gh('Map-Pi-E') },
    { name: 'MyPetID', kind: 'web', color: '#3d6aff', icon: '🐶', url: 'https://mypetid.vercel.app/', repo: 'https://github.com/MyPetID-Home/MyPetID-Home.github.io' },
    { name: 'CAK3D Creations', kind: 'web', color: '#5bd16a', icon: '🌿', url: 'https://cak3d-creations.vercel.app', repo: gh('CAK3D-Creations') },
    { name: 'real-cak3d', kind: 'web', color: '#b04dff', icon: '꓁', url: 'https://real-cak3d.github.io/', repo: gh('real-CAK3D.github.io') },
    { name: 'TheRealZayne', kind: 'web', color: '#3dd6ff', icon: '🎧', url: 'https://the-realzayne.github.io/', repo: 'https://github.com/the-RealZayne/the-RealZayne.github.io', note: 'Gamer, music producer, creator' },
    { name: "Zayne's B-day", kind: 'web', color: '#ffd23d', icon: '🎂', url: 'https://zaynes-birthday.vercel.app', repo: gh('ZaynesBirthday') },
    { name: 'Corner Chronicle', kind: 'web', color: '#e07a24', icon: '📰', url: 'https://terminal-vnic.tailac984b.ts.net:8444/', repo: gh('NewsStand'), note: 'Tailscale only' },

    // Built-in CAK3D UI stubs (not from phoneApps.ts; fun + harmless)
    { name: 'Phone', kind: 'stub', builtin: 'phone', color: '#30c75e', icon: '📞', url: '' },
    { name: 'Messages', kind: 'stub', builtin: 'messages', color: '#1aa3ff', icon: '💬', url: '' },
    { name: 'Camera', kind: 'stub', builtin: 'camera', color: '#555b66', icon: '📷', url: '' },
    { name: 'Music', kind: 'stub', builtin: 'music', color: '#1ed760', icon: '🎵', url: '' },
    { name: 'Settings', kind: 'stub', builtin: 'settings', color: '#8a93a0', icon: '⚙', url: '' }
  ];

  global.CAK3D_PHONE_APPS = phoneApps;
})(window);
