/**
 * What the stereo can play. Radio stations come from The Corner Chronicle's
 * dial (NewsStand/radio_stations.json) plus a few SomaFM streams; playlists are
 * Spotify links (paste your own in the stereo to add more).
 */
export type Track = { title: string; url: string };
export type Station = { id: string; freq: number; call: string; name: string; source: string; tracks: Track[] };
export type Playlist = { name: string; uri: string };

export const stations: Station[] = [
    {
        id: 'artbell',
        freq: 90.3,
        call: 'KBEL',
        name: 'Coast to Coast AM with Art Bell',
        source: 'the Internet Archive',
        tracks: [
            {
                title: '1994-05-24 · Open Lines Angels Bizarre Stories',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1994-05-24-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-Open-Lines-Angels-Bizarre-Stories.mp3',
            },
            {
                title: '1995-07-17 · Open Lines Alien Autopsy Weather',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1995-07-17%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%20-%20Alien%20Autopsy%20-%20Weather.mp3',
            },
            {
                title: '1995-12-06 · Full Moon Open Lines',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1995-12-06%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Full%20Moon%20Open%20Lines.mp3',
            },
            {
                title: '1996-03-06 · Open Lines Sheep Cloning Assisted Suicide Truth or Trash',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1996-03-06-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-Open-Lines-Sheep-Cloning-Assisted-Suicide-Truth-or-Trash.mp3',
            },
            {
                title: '1996-05-08 · Hector Armstrong Chupacabra Open Lines',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1996-05-08%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Hector%20Armstrong%20-%20Chupacabra%20-%20Open%20Lines.mp3',
            },
            {
                title: '1996-05-30 · Open Lines Sea Monster Report, Demon Seed Fax, Ed Dames Earth Changes',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1996-05-30%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%20-%20Sea%20Monster%20Report%2C%20Demon%20Seed%20Fax%2C%20Ed%20Dames%20Earth%20Changes.mp3',
            },
            {
                title: '1996-06-17 · Open Lines, Live Remote Viewing Experiment',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1996-06-17%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%2C%20Live-Remote%20Viewing%20Experiment.mp3',
            },
            {
                title: '1996-07-05 · Open Lines Arts UFO Parts',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1996-07-05-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-Open-Lines-Arts%20UFO%20Parts.mp3',
            },
            {
                title: '1996-07-16 · Open Lines Vampire Line',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1996-07-16%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%20-%20Vampire%20Line.mp3',
            },
            {
                title: '1997-01-20 · Open Lines',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1997-01-20%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines.mp3',
            },
            {
                title: "1997-06-03 · Open Lines 'Witch Hunt'",
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1997-06-03%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%20%27Witch%20Hunt%27.mp3',
            },
            {
                title: '1997-08-12 · Open Lines Bigfoot Everglades Report',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1997-08-12%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%20-%20Bigfoot%20Everglades%20Report.mp3',
            },
            {
                title: '1997-09-11 · Open Lines with Area 51 Employees Call in',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1997-09-11%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%20with%20Area%2051%20Employees%20Call-in.mp3',
            },
            {
                title: '1998-06-02 · Open Lines Antichrist Hotline',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1998-06-02%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20%20Open%20Lines%20-%20Antichrist%20Hotline.mp3',
            },
            {
                title: '1999-01-07 · Dates from Hell Open Lines',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1999-01-07%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Dates%20from%20Hell%20-%20Open%20Lines.mp3',
            },
            {
                title: '1999-12-15 · Open Lines Y2k',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/1999-12-15%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20%20Open%20Lines%20-%20Y2k.mp3',
            },
            {
                title: '2001-05-18 · Open Lines. Linda Howe Atlantis in Cuba',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/2001-05-18%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20%20Open%20Lines.%20Linda%20Howe%20-%20Atlantis%20in%20Cuba.mp3',
            },
            {
                title: '2001-09-11 · The September 11, 2001 Show',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/2001-09-11%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20The%20September%2011%2C%202001%20Show.mp3',
            },
            {
                title: '2001-09-13 · Open Lines Callers Respond and React to 911, Day 3',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/2001-09-13%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%20-%20Callers%20Respond%20and%20React%20to%20911%2C%20Day%203.mp3',
            },
            {
                title: '2001-09-25 · Open Lines To War or Not',
                url: 'https://archive.org/download/coast-to-coast-am-w-art-bell-open-lines-collection/2001-09-25%20-%20Coast%20to%20Coast%20AM%20with%20Art%20Bell%20-%20Open%20Lines%20-%20To%20War%20or%20Not.mp3',
            },
        ],
    },
    {
        id: 'blues',
        freq: 91.1,
        call: 'WBLU',
        name: 'Old Blues',
        source: 'The Corner Chronicle',
        tracks: [
            {
                title: 'Old Blues (live)',
                url: 'https://listen.181fm.com/181-blues_128k.mp3',
            },
        ],
    },
    {
        id: 'rock',
        freq: 94.3,
        call: 'WROK',
        name: 'Classic Rock',
        source: 'The Corner Chronicle',
        tracks: [
            {
                title: 'Classic Rock (live)',
                url: 'https://0n-classicrock.radionetz.de/0n-classicrock.mp3',
            },
        ],
    },
    {
        id: 'rap',
        freq: 99.1,
        call: 'WRAP',
        name: "'90s & 2000s Rap",
        source: 'The Corner Chronicle',
        tracks: [
            {
                title: "'90s & 2000s Rap (live)",
                url: 'https://listen.181fm.com/181-oldschool_128k.mp3',
            },
        ],
    },
    {
        id: 'dnb',
        freq: 100.9,
        call: 'WDNB',
        name: 'Drum & Bass',
        source: 'The Corner Chronicle',
        tracks: [
            {
                title: 'Drum & Bass (live)',
                url: 'https://stream.technolovers.fm/drummnbass',
            },
        ],
    },
    {
        id: 'electro',
        freq: 105.7,
        call: 'WTRN',
        name: 'Electronic',
        source: 'The Corner Chronicle',
        tracks: [
            {
                title: 'Electronic (live)',
                url: 'https://ice2.somafm.com/beatblender-128-mp3',
            },
        ],
    },
    {
        id: 'phonk',
        freq: 106.5,
        call: 'WGMT',
        name: 'Garden MTV Radio',
        source: 'The Corner Chronicle',
        tracks: [
            {
                title: 'Garden MTV Radio (live)',
                url: 'https://s2.radio.co/s2b2b68744/listen',
            },
        ],
    },
    {
        id: 'soma-groovesalad',
        freq: 108.1,
        call: 'SOMA',
        name: 'Groove Salad · ambient downtempo',
        source: 'SomaFM',
        tracks: [
            {
                title: 'Groove Salad (live)',
                url: 'https://ice1.somafm.com/groovesalad-128-mp3',
            },
        ],
    },
    {
        id: 'soma-dronezone',
        freq: 108.5,
        call: 'SOMA',
        name: 'Drone Zone · atmospheric space',
        source: 'SomaFM',
        tracks: [
            {
                title: 'Drone Zone (live)',
                url: 'https://ice1.somafm.com/dronezone-128-mp3',
            },
        ],
    },
    {
        id: 'soma-lush',
        freq: 108.9,
        call: 'SOMA',
        name: 'Lush · sensuous vocals',
        source: 'SomaFM',
        tracks: [
            {
                title: 'Lush (live)',
                url: 'https://ice1.somafm.com/lush-128-mp3',
            },
        ],
    },
    {
        id: 'soma-defcon',
        freq: 109.3,
        call: 'SOMA',
        name: 'DEF CON Radio · music for hacking',
        source: 'SomaFM',
        tracks: [
            {
                title: 'DEF CON Radio (live)',
                url: 'https://ice1.somafm.com/defcon-128-mp3',
            },
        ],
    },
    {
        id: 'soma-secretagent',
        freq: 109.7,
        call: 'SOMA',
        name: 'Secret Agent · spy lounge',
        source: 'SomaFM',
        tracks: [
            {
                title: 'Secret Agent (live)',
                url: 'https://ice1.somafm.com/secretagent-128-mp3',
            },
        ],
    },
    {
        id: 'soma-spacestation',
        freq: 110.1,
        call: 'SOMA',
        name: 'Space Station Soma · spaced-out electronica',
        source: 'SomaFM',
        tracks: [
            {
                title: 'Space Station Soma (live)',
                url: 'https://ice1.somafm.com/spacestation-128-mp3',
            },
        ],
    },
    {
        id: 'soma-fluid',
        freq: 110.5,
        call: 'SOMA',
        name: 'Fluid · instrumental hip hop',
        source: 'SomaFM',
        tracks: [
            {
                title: 'Fluid (live)',
                url: 'https://ice1.somafm.com/fluid-128-mp3',
            },
        ],
    },
];

export const playlists: Playlist[] = [{ name: 'Lofi Beats', uri: 'spotify:playlist:37i9dQZF1DWWQRwui0ExPn' }];
