import React, { useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import eventBus from '../EventBus';
import { phoneApps, PhoneApp } from '../../World/Stoner/phoneApps';

/** Scan-to-install code, drawn as an SVG */
const QR: React.FC<{ text: string; size?: number }> = ({ text, size = 150 }) => {
    const svg = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(text);
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    }, [text]);
    return <div style={Object.assign({}, styles.qr, { width: size, height: size })} dangerouslySetInnerHTML={{ __html: svg }} />;
};

/** The Android phone from the couch arm, held up in front of you */
const PhoneScreen: React.FC = () => {
    const [open, setOpen] = useState(false);
    const [app, setApp] = useState<PhoneApp | null>(null);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        eventBus.on('openPhone', () => {
            setOpen(true);
            setApp(null);
        });
        const id = setInterval(() => setTime(new Date()), 10000);
        return () => clearInterval(id);
    }, []);

    if (!open) return null;
    const close = () => {
        setOpen(false);
        eventBus.dispatch('phoneClosed', {});
    };
    // framed sites can't run inside the phone: GitHub pages and the private tailnet ones
    const framable = app && app.kind === 'web' && app.url.indexOf('.ts.net') < 0;

    return (
        <div id="prevent-click" style={styles.backdrop} onMouseDown={close}>
            <div style={styles.phone} onMouseDown={(e) => e.stopPropagation()}>
                <div style={styles.status}>
                    <span>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    <span>▲ ◆ ▮▮▮ 84%</span>
                </div>
                {!app ? (
                    <div style={styles.home}>
                        <div style={styles.clock}>{time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                        <div style={styles.date}>{time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                        <div style={styles.section}>ANDROID APPS</div>
                        <div style={styles.grid}>
                            {phoneApps
                                .filter((a) => a.kind === 'android')
                                .map((a) => (
                                    <Tile key={a.name} app={a} onOpen={setApp} />
                                ))}
                        </div>
                        <div style={styles.section}>WEB APPS</div>
                        <div style={styles.grid}>
                            {phoneApps
                                .filter((a) => a.kind === 'web')
                                .map((a) => (
                                    <Tile key={a.name} app={a} onOpen={setApp} />
                                ))}
                        </div>
                    </div>
                ) : framable ? (
                    <iframe title={app.name} src={app.url} style={styles.frame} />
                ) : (
                    <div style={styles.detail}>
                        <div style={Object.assign({}, styles.bigIcon, { background: app.color })}>{app.icon}</div>
                        <h2 style={{ margin: '8px 0' }}>{app.name}</h2>
                        <p style={styles.dim}>{app.kind === 'android' ? 'Android app · APK on GitHub Releases' : app.note || 'Web app'}</p>
                        <a style={styles.button} href={app.url} target="_blank" rel="noreferrer">
                            {app.kind === 'android' ? 'Download APK' : 'Open'}
                        </a>
                        {app.repo && (
                            <a style={styles.link} href={app.repo} target="_blank" rel="noreferrer">
                                source on GitHub
                            </a>
                        )}
                        <QR text={app.url} />
                        <p style={styles.dim}>Scan with your phone to {app.kind === 'android' ? 'download and install' : 'open it, then "Add to Home screen"'}</p>
                    </div>
                )}
                {app && framable && (
                    <div style={styles.installBar}>
                        <QR text={app.url} size={64} />
                        <span>Scan to put {app.name} on your real phone, then "Add to Home screen"</span>
                    </div>
                )}
                <div style={styles.nav}>
                    <span style={styles.navBtn} onMouseDown={() => setApp(null)}>
                        ◀
                    </span>
                    <span style={styles.navBtn} onMouseDown={() => setApp(null)}>
                        ●
                    </span>
                    <span style={styles.navBtn} onMouseDown={close}>
                        ■
                    </span>
                </div>
            </div>
        </div>
    );
};

const Tile: React.FC<{ app: PhoneApp; onOpen: (a: PhoneApp) => void }> = ({ app, onOpen }) => (
    <div style={styles.tile} onMouseDown={() => onOpen(app)}>
        <div style={Object.assign({}, styles.icon, { background: app.color })}>{app.icon}</div>
        <span style={styles.label}>{app.name}</span>
    </div>
);

const styles: StyleSheetCSS = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.35)',
        pointerEvents: 'auto',
        zIndex: 100,
    },
    phone: {
        width: 360,
        height: 'min(760px, 92vh)',
        background: 'linear-gradient(160deg, #2a0f45, #0d1f12)',
        border: '12px solid #111',
        borderRadius: 36,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    },
    status: { display: 'flex', justifyContent: 'space-between', padding: '6px 16px', fontSize: 12 },
    home: { flex: 1, overflowY: 'auto', padding: '8px 14px' },
    clock: { fontSize: 54, fontWeight: 300, textAlign: 'center', marginTop: 10 },
    date: { textAlign: 'center', opacity: 0.8, marginBottom: 14 },
    section: { fontSize: 11, letterSpacing: 2, opacity: 0.6, margin: '12px 4px 6px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
    tile: { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', gap: 4 },
    icon: { width: 52, height: 52, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 },
    label: { fontSize: 10, textAlign: 'center', lineHeight: 1.1 },
    frame: { flex: 1, border: 0, background: '#fff' },
    detail: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20, gap: 6, overflowY: 'auto' },
    bigIcon: { width: 90, height: 90, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46 },
    dim: { opacity: 0.7, fontSize: 13, textAlign: 'center' },
    button: { background: '#5bff8a', color: '#000', padding: '8px 22px', borderRadius: 20, textDecoration: 'none', fontWeight: 'bold', marginTop: 6 },
    link: { color: '#d29bff', fontSize: 13 },
    qr: { background: '#fff', borderRadius: 8, marginTop: 10, flexShrink: 0 },
    installBar: { display: 'flex', alignItems: 'center', gap: 10, padding: 8, fontSize: 11, background: 'rgba(0,0,0,0.5)' },
    nav: { display: 'flex', justifyContent: 'space-around', padding: '8px 0', background: 'rgba(0,0,0,0.4)' },
    navBtn: { cursor: 'pointer', fontSize: 16, padding: '0 16px' },
};

export default PhoneScreen;
