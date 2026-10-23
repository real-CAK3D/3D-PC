/**
 * Inner (unfolded) screen = hacker-themed launcher for CAK3D's real ESP32 /
 * Seeed XIAO projects. Everything here is DISPLAY + LINKS ONLY. Nothing runs a
 * real scan or network action; the "status" readouts are generated locally for
 * looks, and "launch" just opens the repo or a web UI.
 *
 * Fields come from the projects' real READMEs (see repos under github.com/real-CAK3D).
 *
 * Tool = {
 *   id, name, tag, hw (hardware), color, glyph,
 *   repo (url), launch (url, optional web UI), launchLabel,
 *   desc (what it is), features [..], status [{k,v}..],
 *   radar?: true   // WhatTheFlock gets a flock-radar visual
 * }
 */
(function (global) {
  var tools = [
    {
      id: 'whattheflock', name: 'WhatTheFlock', tag: 'flock radar', color: '#35e07a',
      glyph: 'radar',
      hw: 'Seeed XIAO ESP32-S3 Sense + piezo (GPIO3), LED (GPIO21), microSD, optional GPS',
      repo: 'https://github.com/real-CAK3D/WhatTheFlock',
      launch: 'https://github.com/real-CAK3D/WhatTheFlock', launchLabel: 'Open repo',
      desc: 'Phone app + firmware that spots Flock Safety ALPR cameras and other surveillance on the road. Built on the open-source Flock You detector by colonelpanichacks (MIT). The XIAO runs passive 2.4 GHz promiscuous-mode receive only — no AP, no transmit — hopping channels 11/6/1 and matching a firmware-derived OUI set.',
      features: [
        'Passive promiscuous Wi-Fi sniff (no transmit), channel-hop 250 ms dwell',
        '34-OUI union signature set (community + firmware-extracted prefixes)',
        'microSD CRC-validated logging, USB CDC JSON lines to a Flask dashboard',
        'Installable web app: live detections, maps, camera-aware routes, HUD',
        'Android wrapper (Capacitor): USB serial, background GPS, TTS alerts'
      ],
      status: [
        { k: 'mode', v: 'passive RX' }, { k: 'channels', v: '11 / 6 / 1' },
        { k: 'dwell', v: '250 ms' }, { k: 'OUIs', v: '34' }
      ],
      radar: true
    },
    {
      id: 'espwatch', name: 'ESP-Watch', tag: 'GTA minimap watch', color: '#7cf0ff',
      glyph: 'watch',
      hw: 'Waveshare ESP32-S3-Touch-AMOLED-2.06 (ESP32-S3R8, 410×502 AMOLED, AXP2101 PMU, QMI8658 IMU)',
      repo: 'https://github.com/real-CAK3D/ESP-Watch',
      launch: 'https://github.com/real-CAK3D/ESP-Watch/releases/latest', launchLabel: 'Releases (firmware + APK)',
      desc: 'GTA V-style minimap + turn-by-turn navigation for a Waveshare AMOLED watch, with a Kotlin/Compose + MapLibre Android companion. PlatformIO / Arduino 3.x / LVGL 9.3 / NimBLE. Heading-up radar from real OpenStreetMap data streamed over BLE, hill-shaded elevation, GPS route line, battery rings.',
      features: [
        'LVGL 9.3 minimap radar, heading-up, OSM roads/water/parks over BLE',
        'Turn cards with ETA, distance, gas cost; watch wakes before each turn',
        'Android companion: Map/Places/Watch/Settings, companion pairing',
        'OTA: phone updates watch firmware over Bluetooth (~1 min)',
        'Free data: OpenStreetMap/Overpass, OpenFreeMap, OSRM, Open-Meteo'
      ],
      status: [
        { k: 'lvgl', v: '9.3' }, { k: 'link', v: 'NimBLE' },
        { k: 'psram', v: '8 MB octal' }, { k: 'flash', v: '32 MB' }
      ]
    },
    {
      id: 'cydbuddy', name: 'CYD-Buddy', tag: 'desk buddy face', color: '#ffd23d',
      glyph: 'eyes',
      hw: 'CYD / ESP32-2432S028R (ESP32 Dev Module, ILI9341 TFT, SD card)',
      repo: 'https://github.com/real-CAK3D/CYD-Buddy',
      launch: 'https://github.com/real-CAK3D/CYD-Buddy', launchLabel: 'Open repo',
      desc: 'Firmware for a Cheap Yellow Display desk-buddy face: animated eyes, moods, touch reactions, corner menus, Wi-Fi setup, serial commands and an SD-card phrase bank, all on the CYD itself. It can dock to Spac3-Gh0st telemetry and sync time + Open-Meteo weather.',
      features: [
        'Touch personality: boop, pet, tickle, eye-poke, idle, sleepy, wake',
        'Mood system + life/lifecycle stats (health, hunger, boot/death counters)',
        'On-screen Wi-Fi setup, time/date/weather via Open-Meteo',
        'SD phrase bank (/cydbuddy/phrases.csv), serial bridge: say/event/stats',
        'Docks to Spac3-Gh0st over an Ollama/spac3 host URL'
      ],
      status: [
        { k: 'display', v: 'ILI9341' }, { k: 'mood', v: 'chill' },
        { k: 'health', v: '92.0' }, { k: 'sd', v: 'ready' }
      ]
    },
    {
      id: 'scanimal', name: 'Scanimal', tag: 'scan-to-raise pet', color: '#ff9b3d',
      glyph: 'paw',
      hw: 'Android phone (sensors: Wi-Fi, Bluetooth, cell, GPS, NFC, camera)',
      repo: 'https://github.com/real-CAK3D/Scanimal',
      launch: 'https://github.com/real-CAK3D/Scanimal/releases/latest', launchLabel: 'Releases (APK)',
      desc: 'A tamagotchi-style pocket buddy you raise by scanning the world: barcodes, QR, shipping labels, tickets and NFC. It sniffs Wi-Fi / Bluetooth / cell towers with a pulsing radar, stargazes GPS satellites and meets nearby Scanimals. Rule-based phrase brain, no AI service, no account, all on-device.',
      features: [
        'Feed by scanning codes (offline); Open Food Facts product lookup optional',
        'Radar for Wi-Fi/Bluetooth/cell with vibration, GPS satellite stargazing',
        '11 species, life sim vitals/traits, lives, 85 achievements',
        'Walks: GPS distance, sessions, step counter',
        'Meets other Scanimals nearby'
      ],
      status: [
        { k: 'species', v: 'Alien' }, { k: 'level', v: '12' },
        { k: 'radar', v: 'sweeping' }, { k: 'lives', v: '3 / 5' }
      ]
    },
    {
      id: 'mappi3', name: 'MapPI3', tag: 'trail companion', color: '#4aa8ff',
      glyph: 'map',
      hw: 'Phone-first web app; future Raspberry Pi Zero 2 WH field kit',
      repo: 'https://github.com/real-CAK3D/MapPI3',
      launch: 'https://map-pi-zeta.vercel.app', launchLabel: 'Open web app',
      desc: 'Mobile-first trail companion for planning, launching and navigating hikes around Maine / Lewiston-Auburn / Grafton Notch / Route 26. Leaflet + OpenStreetMap views, OSM/Overpass geometry for priority Grafton routes, local accounts and offline route packs. Not a replacement for paper maps or emergency services.',
      features: [
        'Area → mountain/cluster → trail drill-down search, near-me ranking',
        'OSM/Overpass geometry (Speck Pond, Table Rock, Old Speck/Eyebrow, AT)',
        'Launch checklist: sunrise/sunset, turn-around, water/calorie/battery',
        'Local accounts (CAK3D, tiny-Z, Guest), completion log',
        'Supabase-ready (browser-safe keys only)'
      ],
      status: [
        { k: 'ver', v: 'V1.2.29' }, { k: 'region', v: 'Maine' },
        { k: 'routes', v: 'OSM' }, { k: 'gps', v: 'HTTPS req' }
      ]
    },
    {
      id: 'spac3ghost', name: 'Spac3-Gh0st', tag: 'Pi cyberdeck', color: '#b96bff',
      glyph: 'ghost',
      hw: 'Raspberry Pi 5 (CrowPi GPS/sensors); also runs on Windows/macOS/Linux',
      repo: 'https://github.com/real-CAK3D/Hack-Safe-v2',
      launch: 'http://hack-safe.tailac984b.ts.net:8765/', launchLabel: 'Open dashboard (Tailscale)',
      desc: 'A windowed Raspberry Pi 5 hacker-companion inspired by Pwnagotchi’s face, voice and plugin/event model. For CAK3D-owned home/lab networks only: passive Wi-Fi/Bluetooth/LAN awareness, Pi service checks, CrowPi sensor display and an owned-lab passive capture lifecycle. No deauth automation, evil-twin, credential upload or cracking. GPLv3 (adapts Pwnagotchi face/voice concepts).',
      features: [
        'Glass UI, 10 themes, live vitals sparklines, command palette (Ctrl/Cmd+K)',
        'Native plugins: memtemp, sensor_reactor, session_stats, logtail, watchdog',
        'Cross-platform metrics; /api/health liveness endpoint',
        'God’s Eye View globe (optional Google Maps / Cesium ion keys)',
        'Binds to loopback or Tailscale only — never a public address'
      ],
      status: [
        { k: 'ver', v: '2.10.0' }, { k: 'face', v: '(◕‿◕)' },
        { k: 'health', v: '/api/health' }, { k: 'bind', v: 'tailnet' }
      ]
    },
    {
      id: 'marauder', name: 'ESP32 Marauder', tag: 'firmware console', color: '#ff4d6d',
      glyph: 'chip',
      hw: 'ESP32 / ESP32-S3 boards (CYD 2432S028, multiboard S3, T-Embed CC1101) — flashed v1.14–1.17 bins on disk',
      repo: 'https://github.com/justcallmekoko/ESP32Marauder',
      launch: 'https://github.com/justcallmekoko/ESP32Marauder', launchLabel: 'Open firmware repo',
      desc: 'ESP32 Marauder is justcallmekoko’s open-source Wi-Fi/Bluetooth research firmware. CAK3D runs it on several boards (CYD, multiboard S3, LilyGo T-Embed CC1101) and keeps the official builds on disk. This tile is a display-only shortcut to the upstream project — it does not run any firmware or network action here.',
      features: [
        'Upstream open-source firmware by justcallmekoko (link only here)',
        'Flashed builds on disk: v1.14, v1.16, v1.17 (CYD / multiboard S3 / T-Embed)',
        'MarauderMobile companion APK kept alongside',
        'This console is a link + status mock — no live device control',
        'For CAK3D’s own lab hardware and security education'
      ],
      status: [
        { k: 'build', v: 'v1.17.0' }, { k: 'board', v: 'multi-S3' },
        { k: 'link', v: 'display only' }, { k: 'device', v: 'not attached' }
      ]
    },
    {
      id: 'biscuit', name: 'Biscuit', tag: 'e-paper cyberdeck', color: '#e0a33d',
      glyph: 'cookie',
      hw: 'Xteink X4 — ESP32-C3 (RISC-V 160MHz), 16MB flash, 4.26" 800×480 e-ink, 7 buttons, Wi-Fi 2.4GHz, BLE 5.0, microSD',
      repo: 'https://github.com/yattsu/biscuit',
      launch: 'https://github.com/yattsu/biscuit', launchLabel: 'Open firmware repo',
      desc: 'Biscuit is open-source firmware by yattsu (MIT), forked from CrossPoint Reader, that turns the ~$70 Xteink X4 e-ink reader into a tile-dashboard “smart device”: full e-reader plus passive Wi-Fi/BLE scanning, ESP-NOW mesh chat, crypto/network utilities and games — all with the battery life of e-ink. CAK3D runs it on an ESP32-C3 X4. This tile is a display-only shortcut to the upstream project.',
      features: [
        'Tile dashboard: Recon, Comms, Tools, Games, Reader, Settings',
        'Passive Wi-Fi / BLE scanning and wardriving (listen-only)',
        'ESP-NOW Mesh Chat — no Wi-Fi needed, ~200 m, multi-hop relay',
        'E-reader (ebooks, OPDS, reading stats) on a sunlight-readable 4.26" panel',
        '7 physical buttons, microSD storage, USB-C serial + power'
      ],
      status: [
        { k: 'soc', v: 'ESP32-C3' }, { k: 'flash', v: '16 MB' },
        { k: 'display', v: 'e-ink 1-bit' }, { k: 'link', v: 'display only' }
      ]
    },
    {
      id: 'meshtastic', name: 'Meshtastic', tag: 'LoRa mesh', color: '#2f9e5e',
      glyph: 'mesh', mesh: true,
      hw: 'LoRa mesh nodes — CAK3D runs it on a Seeed XIAO ESP32-S3 (fw 2.7.26, region US) and a DIY V1 build; typical nodes: LILYGO T-Beam, T-LoRa V2.1, Heltec',
      repo: 'https://github.com/meshtastic/firmware',
      launch: 'https://client.meshtastic.org', launchLabel: 'Open web client',
      desc: 'Meshtastic is open-source, off-grid LoRa mesh messaging (meshtastic.org). Low-power radios form a self-healing, multi-hop mesh for encrypted text, position and telemetry with no phone network or internet. Phones connect to a node over Bluetooth, USB or Wi-Fi. CAK3D flashed it on a Seeed XIAO ESP32-S3 (target seeed-xiao-s3, region US).',
      features: [
        'Encrypted text + position over LoRa, fully off-grid',
        'Self-healing multi-hop mesh, long range at very low power',
        'Phone app connects over BLE / USB / Wi-Fi; optional MQTT gateway',
        'Runs on many boards (T-Beam, T-LoRa, Heltec, XIAO S3, DIY V1)',
        'Web client flashes and manages nodes from the browser'
      ],
      status: [
        { k: 'region', v: 'US' }, { k: 'fw', v: '2.7.26' },
        { k: 'channel', v: 'LongFast' }, { k: 'nodes', v: '5 online' }
      ]
    }
  ];

  global.CAK3D_TOOLS = tools;
})(window);
