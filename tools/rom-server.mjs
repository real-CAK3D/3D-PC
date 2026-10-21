#!/usr/bin/env node
/**
 * Private ROM library for the PS5 in the 3D room.
 *
 * Serves a folder of ROMs (default E:\Roms) with CORS and an index.json the
 * emulator reads. Keep it on your tailnet only:
 *
 *   node tools/rom-server.mjs "E:\Roms" 4200
 *   tailscale serve --bg --https=8420 http://127.0.0.1:4200
 *
 * Then the PS5 library URL is https://<this-machine>.<tailnet>.ts.net:8420/
 * (it works from the PC itself and from your phone on Tailscale). Nothing here
 * is exposed to the public internet unless you do that yourself.
 */
import { createServer } from 'node:http';
import { createReadStream, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, basename, dirname, relative, sep } from 'node:path';

const ROOT = process.argv[2] || 'E:\\Roms';
const PORT = Number(process.argv[3] || 4200);
const HOST = '127.0.0.1'; // tailscale serve proxies to this; nothing else can reach it

const SYSTEMS = {
    '.nds': 'nds',
    '.gba': 'gba',
    '.gbc': 'gb',
    '.gb': 'gb',
    '.nes': 'nes',
    '.sfc': 'snes',
    '.smc': 'snes',
    '.n64': 'n64',
    '.z64': 'n64',
    '.v64': 'n64',
    '.md': 'segaMD',
    '.gen': 'segaMD',
    '.chd': 'psx',
    '.pbp': 'psx',
    '.cso': 'psp',
    '.iso': 'psp',
};
const ARCHIVES = ['.zip', '.7z'];

/** Archives don't say what's inside, so guess from the name (most of this library is DS) */
function guessSystem(name) {
    if (/pok[eé]mon.*(red|blue|yellow|gold|silver|crystal)/i.test(name)) return 'gb';
    if (/pok[eé]mon.*(ruby|sapphire|emerald|firered|leafgreen)/i.test(name)) return 'gba';
    return 'nds';
}

function scan() {
    const games = [];
    const walk = (dir, depth) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (depth < 2) walk(full, depth + 1);
                continue;
            }
            const ext = extname(entry.name).toLowerCase();
            const system = SYSTEMS[ext] || (ARCHIVES.includes(ext) ? guessSystem(entry.name) : null);
            if (!system) continue;
            const name = basename(entry.name, extname(entry.name)).replace(/^\d{4} - /, '');
            // a folder next to an archive with the same game unpacked: prefer the unpacked rom
            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            const existing = games.find((g) => g.id === id);
            if (existing && !ARCHIVES.includes(ext)) games.splice(games.indexOf(existing), 1);
            else if (existing) continue;
            const num = (entry.name.match(/^(\d{4}) - /) || [])[1];
            const cover = num && existsSync(join(dir, `${num} - Cover.png`)) ? join(dir, `${num} - Cover.png`) : null;
            const url = (p) => relative(ROOT, p).split(sep).map(encodeURIComponent).join('/');
            games.push({
                id,
                name,
                system,
                file: url(full),
                cover: cover ? url(cover) : null,
                size: statSync(full).size,
            });
        }
    };
    walk(ROOT, 0);
    return games.sort((a, b) => a.name.localeCompare(b.name));
}

const TYPES = { '.png': 'image/png', '.json': 'application/json' };

createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    if (req.method === 'OPTIONS') return res.end();

    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
    if (path === '' || path === 'index.json') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ games: scan() }));
    }
    const file = join(ROOT, path);
    // stay inside the library folder
    if (relative(ROOT, file).startsWith('..') || !existsSync(file) || statSync(file).isDirectory()) {
        res.statusCode = 404;
        return res.end('not found');
    }
    const size = statSync(file).size;
    res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
    if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const end = range[2] ? Number(range[2]) : size - 1;
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
        res.setHeader('Content-Length', end - start + 1);
        return createReadStream(file, { start, end }).pipe(res);
    }
    res.setHeader('Content-Length', size);
    createReadStream(file).pipe(res);
}).listen(PORT, HOST, () => {
    console.log(`ROM library: ${ROOT}`);
    console.log(`serving on http://${HOST}:${PORT}/ (${scan().length} games)`);
    console.log(`share it on your tailnet: tailscale serve --bg --https=8420 http://${HOST}:${PORT}`);
});
