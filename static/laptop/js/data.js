/* CAK3D 10: the data the laptop shows.
 * Projects, sites and papers mirror cak3d-pc-inner-site/src/constants/cak3d.ts (keep in sync). */
(function () {
    'use strict';
    var GITHUB = 'https://github.com/real-CAK3D';
    var gh = function (repo) { return GITHUB + '/' + repo; };

    var links = {
        site: 'https://real-cak3d.github.io/',
        github: GITHUB,
        discord: 'https://discord.gg/mahQZmTZxJ',
        cak3dBotDiscord: 'https://discord.gg/6NFd2cx9KU',
        zBotDiscord: 'http://www.discord.gg/8J5F9KjkS6',
        spotify: 'https://open.spotify.com/user/rastaman_420',
        paypal: 'https://paypal.me/CAK3D',
        buyMeACoffee: 'https://buymeacoffee.com/CAK3D',
        patreon: 'https://www.patreon.com/CAK3D',
        nitrado: 'https://server.nitrado.net/eng/donations/donate2/5301837/0',
        stats: 'https://stats.hyo.dev/stats/real-CAK3D'
    };

    var featured = [
        { name: 'CAK3DBot', description: 'A Discord server bot for the ꧁ᙃᥲყ Z ᙅᗣҜӠᙃ꧂ Discord and DayZ servers. Livonia and Sakhal are up and running, with Chernarus on the way.', language: 'JavaScript', url: links.cak3dBotDiscord, repo: gh('CAK3DBot') },
        { name: 'ZBot', description: "The all-seeing, all-doing powerhouse that keeps the God's of Z's server running day in and day out. Backup bot for CAK3DBot.", language: 'JavaScript', url: links.zBotDiscord },
        { name: 'Sullivan Connect', description: 'Your trusty shop companion, built to streamline the day-to-day of an auto location: full inventory and re-stock system plus an interactive "Team" point system.', language: 'TypeScript', repo: gh('SullivanConnect-App') },
        { name: 'The ᙃᥲყⱿZ ᙅᗣҜӠᙃ Nitrado Servers', description: 'DayZ servers tuned for glitch-free, immersive, realistic survival. Expect some struggle with a nice relaxing accomplished feel.', url: links.nitrado }
    ];

    var apps = [
        { name: 'Tiny Truck', description: 'Drive the tiny truck around a 3D world.', language: 'JavaScript', url: 'https://cak3d-truck.vercel.app', repo: gh('tiny-truck') },
        { name: 'Platform of Things', description: '3D interactive Three.js portfolio.', language: 'TypeScript', url: 'https://real-cak3d.github.io/platform-of-things/', repo: gh('platform-of-things') },
        { name: 'HomeInventory', description: '', language: 'JavaScript', url: 'https://home-inventory-37.vercel.app', repo: gh('HomeInventory') },
        { name: 'CAK3D-Crawler', description: 'Arachnotes: the web app (website at arachnotes-web.vercel.app).', language: 'JavaScript', url: 'https://arachnotes.vercel.app', repo: gh('CAK3D-Crawler') },
        { name: 'NewsStand', description: 'The Corner Chronicle: one newsstand app for every Garden paper.', language: 'Python', repo: gh('NewsStand') },
        { name: 'Hack-Safe-v2', description: 'Spac3-Gh0st: improved/portable rewrite of Hack-Safe.', language: 'JavaScript', repo: gh('Hack-Safe-v2') },
        { name: 'MapPI3', description: '', language: 'JavaScript', repo: gh('MapPI3') },
        { name: 'Map-Pi-E', description: '', language: 'JavaScript', url: 'https://map-pi-zeta.vercel.app', repo: gh('Map-Pi-E') },
        { name: 'Scanimal', description: '', language: 'Kotlin', repo: gh('Scanimal') },
        { name: 'Torque-Timer', description: '', language: 'Python', repo: gh('Torque-Timer') },
        { name: 'NeuroLab', description: '', language: 'TypeScript', repo: gh('NeuroLab') },
        { name: 'ESP-Watch', description: '', language: 'C', repo: gh('ESP-Watch') },
        { name: 'CYD-Buddy', description: '', language: 'C++', repo: gh('CYD-Buddy') },
        { name: 'Pokedex', description: '', language: 'JavaScript', repo: gh('Pokedex') },
        { name: 'WhatTheFlock', description: '', language: 'JavaScript', repo: gh('WhatTheFlock') },
        { name: 'Onstell', description: '', language: 'TypeScript', repo: gh('Onstell') },
        { name: 'TheGarden', description: 'The Garden: the agents behind the papers.', language: 'TypeScript', repo: gh('TheGarden') },
        { name: 'LLM-Wiki', description: '', repo: gh('LLM-Wiki') }
    ];

    var sites = [
        { name: 'real-cak3d.github.io', url: links.site, repo: gh('real-CAK3D.github.io'), note: 'Host site for CAK3D projects and applications' },
        { name: 'CAK3D Creations', url: 'https://cak3d-creations.vercel.app', repo: gh('CAK3D-Creations') },
        { name: 'Arachnotes', url: 'https://arachnotes-web.vercel.app', repo: gh('CAK3D-Crawler') },
        { name: 'IbbyAutoWorks', url: 'https://ibbyautoworks.github.io/', repo: 'https://github.com/IbbyAutoWorks/IbbyAutoWorks.github.io', note: 'Mobile Auto Service' },
        { name: 'Ibby: Request Service', url: 'https://ibbyautoworks.vercel.app/request', repo: 'https://github.com/IbbyAutoWorks/IbbyAutoWorks.github.io', note: 'Book a mobile repair' },
        { name: 'Home Inventory', url: 'https://home-inventory-37.vercel.app', repo: gh('HomeInventory') },
        { name: 'Map-Pi', url: 'https://map-pi-zeta.vercel.app', repo: gh('Map-Pi-E') },
        { name: "Zayne's Birthday", url: 'https://zaynes-birthday.vercel.app', repo: gh('ZaynesBirthday') },
        { name: 'Tiny Truck', url: 'https://cak3d-truck.vercel.app', repo: gh('tiny-truck'), note: 'Drive around in 3D' },
        { name: 'MyPetID', url: 'https://mypetid.vercel.app/', repo: 'https://github.com/MyPetID-Home/MyPetID-Home.github.io' }
    ];

    var NEWSSTAND_URL = 'https://terminal-vnic.tailac984b.ts.net:8444';
    var papers = [
        { id: 'double-wide', name: 'The Double Wide', when: 'Daily', motto: "All the news that's fit to roll", by: 'Ganja', repo: gh('TheDoubleWide'), color: '#e07a24', ink: '#1b1510' },
        { id: 're-up', name: 'The Re-Up', when: 'Daily', motto: 'What the Garden needs', by: 'Ganja', repo: gh('TheRe-Up'), color: '#f5eedb', ink: '#9c2a1c' },
        { id: 'dime-bags', name: 'Dime Bags', when: 'Nightly', motto: "Tonight's lines · last night's results", by: 'Disco Stu', repo: gh('DimeBags'), color: '#1f4a2a', ink: '#e8d9a8' },
        { id: 'crossword-times', name: 'The Crossword Times', when: 'Daily + extras', motto: 'Pencils down at midnight', by: 'the Garden', color: '#ffffff', ink: '#111111' },
        { id: 'sunday-smoke', name: 'The Sunday Smoke', when: 'Sundays', motto: 'The whole week, rolled up', by: 'Ganja', repo: gh('TheSundaySmoke'), color: '#6a4a8a', ink: '#f6e9ff' },
        { id: 'roach-clips', name: 'Roach Clips', when: 'Tuesdays + nightly', motto: 'Clip it · Try it · Keep it', by: 'B.I.G', repo: gh('RoachClips'), color: '#c43d3d', ink: '#ffffff' },
        { id: 'trail-mix', name: 'Trail Mix', when: 'Monthly · the 1st', motto: 'Salty, sweet, a little nutty', by: 'Maple & Herbie', repo: gh('TrailMix'), color: '#8a6a3a', ink: '#fff6e0' },
        { id: 'dab', name: 'DAB', when: 'Monthly', motto: "The Garden's humor magazine", by: 'the whole Garden', repo: gh('DabMagazine'), color: '#ffd23d', ink: '#2a1200' },
        { id: 'hashish', name: 'HASHISH', when: 'Monthly · the 15th', motto: 'Centerfold · interview · strain of the month', by: 'Disco Stu', repo: gh('Hashish'), color: '#3a2618', ink: '#e0b42b' },
        { id: 'seed-catalog', name: 'The Seed Catalog', when: 'New packs monthly', motto: 'Plant an idea, grow a project', by: 'B.I.G & CHRONIC', color: '#4f8a3a', ink: '#ffffff' },
        { id: 'perennial', name: 'The Perennial', when: 'Grows every month', motto: 'Comes back every year, deeper rooted', by: 'the Garden', repo: gh('ThePerennial'), color: '#2f6b4f', ink: '#d9ffe2' },
        { id: 'baked-goods', name: 'Baked Goods', when: 'New recipes Saturdays', motto: 'Tried, tested & fresh out of the oven', by: 'CHRONIC', repo: gh('BakedGoods'), color: '#c9a070', ink: '#3a1a00' },
        { id: 'green-thumb', name: 'The Green Thumb', when: 'Always on the shelf', motto: 'Every device, app & login', by: 'the agents', repo: gh('TheGreenThumb'), color: '#5bd16a', ink: '#0d1f12' },
        { id: 'yearbook', name: "The Garden '26", when: 'Yearly', motto: 'Stay rad, never change', by: 'the Class of 2026', color: '#7a3fd1', ink: '#ffffff' }
    ];

    /* Room photos that ship with the site (static/images) */
    var pictures = [
        { name: 'The room.jpg', src: '../images/preview-new.jpg' },
        { name: 'The room (classic).jpg', src: '../images/preview.jpg' },
        { name: 'Room preview.jpg', src: '../images/preview-image.jpg' }
    ];

    /* Browser home page quick links */
    var quickLinks = [
        { name: 'CAK3D', url: 'https://real-cak3d.github.io/', emoji: '🌿' },
        { name: 'The PC', url: 'https://cak3d-inner-pc.vercel.app/', emoji: '🖥️' },
        { name: 'Tiny Truck', url: 'https://cak3d-truck.vercel.app/', emoji: '🛻' },
        { name: 'Platform of Things', url: 'https://real-cak3d.github.io/platform-of-things/', emoji: '🧊' },
        { name: 'Arachnotes', url: 'https://arachnotes.vercel.app/', emoji: '🕷️' },
        { name: 'Home Inventory', url: 'https://home-inventory-37.vercel.app/', emoji: '📦' },
        { name: 'Map-Pi', url: 'https://map-pi-zeta.vercel.app/', emoji: '🗺️' },
        { name: 'MyPetID', url: 'https://mypetid.vercel.app/', emoji: '🐾' },
        { name: 'IbbyAutoWorks', url: 'https://ibbyautoworks.github.io/', emoji: '🔧' },
        { name: "Zayne's Birthday", url: 'https://zaynes-birthday.vercel.app/', emoji: '🎂' },
        { name: 'the-realzayne', url: 'https://the-realzayne.github.io/', emoji: '⭐' },
        { name: 'Wikipedia', url: 'https://en.wikipedia.org/', emoji: '📚' }
    ];

    /* The room TV's lineup, same order as Entertainment.lineup() (tune value = index) */
    var channels = [
        { name: 'STATIC', kind: 'static' },
        { name: 'OFF THE AIR', kind: 'bars' },
        { name: 'TOON TOWN', kind: 'video', key: 'cartoons', label: function (c) { return c.title; } },
        { name: 'WDWN NEWS', kind: 'news' },
        { name: 'WEATHER', kind: 'weather' },
        { name: 'GNBC MARKETS', kind: 'markets' },
        { name: 'GARDEN MTV', kind: 'youtube', key: 'mtv', label: function (c) { return (c.artist ? c.artist + ' · ' : '') + c.title; } },
        { name: 'CHOPPER 7', kind: 'youtube', key: 'chases', label: function (c) { return 'LIVE · ' + c.title; } },
        { name: 'GARDEN KITCHEN', kind: 'youtube', key: 'kitchen', label: function (c) { return (c.show ? c.show + ' · ' : '') + c.title; } },
        { name: 'COMMERCIALS', kind: 'video', key: 'ads', label: function (c) { return 'COMMERCIAL BREAK · ' + c.title; } },
        { name: 'THE LATE MOVIE', kind: 'video', key: 'movies', label: function (c) { return c.title; } },
        { name: 'THE FIREPLACE', kind: 'youtube', key: 'fire', label: function (c) { return c.title; } },
        { name: '[ADULT SWIM]', kind: 'youtube', key: 'aswim', label: function (c) { return (c.show ? c.show + ' · ' : '') + c.title; } },
        { name: 'LECTURE HALL', kind: 'youtube', key: 'lectures', label: function (c) { return (c.show ? c.show + ' · ' : '') + c.title; } },
        { name: 'JOE ROGAN', kind: 'youtube', key: 'jre', label: function (c) { return c.title; } },
        { name: 'THREE STOOGES', kind: 'video', key: 'stooges', label: function (c) { return c.title; } },
        { name: 'ANTIQUES ROADSHOW', kind: 'youtube', key: 'roadshow', label: function (c) { return c.title; } },
        { name: 'CAK3D FM', kind: 'fm' },
        { name: 'JELLYFIN', kind: 'jellyfin' }
    ];

    window.CAK3D_DATA = {
        GITHUB: GITHUB,
        links: links,
        featured: featured,
        apps: apps,
        sites: sites,
        papers: papers,
        pictures: pictures,
        NEWSSTAND_URL: NEWSSTAND_URL,
        JELLYFIN_URL: 'https://nukebox.tailac984b.ts.net:8096/web/',
        INNER_PC_URL: 'https://cak3d-inner-pc.vercel.app/',
        quickLinks: quickLinks,
        channels: channels
    };
})();
