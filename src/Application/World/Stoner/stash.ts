/**
 * What lives on and in the desk. Edit freely: `model` picks a gadget, and
 * anything without one is a floppy disk. Picking something from a drawer
 * loads it on the PC (floppies get inserted into the drive first).
 */
export type StashModel = 'pi' | 'cyd' | 'gameboy' | 'watch' | 'stopwatch' | 'card';

export type StashItem = {
    name: string;
    description?: string;
    language?: string;
    url?: string; // live site / app
    repo?: string; // GitHub repo
    color?: string; // label color
    model?: StashModel;
};

const gh = (name: string) => `https://github.com/real-CAK3D/${name}`;

/** Top drawer: gadgets first, then a stack of floppies */
export const apps: StashItem[] = [
    { name: 'MapPI3', language: 'JavaScript', url: 'http://mappi3.tailac984b.ts.net/', repo: gh('MapPI3'), model: 'pi' },
    { name: 'Scanimal', language: 'Kotlin', repo: gh('Scanimal'), model: 'cyd' },
    { name: 'Pokedex', language: 'JavaScript', repo: gh('Pokedex'), model: 'gameboy' },
    { name: 'ESP-Watch', language: 'C', repo: gh('ESP-Watch'), model: 'watch' },
    { name: 'Tiny Truck', description: 'Drive the tiny truck around a 3D world.', language: 'JavaScript', url: 'https://cak3d-truck.vercel.app', repo: gh('tiny-truck'), color: '#ff5b2a' },
    { name: 'Platform of Things', description: '3D interactive Three.js portfolio.', language: 'TypeScript', url: 'https://real-cak3d.github.io/platform-of-things/', repo: gh('platform-of-things'), color: '#2ab8ff' },
    { name: 'Arachnotes', description: 'The Arachnotes web app (CAK3D-Crawler).', language: 'JavaScript', url: 'https://arachnotes.vercel.app', repo: gh('CAK3D-Crawler'), color: '#a35bff' },
    { name: 'NewsStand', description: "The Corner Chronicle: one newsstand for every one of the Garden's papers.", language: 'Python', repo: gh('NewsStand'), color: '#e07a24' },
    { name: 'Spac3-Gh0st', description: 'Spac3-Gh0st: improved/portable rewrite of Hack-Safe', language: 'JavaScript', url: 'http://hack-safe.tailac984b.ts.net:8765/', repo: gh('Hack-Safe-v2'), color: '#36ff7a' },
    { name: 'Map-Pi-E', language: 'JavaScript', url: 'https://map-pi-zeta.vercel.app', repo: gh('Map-Pi-E'), color: '#3ad1c4' },
    { name: 'NeuroLab', language: 'TypeScript', repo: gh('NeuroLab'), color: '#ff5bd1' },
    { name: 'CYD-Buddy', language: 'C++', repo: gh('CYD-Buddy'), color: '#ffd23d' },
    { name: 'WhatTheFlock', language: 'JavaScript', repo: gh('WhatTheFlock'), color: '#7ad1ff' },
    { name: 'Onstell', language: 'TypeScript', repo: gh('Onstell'), color: '#c3a6ff' },
    { name: 'TheGarden', language: 'TypeScript', repo: gh('TheGarden'), color: '#4caf50' },
    { name: 'SullivanConnect', description: 'An Inventory and Employee Management Application for the Workplace.', language: 'TypeScript', repo: gh('SullivanConnect-App'), color: '#5b8cff' },
];

/** Bottom drawer: the stopwatch, then the websites on floppy */
export const sites: StashItem[] = [
    { name: 'Torque-Timer', language: 'Python', repo: gh('Torque-Timer'), model: 'stopwatch' },
    { name: 'real-cak3d.github.io', description: 'Host Site for CAK3D Projects and Applications', url: 'https://real-cak3d.github.io/', repo: gh('real-CAK3D.github.io'), color: '#a35bff' },
    { name: 'CAK3D Creations', url: 'https://cak3d-creations.vercel.app', repo: gh('CAK3D-Creations'), color: '#5bd16a' },
    { name: 'Arachnotes Web', description: 'The Arachnotes website.', url: 'https://arachnotes-web.vercel.app', repo: gh('CAK3D-Crawler'), color: '#ff5bd1' },
    { name: 'IbbyAutoWorks', description: 'Mobile Auto Service', url: 'https://ibbyautoworks.github.io/', repo: 'https://github.com/IbbyAutoWorks/IbbyAutoWorks.github.io', color: '#ff9b3d' },
    { name: 'Map-Pi', url: 'https://map-pi-zeta.vercel.app', repo: gh('Map-Pi-E'), color: '#3ad1c4' },
    { name: "Zayne's 14th", description: "You're invited! Zayne's turning 14.", url: 'https://zaynes-birthday.vercel.app', repo: gh('ZaynesBirthday'), model: 'card' },
    { name: 'TheRealZayne', description: 'Gamer, music producer, content creator, and outdoor enthusiast.', url: 'https://the-realzayne.github.io/', repo: 'https://github.com/the-RealZayne/the-RealZayne.github.io', color: '#3dd6ff' },
];

/** The paper stacks on the desk */
export const newsStand: StashItem = {
    name: 'The Corner Chronicle',
    description: "The NewsStand: every one of the Garden's papers on one rack.",
    language: 'Python',
    url: 'https://terminal-vnic.tailac984b.ts.net:8444/',
    repo: gh('NewsStand'),
};

/** The binders on the desk */
export const homeInventory: StashItem = {
    name: 'HomeInventory',
    description: 'Everything in the house, filed away in the binders.',
    language: 'JavaScript',
    url: 'https://home-inventory-37.vercel.app',
    repo: gh('HomeInventory'),
};

/** The paper sitting on the desk, from The Corner Chronicle (NewsStand) */
export const doubleWide: StashItem = {
    name: 'The Double Wide',
    description:
        "All the news that's fit to roll. The daily paper on The Corner Chronicle's rack, written by Ganja.",
    language: 'Python',
    url: 'https://terminal-vnic.tailac984b.ts.net:8444/double-wide/',
    repo: gh('NewsStand'),
};
