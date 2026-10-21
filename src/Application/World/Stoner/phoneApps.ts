/**
 * What's on the phone on the couch arm. Web apps open right on the phone (and
 * can be installed from a real phone by scanning the QR code); Android apps
 * link to the APK on their GitHub release.
 */
export type PhoneApp = {
    name: string;
    kind: 'web' | 'android';
    color: string;
    icon: string; // a character or emoji for the home screen
    url: string; // the web app, or the release page with the APK
    repo?: string;
    note?: string;
};

const gh = (repo: string) => `https://github.com/real-CAK3D/${repo}`;
const latest = (repo: string) => `${gh(repo)}/releases/latest`;

export const phoneApps: PhoneApp[] = [
    { name: 'Arachnotes', kind: 'android', color: '#a35bff', icon: '🕷', url: latest('CAK3D-Crawler'), repo: gh('CAK3D-Crawler'), note: 'APK + AAB on every release' },
    { name: 'Scanimal', kind: 'android', color: '#ff9b3d', icon: '🐾', url: latest('Scanimal'), repo: gh('Scanimal') },
    { name: 'HomeInventory', kind: 'android', color: '#5bd16a', icon: '🏠', url: latest('HomeInventory'), repo: gh('HomeInventory') },
    { name: 'MapPI3', kind: 'android', color: '#4aa8ff', icon: '🗺', url: latest('MapPI3'), repo: gh('MapPI3') },
    { name: 'TorqueClock', kind: 'android', color: '#ff5b5b', icon: '⏱', url: latest('Torque-Timer'), repo: gh('Torque-Timer') },
    { name: 'Arachnotes Web', kind: 'web', color: '#7a3fd1', icon: '🕸', url: 'https://cak3d-crawler.vercel.app', repo: gh('CAK3D-Crawler') },
    { name: 'Home Inventory', kind: 'web', color: '#2bb85a', icon: '📦', url: 'https://home-inventory-37.vercel.app', repo: gh('HomeInventory') },
    { name: 'Map-Pi', kind: 'web', color: '#3ad1c4', icon: '📍', url: 'https://map-pi-zeta.vercel.app', repo: gh('Map-Pi-E') },
    { name: 'MyPetID', kind: 'web', color: '#3d6aff', icon: '🐶', url: 'https://mypetid-home.github.io/', repo: 'https://github.com/MyPetID-Home/MyPetID-Home.github.io' },
    { name: 'CAK3D Creations', kind: 'web', color: '#5bd16a', icon: '🌿', url: 'https://cak3d-creations.vercel.app', repo: gh('CAK3D-Creations') },
    { name: 'real-cak3d', kind: 'web', color: '#b04dff', icon: '꧁', url: 'https://real-cak3d.github.io/', repo: gh('real-CAK3D.github.io') },
    { name: "Zayne's B-day", kind: 'web', color: '#ffd23d', icon: '🎂', url: 'https://zaynes-birthday.vercel.app', repo: gh('ZaynesBirthday') },
    { name: 'Corner Chronicle', kind: 'web', color: '#e07a24', icon: '📰', url: 'https://terminal-vnic.tailac984b.ts.net:8444/', repo: gh('NewsStand'), note: 'Tailscale only' },
];
