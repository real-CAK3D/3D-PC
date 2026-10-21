import React, { useEffect, useState } from 'react';
import eventBus from '../EventBus';
import { playlists as defaultPlaylists, stations, Playlist, Station } from '../../World/Stoner/radio';

// One audio element for the whole page, so music keeps going with the panel closed
const audio = new Audio();
audio.preload = 'none';

const broadcast = (playing: boolean, title: string) => eventBus.dispatch('stereoState', { playing, title });

const toUri = (input: string) => {
    const s = input.trim();
    if (s.startsWith('spotify:')) return s;
    const m = s.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/);
    return m ? `spotify:${m[1]}:${m[2]}` : null;
};
const embedUrl = (uri: string) => {
    const [, kind, id] = uri.split(':');
    return `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`;
};

/** The stereo's face: pick a station or playlist, then a song */
const StereoPanel: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<'radio' | 'spotify'>('radio');
    const [station, setStation] = useState<Station>(stations[0]);
    const [track, setTrack] = useState(-1);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.7);
    const [lists, setLists] = useState<Playlist[]>(() => {
        try {
            return [...defaultPlaylists, ...JSON.parse(localStorage.getItem('cak3d-playlists') || '[]')];
        } catch (e) {
            return defaultPlaylists;
        }
    });
    const [playlist, setPlaylist] = useState<Playlist>(lists[0]);
    const [link, setLink] = useState('');

    useEffect(() => {
        eventBus.on('openStereo', () => setOpen(true));
        const onEnd = () => setTrack((t) => t + 1);
        audio.addEventListener('ended', onEnd);
        return () => audio.removeEventListener('ended', onEnd);
    }, []);

    // when a playlist station runs off the end of a song, move to the next one
    useEffect(() => {
        if (track < 0) return;
        const t = station.tracks[track % station.tracks.length];
        audio.src = t.url;
        audio.volume = volume;
        audio
            .play()
            .then(() => {
                setPlaying(true);
                broadcast(true, `${station.call} ${station.freq} · ${t.title}`);
            })
            .catch(() => setPlaying(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [track, station]);

    useEffect(() => {
        audio.volume = volume;
    }, [volume]);

    const tune = (s: Station) => {
        setStation(s);
        setTrack(0);
    };
    const toggle = () => {
        if (playing) {
            audio.pause();
            setPlaying(false);
            broadcast(false, '');
        } else if (track < 0) {
            setTrack(0);
        } else {
            audio.play().then(() => {
                setPlaying(true);
                broadcast(true, `${station.call} ${station.freq}`);
            });
        }
    };
    const pickPlaylist = (p: Playlist) => {
        // Spotify plays inside its own player, so the radio steps aside
        audio.pause();
        setPlaying(false);
        setPlaylist(p);
        broadcast(true, `Spotify · ${p.name}`);
    };
    const addPlaylist = () => {
        const uri = toUri(link);
        if (!uri) return;
        const p = { name: `My ${uri.split(':')[1]} ${lists.length}`, uri };
        const next = [...lists, p];
        setLists(next);
        setLink('');
        pickPlaylist(p);
        try {
            localStorage.setItem('cak3d-playlists', JSON.stringify(next.slice(defaultPlaylists.length)));
        } catch (e) {}
    };
    const close = () => {
        setOpen(false);
        eventBus.dispatch('stereoClosed', {});
    };

    if (!open) return null;
    return (
        <div id="prevent-click" style={styles.panel}>
            <div style={styles.header}>
                <b>CAK3D FM</b>
                <div style={styles.tabs}>
                    {(['radio', 'spotify'] as const).map((t) => (
                        <span key={t} style={Object.assign({}, styles.tab, tab === t && styles.tabOn)} onMouseDown={() => setTab(t)}>
                            {t.toUpperCase()}
                        </span>
                    ))}
                </div>
                <span style={styles.close} onMouseDown={close}>
                    x
                </span>
            </div>
            {tab === 'radio' ? (
                <div style={styles.body}>
                    <div style={styles.list}>
                        {stations.map((s) => (
                            <div key={s.id} style={Object.assign({}, styles.item, s.id === station.id && styles.itemOn)} onMouseDown={() => tune(s)}>
                                <b>{s.freq.toFixed(1)}</b> {s.call} <small>{s.name}</small>
                            </div>
                        ))}
                    </div>
                    <div style={styles.list}>
                        <small style={styles.source}>{station.source}</small>
                        {station.tracks.map((t, i) => (
                            <div key={t.url} style={Object.assign({}, styles.item, i === track % station.tracks.length && playing && styles.itemOn)} onMouseDown={() => setTrack(i)}>
                                {i + 1}. {t.title}
                            </div>
                        ))}
                    </div>
                    <div style={styles.controls}>
                        <span style={styles.btn} onMouseDown={() => setTrack((t) => Math.max(0, t - 1))}>
                            ⏮
                        </span>
                        <span style={styles.btn} onMouseDown={toggle}>
                            {playing ? '⏸' : '▶'}
                        </span>
                        <span style={styles.btn} onMouseDown={() => setTrack((t) => t + 1)}>
                            ⏭
                        </span>
                        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={(e) => setVolume(+e.target.value)} />
                    </div>
                </div>
            ) : (
                <div style={styles.body}>
                    <div style={styles.list}>
                        {lists.map((p) => (
                            <div key={p.uri} style={Object.assign({}, styles.item, p.uri === playlist.uri && styles.itemOn)} onMouseDown={() => pickPlaylist(p)}>
                                {p.name}
                            </div>
                        ))}
                        <div style={styles.add}>
                            <input style={styles.input} placeholder="paste a Spotify link" value={link} onChange={(e) => setLink(e.target.value)} />
                            <span style={styles.btn} onMouseDown={addPlaylist}>
                                +
                            </span>
                        </div>
                    </div>
                    <iframe
                        title="spotify"
                        src={embedUrl(playlist.uri)}
                        style={styles.spotify}
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    />
                </div>
            )}
        </div>
    );
};

const styles: StyleSheetCSS = {
    panel: {
        position: 'fixed',
        right: 24,
        top: 24,
        bottom: 24,
        width: 440,
        background: 'rgba(8, 4, 16, 0.92)',
        border: '4px solid #fff',
        color: '#e8dcff',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        zIndex: 100,
        fontSize: 14,
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        background: '#7a3fd1',
        color: '#fff',
    },
    tabs: { display: 'flex', gap: 6 },
    tab: { padding: '2px 8px', cursor: 'pointer', border: '2px solid transparent' },
    tabOn: { border: '2px solid #fff' },
    close: { cursor: 'pointer', border: '2px solid #fff', padding: '0 6px' },
    body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 8, gap: 8 },
    list: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 },
    item: { padding: '4px 6px', cursor: 'pointer', borderLeft: '3px solid transparent' },
    itemOn: { borderLeft: '3px solid #5bff8a', background: 'rgba(122,63,209,0.35)', color: '#fff' },
    source: { opacity: 0.6, padding: '2px 6px' },
    controls: { display: 'flex', alignItems: 'center', gap: 12, padding: 6 },
    btn: { cursor: 'pointer', fontSize: 20, padding: '0 6px', border: '2px solid #e8dcff' },
    add: { display: 'flex', gap: 6, padding: 6 },
    input: { flex: 1, padding: 4 },
    spotify: { flex: 2, border: 0, borderRadius: 12, minHeight: 380 },
};

export default StereoPanel;
