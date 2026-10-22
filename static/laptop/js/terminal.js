/* CAK3D OS X Terminal: a small zsh-ish shell over a pretend file system built from CAK3D's projects */
(function () {
    'use strict';
    var C = window.CAK3D, D = window.CAK3D_DATA;
    var h = C.h;
    var HOME = '/Users/cak3d';

    function slug(s) { return String(s).replace(/[\/\\:*?"<>|]+/g, '-').replace(/\s+/g, '_'); }
    /** the file system is rebuilt on demand so Notes changes show up */
    function fs() {
        var dir = function (children) { return { type: 'dir', children: children }; };
        var file = function (text, extra) { return Object.assign({ type: 'file', text: text }, extra || {}); };
        var apps = {}, sites = {}, papers = {}, pics = {}, docs = {};
        D.featured.concat(D.apps).forEach(function (p) {
            apps[slug(p.name) + (p.url ? '.webloc' : '.repo')] = file([p.name, p.description, p.language ? 'Language: ' + p.language : '', p.url ? 'URL: ' + p.url : '', p.repo ? 'Repo: ' + p.repo : ''].filter(Boolean).join('\n'), { url: p.url || p.repo });
        });
        D.sites.forEach(function (s) { sites[slug(s.name) + '.webloc'] = file([s.name, s.note || '', 'URL: ' + s.url, s.repo ? 'Repo: ' + s.repo : ''].filter(Boolean).join('\n'), { url: s.url }); });
        D.papers.forEach(function (p) { papers[p.id + '.txt'] = file([p.name, p.motto, 'Published: ' + p.when, 'By: ' + p.by, p.repo ? 'Repo: ' + p.repo : ''].filter(Boolean).join('\n'), { url: p.repo || D.NEWSSTAND_URL }); });
        D.pictures.forEach(function (p) { pics[slug(p.name)] = file(null, { picture: p }); });
        C.notes.list().forEach(function (n) { docs[slug(C.notes.title(n)) + '.txt'] = file(n.text, { note: n }); });
        return dir({
            Users: dir({ cak3d: dir({ Apps: dir(apps), Sites: dir(sites), Papers: dir(papers), Pictures: dir(pics), Documents: dir(docs), 'readme.txt': file('Type `help` to see what this shell can do.\nTry: ls Apps, cat Papers/dab.txt, open cak3d-truck.vercel.app, neofetch') }) }),
            Applications: dir(Object.keys(C.apps).filter(function (k) { return !C.apps[k].hidden; }).reduce(function (o, k) { o[slug(C.apps[k].name) + '.app'] = file(null, { app: k }); return o; }, {})),
            System: dir({ 'version.txt': file('CAK3D OS X 14.20 (Sonoma Haze)') })
        });
    }
    function resolve(cwd, p) {
        if (!p || p === '~') return HOME;
        if (p.indexOf('~/') === 0) p = HOME + p.slice(1);
        var parts = (p.charAt(0) === '/' ? p : cwd + '/' + p).split('/');
        var out = [];
        parts.forEach(function (s) { if (!s || s === '.') return; if (s === '..') out.pop(); else out.push(s); });
        return '/' + out.join('/');
    }
    function lookup(root, path) {
        var node = root;
        var parts = path.split('/').filter(Boolean);
        for (var i = 0; i < parts.length; i++) {
            if (!node || node.type !== 'dir') return null;
            var kids = node.children, name = parts[i];
            if (kids[name]) { node = kids[name]; continue; }
            // case-insensitive match, like macOS
            var k = Object.keys(kids).filter(function (x) { return x.toLowerCase() === name.toLowerCase(); })[0];
            node = k ? kids[k] : null;
        }
        return node;
    }
    function pretty(path) { return path === HOME ? '~' : path.indexOf(HOME + '/') === 0 ? '~' + path.slice(HOME.length) : path; }

    var FORTUNES = [
        'Plant an idea, grow a project.', 'All the news that’s fit to roll.', 'It works on my machine. Ship the machine.',
        'There is no cloud, just someone else’s Raspberry Pi.', 'Comes back every year, deeper rooted.', 'Clip it · Try it · Keep it.',
        'Measure twice, torque once.', 'Commit early, commit often, commit with snacks nearby.'
    ];
    var THEMES = { classic: ['#1e1e1e', '#e6e6e6'], green: ['#07130a', '#7dff7a'], purple: ['#160c26', '#d6b8ff'], amber: ['#140d00', '#ffb000'], paper: ['#f6f3ea', '#222222'] };

    C.register('terminal', {
        name: 'Terminal', icon: 'cmd', keywords: 'command prompt cmd shell console zsh bash', w: 720, h: 440,
        open: function (win) {
            var cwd = HOME, hist = C.store.get('termHistory', []), hpos = hist.length;
            var out = h('div', { class: 'cmd', role: 'log', 'aria-live': 'polite', 'aria-label': 'Terminal output' });
            var promptEl = h('span');
            var input = h('input', { type: 'text', 'aria-label': 'Command', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'send' });
            var line = h('div', { class: 'line' }, promptEl, input);
            out.appendChild(line);
            win.body.appendChild(out);
            var setTheme = function (name) { var t = THEMES[name] || THEMES.classic; out.style.background = t[0]; out.style.color = t[1]; };
            setTheme(C.store.get('termTheme', 'classic'));
            var prompt = function () { return 'cak3d@Garden-Air ' + (pretty(cwd) === '~' ? '~' : pretty(cwd).split('/').pop()) + ' % '; };
            var print = function (text, color) {
                var d = h('div', { text: text == null ? '' : String(text) });
                if (color) d.style.color = color;
                out.insertBefore(d, line);
                return d;
            };
            var scroll = function () { out.scrollTop = out.scrollHeight; };
            var refresh = function () { promptEl.textContent = prompt(); scroll(); };
            out.addEventListener('click', function () { if (!String(window.getSelection())) input.focus(); });

            var cmds = {
                help: function () {
                    print([
                        'CAK3D OS X zsh — available commands:',
                        '  ls [-l] [dir]       list files            cd [dir]        change directory',
                        '  pwd                 print directory       cat <file>      show a file',
                        '  open <url|file|app> open in Safari/app    echo <text>     print text',
                        '  clear               clear the screen      history         past commands',
                        '  ping <host>         time a request        whoami · date · uname [-a] · sw_vers',
                        '  neofetch            system info           theme <classic|green|purple|amber|paper>',
                        '  fortune · cowsay <text> · say <text> · weed · matrix · sudo · exit'
                    ].join('\n'));
                },
                ls: function (args) {
                    var long = args[0] === '-l' || args[0] === '-la' || args[0] === '-al';
                    if (long) args = args.slice(1);
                    var root = fs();
                    var path = resolve(cwd, args[0] || '.');
                    var node = lookup(root, path);
                    if (!node) return print('ls: ' + (args[0] || path) + ': No such file or directory');
                    if (node.type === 'file') return print(args[0]);
                    var names = Object.keys(node.children);
                    if (!names.length) return;
                    if (long) {
                        names.forEach(function (n) {
                            var k = node.children[n];
                            print((k.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--') + '  cak3d  garden  ' + String(k.text ? k.text.length : k.type === 'dir' ? Object.keys(k.children).length : 4096).padStart(6) + '  ' + n + (k.type === 'dir' ? '/' : ''));
                        });
                    } else print(names.map(function (n) { return n + (node.children[n].type === 'dir' ? '/' : ''); }).join('   '));
                },
                dir: function (args) { cmds.ls(args); },
                cd: function (args) {
                    var path = resolve(cwd, args[0] || '~');
                    var node = lookup(fs(), path);
                    if (!node) return print('cd: no such file or directory: ' + args[0]);
                    if (node.type !== 'dir') return print('cd: not a directory: ' + args[0]);
                    cwd = path;
                },
                pwd: function () { print(cwd); },
                cat: function (args) {
                    if (!args.length) return print('usage: cat <file>');
                    args.forEach(function (a) {
                        var node = lookup(fs(), resolve(cwd, a));
                        if (!node) print('cat: ' + a + ': No such file or directory');
                        else if (node.type === 'dir') print('cat: ' + a + ': Is a directory');
                        else if (node.text == null) print('cat: ' + a + ': binary file (try: open ' + a + ')');
                        else print(node.text);
                    });
                },
                type: function (args) { cmds.cat(args); },
                echo: function (args) { print(args.join(' ')); },
                clear: function () { out.querySelectorAll('div:not(.line)').forEach(function (d) { d.remove(); }); },
                cls: function () { cmds.clear(); },
                history: function () { hist.forEach(function (c, i) { print(String(i + 1).padStart(4) + '  ' + c); }); },
                whoami: function () { print('cak3d'); },
                date: function () { print(new Date().toString()); },
                uname: function (args) { print(args[0] === '-a' ? 'CAK3D-OS-X Garden-Air 14.20.0 CAK3D OS X Kernel Version 14.20.0: Sonoma Haze; root:xnu-420 G4.20 garden64' : 'CAK3D-OS-X'); },
                sw_vers: function () { print('ProductName:\t\tCAK3D OS X\nProductVersion:\t\t14.20\nBuildVersion:\t\t420G69'); },
                ver: function () { cmds.sw_vers(); },
                neofetch: function () {
                    var art = ['       .:.        ', '      .:::.       ', '  .   :::::   .   ', '  ::. ::::: .::   ', '   ::::::::::::   ', '    ´:::::::´     ', '  .::´´ | ``::.   ', '        |         '];
                    var info = [
                        'cak3d@Garden-Air', '----------------', 'OS: CAK3D OS X 14.20 Sonoma Haze', 'Host: Garden Air (laptop in the room)',
                        'Kernel: CAK3D 14.20.0', 'Shell: zsh 5.9 (pretend)', 'Resolution: ' + window.innerWidth + 'x' + window.innerHeight,
                        'CPU: Garden Silicon G4.20 (' + (navigator.hardwareConcurrency || 8) + ' cores)', 'Memory: ' + (navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '8 GB'),
                        'Uptime: ' + Math.round(performance.now() / 60000) + ' mins'
                    ];
                    var rows = Math.max(art.length, info.length);
                    var txt = [];
                    for (var i = 0; i < rows; i++) txt.push((art[i] || '                  ') + '  ' + (info[i] || ''));
                    print(txt.join('\n'), '#a98bff');
                },
                systeminfo: function () { cmds.neofetch(); },
                open: function (args) {
                    if (!args.length) return print('usage: open <url | file | -a App>');
                    if (args[0] === '-a') {
                        var name = args.slice(1).join(' ').toLowerCase().replace(/\.app$/, '');
                        var id = Object.keys(C.apps).filter(function (k) { return C.apps[k].name.toLowerCase() === name || k === name; })[0];
                        if (!id) return print('Unable to find application named \'' + args.slice(1).join(' ') + '\'');
                        C.open(id);
                        return;
                    }
                    var target = args.join(' ');
                    var node = lookup(fs(), resolve(cwd, target));
                    if (node && node.type === 'dir') {
                        var rel = resolve(cwd, target).replace(HOME + '/', '').toLowerCase();
                        C.open('finder', { folder: ['apps', 'sites', 'papers', 'pictures', 'documents'].indexOf(rel) >= 0 ? rel : 'home' });
                    } else if (node && node.app) C.open(node.app);
                    else if (node && node.picture) C.open('photos', { src: node.picture.src });
                    else if (node && node.note) C.open('notes', { file: C.notes.title(node.note) });
                    else if (node && node.url) C.openUrl(node.url);
                    else if (C.looksLikeUrl(target)) C.openUrl(target);
                    else return print('The file ' + resolve(cwd, target) + ' does not exist.');
                },
                start: function (args) { cmds.open(args); },
                ping: function (args) {
                    if (!args[0]) return Promise.resolve(print('usage: ping <host>'));
                    var host = args[0].replace(/^https?:\/\//, '').split('/')[0];
                    print('PING ' + host + ': 56 data bytes');
                    var n = 0, times = [];
                    var once = function () {
                        var t0 = performance.now();
                        var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
                        var to = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
                        return fetch('https://' + host + '/favicon.ico?ping=' + Date.now(), { mode: 'no-cors', cache: 'no-store', signal: ctl ? ctl.signal : undefined })
                            .then(function () {
                                clearTimeout(to);
                                var ms = performance.now() - t0;
                                times.push(ms);
                                print('64 bytes from ' + host + ': icmp_seq=' + n + ' ttl=56 time=' + ms.toFixed(1) + ' ms');
                            }).catch(function () { clearTimeout(to); print('Request timeout for icmp_seq ' + n); })
                            .then(function () { scroll(); n++; if (n < 4) return new Promise(function (r) { setTimeout(r, 400); }).then(once); });
                    };
                    return once().then(function () {
                        print('--- ' + host + ' ping statistics ---');
                        print('4 packets transmitted, ' + times.length + ' packets received, ' + (100 - times.length * 25) + '.0% packet loss');
                        if (times.length) print('round-trip min/avg/max = ' + Math.min.apply(null, times).toFixed(1) + '/' + (times.reduce(function (a, b) { return a + b; }, 0) / times.length).toFixed(1) + '/' + Math.max.apply(null, times).toFixed(1) + ' ms');
                    });
                },
                theme: function (args) {
                    if (!THEMES[args[0]]) return print('usage: theme <' + Object.keys(THEMES).join('|') + '>');
                    setTheme(args[0]);
                    C.store.set('termTheme', args[0]);
                },
                color: function (args) { cmds.theme([{ '0a': 'green', '05': 'purple', '06': 'amber', f0: 'paper', '07': 'classic' }[String(args[0]).toLowerCase()] || args[0]]); },
                fortune: function () { print(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]); },
                cowsay: function (args) {
                    var t = args.join(' ') || 'Moo. Stay hydrated.';
                    print(' ' + '_'.repeat(t.length + 2) + '\n< ' + t + ' >\n ' + '-'.repeat(t.length + 2) + '\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||');
                },
                say: function (args) {
                    var t = args.join(' ');
                    if (!t) return print('usage: say <text>');
                    try { speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(t)); } catch (e) { print('say: speech is not available here'); }
                },
                weed: function () { print('       🌿\n   Packing a bowl…\n   Done. Time to `open cak3d-truck.vercel.app` and cruise.', '#7dff7a'); },
                '420': function () { cmds.weed(); },
                matrix: function () {
                    var chars = 'ｱｲｳｴｵｶｷｸｹｺ01CAK3D';
                    var k = 0;
                    return new Promise(function (done) {
                        var iv = setInterval(function () {
                            var s = '';
                            for (var i = 0; i < 60; i++) s += Math.random() < 0.5 ? chars[(Math.random() * chars.length) | 0] : ' ';
                            print(s, '#35e07a'); scroll();
                            if (++k > 18) { clearInterval(iv); print('Wake up, CAK3D…', '#35e07a'); done(); }
                        }, 70);
                        win.onClose(function () { clearInterval(iv); });
                    });
                },
                sudo: function () { print('cak3d is not in the sudoers file. This incident will be reported to the Garden.'); },
                exit: function () { win.close(); },
                man: function (args) { print(args[0] ? 'No manual entry for ' + args[0] + '. Try `help`.' : 'What manual page do you want?'); }
            };
            var names = Object.keys(cmds);

            function run(raw) {
                print(prompt() + raw);
                var text = raw.trim();
                if (!text) return Promise.resolve();
                if (hist[hist.length - 1] !== text) { hist.push(text); if (hist.length > 100) hist.shift(); C.store.set('termHistory', hist); }
                hpos = hist.length;
                var parts = text.match(/"[^"]*"|'[^']*'|\S+/g).map(function (p) { return p.replace(/^["']|["']$/g, ''); });
                var name = parts[0].toLowerCase();
                var fn = cmds[name];
                if (!fn) { print('zsh: command not found: ' + parts[0]); return Promise.resolve(); }
                try { return Promise.resolve(fn(parts.slice(1))); } catch (e) { print(name + ': ' + e.message); return Promise.resolve(); }
            }
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    var v = input.value;
                    input.value = '';
                    input.disabled = true;
                    run(v).then(function () {
                        input.disabled = false;
                        refresh();
                        if (!win.closing) input.focus();
                    });
                } else if (e.key === 'ArrowUp') { e.preventDefault(); if (hpos > 0) { hpos--; input.value = hist[hpos]; } }
                else if (e.key === 'ArrowDown') { e.preventDefault(); if (hpos < hist.length - 1) { hpos++; input.value = hist[hpos]; } else { hpos = hist.length; input.value = ''; } }
                else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); cmds.clear(); }
                else if (e.key === 'c' && e.ctrlKey && !input.selectionEnd) { print(prompt() + input.value + '^C'); input.value = ''; scroll(); }
                else if (e.key === 'Tab') {
                    e.preventDefault();
                    var v = input.value, sp = v.lastIndexOf(' ');
                    var word = v.slice(sp + 1);
                    var cands;
                    if (sp < 0) cands = names.filter(function (n) { return n.indexOf(word) === 0; });
                    else {
                        var slash = word.lastIndexOf('/');
                        var base = slash >= 0 ? word.slice(0, slash + 1) : '';
                        var node = lookup(fs(), resolve(cwd, base || '.'));
                        var stem = word.slice(slash + 1).toLowerCase();
                        cands = node && node.type === 'dir' ? Object.keys(node.children).filter(function (n) { return n.toLowerCase().indexOf(stem) === 0; }).map(function (n) { return base + n + (node.children[n].type === 'dir' ? '/' : ''); }) : [];
                    }
                    if (cands.length === 1) input.value = v.slice(0, sp + 1) + cands[0] + (sp < 0 ? ' ' : '');
                    else if (cands.length > 1) { print(prompt() + v); print(cands.join('   ')); refresh(); }
                }
            });
            print('Last login: ' + new Date().toLocaleString() + ' on ttys000');
            print('Welcome to CAK3D OS X. Type `help` to get started.');
            refresh();
            setTimeout(function () { input.focus(); }, 40);
            win.data.run = function (c) { input.value = c; input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); };
        }
    });
})();
