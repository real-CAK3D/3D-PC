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
import { closeSync, createReadStream, existsSync, fstatSync, openSync, readdirSync, readFileSync, readSync, statSync, writeFileSync } from 'node:fs';
import { createInflateRaw } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { join, extname, basename, dirname, relative, sep } from 'node:path';

const ROOT = process.argv[2] || 'E:\\Roms';
const PORT = Number(process.argv[3] || 4200);
const HOST = '127.0.0.1'; // tailscale serve proxies to this; nothing else can reach it

// file extension -> EmulatorJS core
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
    '.smd': 'segaMD',
    '.cue': 'psx',
    '.chd': 'psx',
    '.pbp': 'psx',
    '.cso': 'psp',
    '.iso': 'psp',
    '.dsk': 'amstrad',
};
const ARCHIVES = ['.zip', '.7z', '.rar'];
// a PSP UMD tops out around 1.8 GB; anything bigger is a PS2 / arcade disc no browser emulator runs
const PSP_MAX = 1.9 * 1024 ** 3;

/** Entries inside a .zip (reads the central directory; handles zip64) */
function zipEntries(path) {
    const fd = openSync(path, 'r');
    try {
        const size = fstatSync(fd).size;
        const tailLen = Math.min(size, 66000);
        const tail = Buffer.alloc(tailLen);
        readSync(fd, tail, 0, tailLen, size - tailLen);
        const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
        if (eocd < 0) return [];
        let cdSize = tail.readUInt32LE(eocd + 12);
        let cdOffset = tail.readUInt32LE(eocd + 16);
        if (cdOffset === 0xffffffff || cdSize === 0xffffffff) {
            // zip64: the locator sits just before the regular end record
            const loc = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]), eocd);
            if (loc < 0) return [];
            const z64 = Number(tail.readBigUInt64LE(loc + 8));
            const rec = Buffer.alloc(56);
            readSync(fd, rec, 0, 56, z64);
            cdSize = Number(rec.readBigUInt64LE(40));
            cdOffset = Number(rec.readBigUInt64LE(48));
        }
        const cd = Buffer.alloc(Math.min(cdSize, 4 * 1024 * 1024));
        readSync(fd, cd, 0, cd.length, cdOffset);
        const entries = [];
        for (let i = 0; i + 46 <= cd.length && cd.readUInt32LE(i) === 0x02014b50; ) {
            const nameLen = cd.readUInt16LE(i + 28);
            const extraLen = cd.readUInt16LE(i + 30);
            const commentLen = cd.readUInt16LE(i + 32);
            let offset = cd.readUInt32LE(i + 42);
            if (offset === 0xffffffff) {
                // zip64 extra field holds the real offset (after any 64-bit sizes)
                const extra = cd.subarray(i + 46 + nameLen, i + 46 + nameLen + extraLen);
                for (let j = 0; j + 4 <= extra.length; ) {
                    const id = extra.readUInt16LE(j);
                    const len = extra.readUInt16LE(j + 2);
                    if (id === 1) {
                        const fields = [];
                        for (let k = 0; k + 8 <= len; k += 8) fields.push(Number(extra.readBigUInt64LE(j + 4 + k)));
                        offset = fields[fields.length - 1];
                    }
                    j += 4 + len;
                }
            }
            let usize = cd.readUInt32LE(i + 24);
            if (usize === 0xffffffff) {
                const extra = cd.subarray(i + 46 + nameLen, i + 46 + nameLen + extraLen);
                for (let j = 0; j + 4 <= extra.length; ) {
                    if (extra.readUInt16LE(j) === 1) usize = Number(extra.readBigUInt64LE(j + 4));
                    j += 4 + extra.readUInt16LE(j + 2);
                }
            }
            entries.push({ name: cd.toString('utf8', i + 46, i + 46 + nameLen), method: cd.readUInt16LE(i + 10), offset, size: usize });
            i += 46 + nameLen + extraLen + commentLen;
        }
        return entries;
    } catch (e) {
        return [];
    } finally {
        closeSync(fd);
    }
}

/** Which emulator core plays this file, or why none can */
async function detect(full, name, size) {
    const ext = extname(name).toLowerCase();
    if (/lindbergh/i.test(name)) return { system: 'arcade', supported: false, note: 'Sega Lindbergh arcade board' };
    if (ext === '.zip') {
        const entries = zipEntries(full);
        const inner = entries.map((e) => extname(e.name).toLowerCase());
        const hit = inner.map((e) => SYSTEMS[e]).find(Boolean) || (inner.includes('.bin') ? 'psx' : null);
        if (!hit) return null;
        if (hit === 'psp') {
            if (size > PSP_MAX) return { system: 'ps2', supported: false, note: 'PlayStation 2 disc' };
            // PSP and PS2 discs are both .iso: look for PSP_GAME vs SYSTEM.CNF near the start
            const iso = entries.find((e) => /\.iso$/i.test(e.name));
            const kind = iso ? await discKind(full, iso) : 'psp';
            if (kind === 'ps2') return { system: 'ps2', supported: false, note: 'PlayStation 2 disc' };
            // too big for the emulator to unzip in the browser: stream the disc out of the zip instead
            if (iso) return { system: 'psp', supported: true, inner: iso.name };
        }
        return { system: hit, supported: true };
    }
    // the numbered .7z / .rar sets in this library are Nintendo DS scene releases
    if (ext === '.7z' || ext === '.rar') return { system: 'nds', supported: true };
    const system = SYSTEMS[ext];
    if (!system) return null;
    if (system === 'psp' && size > PSP_MAX) return { system: 'ps2', supported: false, note: 'PlayStation 2 disc' };
    return { system, supported: true };
}

