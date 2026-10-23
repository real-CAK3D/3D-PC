/* CAK3D OS X icons: simple hand-drawn SVGs (no third-party assets).
 * App icons sit on a rounded square ("tile") like a dock icon. */
(function () {
    'use strict';
    var s = function (body) {
        return '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false">' + body + '</svg>';
    };
    // rounded-square app tile with a vertical gradient
    var tile = function (top, bottom, body) {
        // no <defs>: an id'd gradient inside a hidden copy of the icon would stop rendering elsewhere
        return s('<rect x="3" y="3" width="42" height="42" rx="10" fill="' + bottom + '"/>' +
            '<path d="M3 13a10 10 0 0110-10h22a10 10 0 0110 10v13H3z" fill="' + top + '" opacity=".75"/>' +
            '<rect x="3.5" y="3.5" width="41" height="41" rx="9.5" fill="none" stroke="rgba(255,255,255,.18)"/>' + body);
    };
    var leaf = '<path d="M24 6c3 8 3 15 0 23-3-8-3-15 0-23z" fill="#7dff7a"/><path d="M24 29c-6-6-12-8-19-8 4 7 11 10 19 8zM24 29c6-6 12-8 19-8-4 7-11 10-19 8z" fill="#5bd16a"/><path d="M24 29c-4-3-9-4-14-2 4 4 9 5 14 2zM24 29c4-3 9-4 14-2-4 4-9 5-14 2z" fill="#b388ff"/><rect x="23" y="28" width="2" height="14" rx="1" fill="#8a5cff"/>';
    window.ICONS = {
        logo: s(leaf),
        leafMono: s('<path d="M24 4c3.5 9 3.5 17 0 26-3.5-9-3.5-17 0-26zM24 30c-6-7-13-9-21-9 4 8 12 11 21 9zM24 30c6-7 13-9 21-9-4 8-12 11-21 9z" fill="currentColor"/><rect x="22.8" y="29" width="2.4" height="15" rx="1.2" fill="currentColor"/>'),
        finder: tile('#a98bff', '#5b2fc0', '<path d="M13 14a3 3 0 013-3h7l3 3h7a3 3 0 013 3v14a3 3 0 01-3 3H16a3 3 0 01-3-3z" fill="#f3ecff"/><path d="M24 17c1.5 4 1.5 7 0 11-1.5-4-1.5-7 0-11zM24 28c-3-3-6-4-9-4 2 3 5 5 9 4zM24 28c3-3 6-4 9-4-2 3-5 5-9 4z" fill="#3fbf5a"/>'),
        launchpad: tile('#4a4458', '#25212e', '<g fill="#ff6b6b"><rect x="11" y="11" width="7" height="7" rx="2"/></g><rect x="20.5" y="11" width="7" height="7" rx="2" fill="#ffd23d"/><rect x="30" y="11" width="7" height="7" rx="2" fill="#5bd16a"/><rect x="11" y="20.5" width="7" height="7" rx="2" fill="#5bd1ff"/><rect x="20.5" y="20.5" width="7" height="7" rx="2" fill="#a46bff"/><rect x="30" y="20.5" width="7" height="7" rx="2" fill="#ff8ad8"/><rect x="11" y="30" width="7" height="7" rx="2" fill="#ffa64d"/><rect x="20.5" y="30" width="7" height="7" rx="2" fill="#7dff7a"/><rect x="30" y="30" width="7" height="7" rx="2" fill="#b9b0d0"/>'),
        browser: tile('#ffffff', '#dcd6ea', '<circle cx="24" cy="24" r="16" fill="#3a8dff"/><circle cx="24" cy="24" r="14.5" fill="none" stroke="#bfe0ff" stroke-width="1" stroke-dasharray="1 2.2"/><path d="M33 15L26 26 22 22z" fill="#ff5d5d"/><path d="M15 33l7-11 4 4z" fill="#f4f1ff"/><circle cx="24" cy="24" r="1.6" fill="#1d1530"/>'),
        pc: tile('#3d3156', '#1d1530', '<rect x="10" y="12" width="28" height="18" rx="2" fill="#66d9ff"/><path d="M10 26l8-7 6 5 5-3 9 7v2a2 2 0 01-2 2H12a2 2 0 01-2-2z" fill="#5bd16a"/><rect x="21" y="31" width="6" height="4" fill="#8b80a8"/><rect x="16" y="35" width="16" height="2.5" rx="1.2" fill="#b9b0d0"/><circle cx="35" cy="35" r="6" fill="#8a5cff" stroke="#fff" stroke-width="1.2"/><path d="M32.5 35h5M35.5 33l2 2-2 2" stroke="#fff" stroke-width="1.3" fill="none"/>'),
        tv: tile('#2b2340', '#100c18', '<rect x="9" y="13" width="30" height="20" rx="2" fill="#16202e"/><rect x="11" y="15" width="4" height="12" fill="#c0c0c0"/><rect x="15" y="15" width="4" height="12" fill="#c0c000"/><rect x="19" y="15" width="4" height="12" fill="#00c0c0"/><rect x="23" y="15" width="4" height="12" fill="#00c000"/><rect x="27" y="15" width="4" height="12" fill="#c000c0"/><rect x="31" y="15" width="6" height="12" fill="#c00000"/><rect x="11" y="27" width="26" height="4" fill="#0000c0"/><rect x="18" y="35" width="12" height="2.5" rx="1" fill="#6b5a8e"/>'),
        fm: tile('#ff5dc8', '#7a2ad1', '<circle cx="24" cy="24" r="11" fill="#140c22"/><circle cx="24" cy="24" r="8" fill="none" stroke="#3a2a58" stroke-width="1"/><circle cx="24" cy="24" r="3.5" fill="#7dff7a"/><path d="M34 12v13a3 3 0 11-2-2.8V14l-6 1.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>'),
        folder: s('<path d="M4 13a3 3 0 013-3h11l4 4h19a3 3 0 013 3v3H4z" fill="#5d9be8"/><rect x="4" y="16" width="40" height="24" rx="3.5" fill="#7fb6f7"/><rect x="4" y="16" width="40" height="3" fill="#a9cffb" opacity=".6"/>'),
        folderGreen: s('<path d="M4 13a3 3 0 013-3h11l4 4h19a3 3 0 013 3v3H4z" fill="#3c9a4a"/><rect x="4" y="16" width="40" height="24" rx="3.5" fill="#5bd16a"/>'),
        folderPurple: s('<path d="M4 13a3 3 0 013-3h11l4 4h19a3 3 0 013 3v3H4z" fill="#6b3fb5"/><rect x="4" y="16" width="40" height="24" rx="3.5" fill="#a46bff"/>'),
        disk: s('<rect x="5" y="14" width="38" height="22" rx="4" fill="#c9c3d6"/><rect x="5" y="14" width="38" height="11" rx="4" fill="#e9e5f1"/><rect x="9" y="29" width="14" height="2" rx="1" fill="#8b80a8"/><circle cx="37" cy="30" r="2" fill="#5bd16a"/>'),
        notes: tile('#fffbe6', '#f1e9c4', '<rect x="3" y="3" width="42" height="11" rx="10" fill="#ffd23d"/><rect x="3" y="9" width="42" height="5" fill="#ffd23d"/><path d="M11 22h26M11 28h26M11 34h18" stroke="#c9c0a0" stroke-width="1.6"/>'),
        calc: tile('#4a4458', '#1f1b28', '<rect x="11" y="9" width="26" height="8" rx="2" fill="#7dff7a" opacity=".9"/><g fill="#8b80a8"><circle cx="15" cy="23" r="3"/><circle cx="24" cy="23" r="3"/><circle cx="15" cy="31" r="3"/><circle cx="24" cy="31" r="3"/><circle cx="15" cy="39" r="2.6"/><circle cx="24" cy="39" r="2.6"/></g><g fill="#ffa64d"><circle cx="33" cy="23" r="3"/><circle cx="33" cy="31" r="3"/><circle cx="33" cy="39" r="2.6"/></g>'),
        cmd: tile('#3a3a3a', '#111111', '<path d="M12 17l7 6-7 6" stroke="#e8e8e8" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 31h12" stroke="#7dff7a" stroke-width="2.6" stroke-linecap="round"/>'),
        settings: tile('#a5a0b2', '#5e5970', '<circle cx="24" cy="24" r="12" fill="none" stroke="#2b2638" stroke-width="5" stroke-dasharray="3.2 2.2"/><circle cx="24" cy="24" r="9" fill="#d9d5e2"/><circle cx="24" cy="24" r="3.5" fill="#5e5970"/><path d="M24 15v5M24 28v5M15 24h5M28 24h5" stroke="#5e5970" stroke-width="2"/>'),
        paint: tile('#fff2e0', '#ffd8a8', '<path d="M24 10c-9 0-15 6-15 13 0 7 5 11 10 11 3 0 3-2 2-4-1-2 1-4 3-4h5c5 0 10-3 10-8 0-5-6-8-15-8z" fill="#fff"/><circle cx="16" cy="21" r="2.6" fill="#ff5d5d"/><circle cx="21" cy="15" r="2.6" fill="#ffd23d"/><circle cx="28" cy="14" r="2.6" fill="#5bd16a"/><circle cx="33" cy="19" r="2.6" fill="#a46bff"/><path d="M36 30l-8 8" stroke="#8a5a2a" stroke-width="3" stroke-linecap="round"/>'),
        photos: tile('#ffffff', '#ece8f4', '<g transform="translate(24 24)"><ellipse rx="4" ry="9" cy="-8" fill="#ffa64d" opacity=".9"/><ellipse rx="4" ry="9" cy="-8" fill="#ff5d5d" opacity=".85" transform="rotate(60)"/><ellipse rx="4" ry="9" cy="-8" fill="#a46bff" opacity=".85" transform="rotate(120)"/><ellipse rx="4" ry="9" cy="-8" fill="#5bd1ff" opacity=".85" transform="rotate(180)"/><ellipse rx="4" ry="9" cy="-8" fill="#5bd16a" opacity=".85" transform="rotate(240)"/><ellipse rx="4" ry="9" cy="-8" fill="#ffd23d" opacity=".85" transform="rotate(300)"/></g>'),
        bin: s('<path d="M12 12h24l-2.2 30a2 2 0 01-2 1.8H16.2a2 2 0 01-2-1.8z" fill="rgba(220,226,240,.85)" stroke="#8b93a8" stroke-width="1"/><path d="M18 17l1 22M24 17v22M30 17l-1 22" stroke="#8b93a8" stroke-width="1"/><rect x="10" y="9" width="28" height="3.5" rx="1.5" fill="#b8bfd0"/>'),
        user: s('<circle cx="24" cy="24" r="22" fill="#5b2fc0"/><circle cx="24" cy="24" r="22" fill="none" stroke="#a98bff" stroke-width="2"/><circle cx="24" cy="19" r="8" fill="#e9e1ff"/><path d="M9 39c3-7 9-10 15-10s12 3 15 10a20 20 0 01-30 0z" fill="#e9e1ff"/>'),
        search: s('<circle cx="20" cy="20" r="11" stroke="currentColor" stroke-width="4" fill="none"/><path d="M28 28l12 12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>'),
        cc: s('<rect x="6" y="10" width="36" height="11" rx="5.5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="15.5" r="3" fill="currentColor"/><rect x="6" y="27" width="36" height="11" rx="5.5" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="32" cy="32.5" r="3" fill="currentColor"/>'),
        wifi: s('<path d="M5 19a27 27 0 0138 0M11 26a18 18 0 0126 0M17 33a9 9 0 0114 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="39" r="3" fill="currentColor"/>'),
        doc: s('<path d="M12 4h16l10 10v30H12z" fill="#f4f1ff" stroke="#cfc6ea"/><path d="M28 4v10h10" fill="#cfc6ea"/><path d="M17 22h16M17 28h16M17 34h10" stroke="#7a7290" stroke-width="2"/>'),
        link: s('<circle cx="24" cy="24" r="19" fill="#2a6fdb"/><path d="M5 24h38M24 5c-8 8-8 30 0 38M24 5c8 8 8 30 0 38" stroke="#bfe0ff" stroke-width="2" fill="none"/>'),
        code: s('<rect x="5" y="7" width="38" height="34" rx="5" fill="#24292e"/><path d="M18 17l-7 7 7 7M30 17l7 7-7 7" stroke="#7dff7a" stroke-width="3" fill="none" stroke-linecap="round"/>'),
        paper: s('<rect x="8" y="6" width="32" height="36" rx="2" fill="#f5eedb"/><rect x="12" y="10" width="24" height="6" fill="#1b1510"/><path d="M12 21h11M12 26h11M12 31h11M12 36h24" stroke="#7a6a50" stroke-width="2"/><rect x="26" y="20" width="10" height="12" fill="#c43d3d"/>')
    };
    var now = new Date();
    var mon = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    window.ICONS.calendar = s('<rect x="3" y="3" width="42" height="42" rx="10" fill="#ffffff"/><rect x="3.5" y="3.5" width="41" height="41" rx="9.5" fill="none" stroke="rgba(0,0,0,.12)"/>' +
        '<path d="M3 13a10 10 0 0110-10h22a10 10 0 0110 10v1H3z" fill="#ff3b30"/>' +
        '<text x="24" y="12.2" text-anchor="middle" font-family="Inter Variable,Helvetica,Arial,sans-serif" font-size="7.5" font-weight="700" fill="#fff">' + mon + '</text>' +
        '<text x="24" y="37" text-anchor="middle" font-family="Inter Variable,Helvetica,Arial,sans-serif" font-size="21" font-weight="400" fill="#222">' + now.getDate() + '</text>');
    window.ICONS.wallpapers = s('<rect x="3" y="3" width="42" height="42" rx="10" fill="#1b1040"/>' +
        '<g transform="translate(24 43) scale(.72)"><path d="M0 0C9-8 9-24 2-38C-5-24-7-8 0 0z" fill="#3fbf6a"/><path d="M0 0C10-6 18-16 22-28C10-22 2-12 0 0z" fill="#a46bff"/><path d="M0 0C-10-6-18-16-22-28C-10-22-2-12 0 0z" fill="#8a5cff"/><path d="M0 0C12-2 22-8 28-16C16-14 6-8 0 0z" fill="#2f8a55"/><path d="M0 0C-12-2-22-8-28-16C-16-14-6-8 0 0z" fill="#5bd16a"/></g>' +
        '<rect x="3.5" y="3.5" width="41" height="41" rx="9.5" fill="none" stroke="rgba(255,255,255,.18)"/>');
    window.ICONS.explorer = window.ICONS.finder;
    window.ICONS.notepad = window.ICONS.notes;
})();
