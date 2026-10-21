import React, { useEffect, useState } from 'react';
import eventBus from '../EventBus';

/** The PS5 on the big screen: the emulator page in a TV frame */
const GameStation: React.FC = () => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        eventBus.on('openStation', () => setOpen(true));
    }, []);

    if (!open) return null;
    const close = () => {
        setOpen(false);
        eventBus.dispatch('stationClosed', {});
    };
    return (
        <div id="prevent-click" style={styles.backdrop}>
            <div style={styles.tv}>
                <div style={styles.bar}>
                    <b>CAK3D STATION</b>
                    <span style={styles.close} onMouseDown={close}>
                        POWER OFF
                    </span>
                </div>
                <iframe title="CAK3D Station" src="emulator/index.html" style={styles.screen} allow="autoplay; gamepad; fullscreen" />
            </div>
        </div>
    );
};

const styles: StyleSheetCSS = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        zIndex: 100,
    },
    tv: {
        width: 'min(92vw, 1280px)',
        height: 'min(86vh, 800px)',
        background: '#0c0c0e',
        border: '18px solid #0c0c0e',
        borderRadius: 12,
        boxShadow: '0 0 60px rgba(61,139,255,0.35)',
        display: 'flex',
        flexDirection: 'column',
    },
    bar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#fff',
        padding: '0 4px 10px',
    },
    close: {
        cursor: 'pointer',
        border: '2px solid #fff',
        padding: '2px 10px',
        fontSize: 12,
    },
    screen: {
        flex: 1,
        border: 0,
        background: '#000',
    },
};

export default GameStation;