/** Read the first few MB of a zipped disc and tell PSP from PS2 (cached on disk) */
const DISC_CACHE = join(dirname(fileURLToPath(import.meta.url)), '.rom-discs.json');
let discCache = {};
try {
    discCache = JSON.parse(readFileSync(DISC_CACHE, 'utf8'));
} catch (e) {}
async function discKind(zipPath, entry) {
    const key = `${zipPath}|${statSync(zipPath).size}`;
    if (discCache[key]) return discCache[key];
    const fd = openSync(zipPath, 'r');
    const head = Buffer.alloc(30);
    readSync(fd, head, 0, 30, entry.offset);
    closeSync(fd);
    const dataStart = entry.offset + 30 + head.readUInt16LE(26) + head.readUInt16LE(28);
    // stream the start of the disc (inflating if needed) and stop after a few MB
    const WANT = 6 * 1024 * 1024;
    const text = await new Promise((resolve) => {
        const chunks = [];
        let got = 0;
        const src = createReadStream(zipPath, { start: dataStart, end: dataStart + 64 * 1024 * 1024 });
        const stream = entry.method === 8 ? src.pipe(createInflateRaw()) : src;
        const done = () => {
            src.destroy();
            resolve(Buffer.concat(chunks).subarray(0, WANT).toString('latin1'));
        };
        stream.on('data', (c) => {
            chunks.push(c);
            got += c.length;
            if (got >= WANT) done();
        });
        stream.on('end', done);
        stream.on('error', done);
    });
    let kind = 'psp';
    if (text.indexOf('PSP_GAME') >= 0 || text.indexOf('UMD_DATA') >= 0) kind = 'psp';
    else if (text.indexOf('SYSTEM.CNF') >= 0) kind = 'ps2';
    discCache[key] = kind;
    try {
        writeFileSync(DISC_CACHE, JSON.stringify(discCache));
    } catch (e) {}
    return kind;
}

let cache = null;
async function scan() {
    if (cache && Date.now() - cache.at < 60000) return cache.games;
    const games = [];
    const walk = async (dir, depth) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                if (depth < 2) await walk(full, depth + 1);
                continue;
            }
            const ext = extname(entry.name).toLowerCase();
            // a .bin next to its .cue is played through the .cue
            if (ext === '.bin') continue;
            const size = statSync(full).size;
            const found = await detect(full, entry.name, size);
            if (!found) continue;
            const name = basename(entry.name, extname(entry.name)).replace(/^\d{4} - /, '');
            // the same game unpacked next to its archive: prefer the unpacked rom (smaller download)
            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            const existing = games.find((g) => g.id === id);
            if (existing && !ARCHIVES.includes(ext)) games.splice(games.indexOf(existing), 1);
            else if (existing) continue;
            const num = (entry.name.match(/^(\d{4}) - /) || [])[1] || (basename(dir).match(/^(\d{4}) - /) || [])[1];
            const coverPath = num && existsSync(join(dir, `${num} - Cover.png`)) ? join(dir, `${num} - Cover.png`) : null;
            const url = (p) => relative(ROOT, p).split(sep).map(encodeURIComponent).join('/');
            games.push({
                id,
                name,
                system: found.system,
                supported: found.supported,
                note: found.note || null,
                // `raw/<zip>/<file inside>` streams one file out of a zip, already unzipped
                file: found.inner ? `raw/${url(full)}/${encodeURIComponent(found.inner)}` : url(full),
                cover: coverPath ? url(coverPath) : null,
                size,
            });
        }
    };
    await walk(ROOT, 0);
    games.sort((a, b) => a.name.localeCompare(b.name));
    cache = { at: Date.now(), games };
    return games;
}

/** Pipe a file to the client; emulators cancel downloads all the time, which must not crash us */
function send(stream, res) {
    stream.on('error', () => res.destroy());
    res.on('close', () => stream.destroy());
    stream.pipe(res);
}
/** Stream one entry of a zip, unzipped: raw/<zip path>/<entry name> */
function sendInner(rest, res) {
    const cut = rest.lastIndexOf('/');
    const zipPath = join(ROOT, rest.slice(0, cut));
    const entryName = rest.slice(cut + 1);
    if (relative(ROOT, zipPath).startsWith('..') || !existsSync(zipPath)) {
        res.statusCode = 404;
        return res.end('not found');
    }
    const entry = zipEntries(zipPath).find((e) => e.name === entryName);
    if (!entry) {
        res.statusCode = 404;
        return res.end('not found');
    }
    const fd = openSync(zipPath, 'r');
    const head = Buffer.alloc(30);
    readSync(fd, head, 0, 30, entry.offset);
    closeSync(fd);
    const start = entry.offset + 30 + head.readUInt16LE(26) + head.readUInt16LE(28);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', entry.size);
    const src = createReadStream(zipPath, { start });
    send(entry.method === 8 ? src.pipe(createInflateRaw()) : src, res);
    res.on('close', () => src.destroy());
}

process.on('uncaughtException', (e) => console.error('rom-server:', e.message));

const TYPES = { '.png': 'image/png', '.json': 'application/json' };

createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
    if (req.method === 'OPTIONS') return res.end();

    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
    if (path === '' || path === 'index.json') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ games: await scan() }));
    }
    if (path.startsWith('raw/')) return sendInner(path.slice(4), res);
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
        return send(createReadStream(file, { start, end }), res);
    }
    res.setHeader('Content-Length', size);
    send(createReadStream(file), res);
}).listen(PORT, HOST, () => {
    console.log(`ROM library: ${ROOT}`);
    scan().then((g) => console.log(`serving on http://${HOST}:${PORT}/ (${g.length} games)`));
    console.log(`share it on your tailnet: tailscale serve --bg --https=8420 http://${HOST}:${PORT}`);
});
