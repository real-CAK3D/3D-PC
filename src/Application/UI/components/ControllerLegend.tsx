import React, { useEffect, useState } from 'react';
import eventBus from '../EventBus';

const ROWS: { [layout: string]: [string, string][] } = {
    'WASD d-pad': [
        ['W A S D', 'D-pad'],
        ['O', 'Triangle'],
        ['J', 'Square'],
        ['Space', 'Cross'],
        ['P', 'Circle'],
    ],
    'Arrow d-pad': [
        ['Arrows', 'D-pad'],
        ['W', 'Triangle'],
        ['A', 'Square'],
        ['S / Space', 'Cross'],
        ['D', 'Circle'],
    ],
    'IJKL d-pad': [
        ['I J K L', 'D-pad'],
        ['W', 'Triangle'],
        ['A', 'Square'],
        ['S / Space', 'Cross'],
        ['D', 'Circle'],
        [';', 'Hide this'],
    ],
};
const COMMON: [string, string][] = [
    ['Mouse', 'Left stick'],
    ['Q / E', 'L1 / R1'],
    ['F', 'Select'],
    ['H', 'Start'],
    ['G', 'PS (game library)'],
    ['B', 'Swap layout'],
    ['Click TV', 'Zoom in'],
    ['Gamepad', 'Just works (USB / Bluetooth)'],
    ['L', 'Hide this'],
    ['M', 'Put the controller down'],
];

/** Key map for the couch controller, shown while gaming (L toggles it) */
const ControllerLegend: React.FC = () => {
    const [on, setOn] = useState(false);
    const [layout, setLayout] = useState('WASD d-pad');
    const [shown, setShown] = useState(true);

    useEffect(() => {
        eventBus.on('gameModeState', (s: { on: boolean; layout: string }) => {
            setOn(s.on);
            setLayout(s.layout);
        });
        eventBus.on('toggleLegend', () => setShown((v) => !v));
    }, []);

    if (!on || !shown) return null;
    return (
        <div style={styles.legend}>
            <b style={styles.title}>CONTROLLER · {layout}</b>
            {[...ROWS[layout], ...COMMON].map(([k, v]) => (
                <div key={k + v} style={styles.row}>
                    <span style={styles.key}>{k}</span>
                    <span>{v}</span>
                </div>
            ))}
        </div>
    );
};

const styles: StyleSheetCSS = {
    legend: {
        position: 'fixed',
        left: 24,
        bottom: 24,
        background: 'rgba(8, 4, 16, 0.85)',
        border: '3px solid #fff',
        color: '#e8dcff',
        padding: 12,
        fontSize: 13,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        pointerEvents: 'none',
        zIndex: 50,
    },
    title: {
        color: '#5bff8a',
        marginBottom: 6,
    },
    row: {
        display: 'flex',
        gap: 12,
    },
    key: {
        minWidth: 86,
        color: '#fff',
        fontWeight: 'bold',
    },
};

export default ControllerLegend;
