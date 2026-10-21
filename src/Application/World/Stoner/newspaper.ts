import { canvasTexture, leafPath } from './props';

/**
 * Front page of The Double Wide, dressed like the real cover (NewsStand
 * papers.json + TheDoubleWide/double-wide.css): an orange pack of rolling
 * papers with a gummed strip on top.
 */
export function doubleWideTexture() {
    const C = { pack: '#e07a24', packDark: '#b85a14', paper: '#f5eedb', ink: '#1b1510', rust: '#9c2a1c', gum: '#c9a86a' };
    return canvasTexture(1024, 1080, (ctx, w, h) => {
        ctx.fillStyle = C.pack;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = C.packDark;
        ctx.lineWidth = 8;
        ctx.strokeRect(14, 14, w - 28, h - 28);
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, w - 60, h - 60);

        // gummed strip
        ctx.fillStyle = C.gum;
        ctx.fillRect(30, 30, w - 60, 54);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let x = 30; x < w - 30; x += 24) ctx.fillRect(x, 30, 12, 54);
        ctx.setLineDash([12, 8]);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.beginPath();
        ctx.moveTo(30, 86);
        ctx.lineTo(w - 30, 86);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(40,25,10,0.8)';
        ctx.textAlign = 'center';
        ctx.font = '600 22px Oswald, "Arial Narrow", Arial, sans-serif';
        ctx.fillText('G U M M E D  ·  D O U B L E  W I D E  ·  S L O W  B U R N I N G', w / 2, 66);

        // seal with a leaf
        ctx.fillStyle = C.paper;
        ctx.beginPath();
        ctx.arc(130, 200, 72, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = C.ink;
        ctx.stroke();
        ctx.save();
        ctx.translate(130, 212);
        ctx.scale(52, 52);
        ctx.fillStyle = C.ink;
        leafPath(ctx);
        ctx.fill();
        ctx.restore();

        // ear: today's date
        const now = new Date();
        ctx.fillStyle = C.paper;
        ctx.fillRect(w - 200, 135, 140, 130);
        ctx.strokeRect(w - 200, 135, 140, 130);
        ctx.fillStyle = C.ink;
        ctx.font = '600 20px Oswald, Arial, sans-serif';
        ctx.fillText(now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), w - 130, 170);
        ctx.fillStyle = C.rust;
        ctx.font = 'bold 44px Georgia, serif';
        ctx.fillText(`${now.getMonth() + 1}/${now.getDate()}`, w - 130, 230);

        // flag: cream letters, ink stroke, hard shadow
        ctx.lineWidth = 6;
        const flag = (text: string, y: number, size: number) => {
            ctx.font = `700 ${size}px "Abril Fatface", Georgia, serif`;
            ctx.fillStyle = C.ink;
            ctx.fillText(text, w / 2 + 6, y + 6);
            ctx.strokeStyle = C.ink;
            ctx.strokeText(text, w / 2, y);
            ctx.fillStyle = C.paper;
            ctx.fillText(text, w / 2, y);
        };
        flag('The', 160, 46);
        flag('Double Wide', 262, 108);
        ctx.fillStyle = '#2b1a0c';
        ctx.font = 'italic 30px "Old Standard TT", Georgia, serif';
        ctx.fillText('All the news that’s fit to roll', w / 2, 320);

        // band
        ctx.fillStyle = C.ink;
        ctx.fillRect(30, 345, w - 60, 3);
        ctx.fillRect(30, 389, w - 60, 3);
        ctx.font = '600 24px Oswald, Arial, sans-serif';
        ['NEWS', 'SPORTS', 'MARKETS'].forEach((b, i) => ctx.fillText(b, w * (0.25 + i * 0.25), 378));

        // the cream leaf with the front page on it
        ctx.fillStyle = C.paper;
        ctx.fillRect(50, 410, w - 100, h - 500);
        ctx.fillStyle = C.rust;
        ctx.font = '700 26px Oswald, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('T O D A Y ’ S   P A P E R', 80, 455);
        ctx.fillStyle = C.ink;
        ctx.fillRect(80, 468, w - 160, 3);
        ctx.font = 'bold 54px "Old Standard TT", Georgia, serif';
        ctx.fillText('Fresh off the', 80, 530);
        ctx.fillText('Corner Chronicle rack', 80, 590);
        ctx.fillStyle = '#6b5d4b';
        for (let col = 0; col < 2; col++) {
            for (let y = 630; y < h - 120; y += 24) {
                const len = 380 * (0.75 + 0.25 * Math.abs(Math.sin(y * 13 + col)));
                ctx.fillRect(80 + col * 450, y, len, 10);
            }
        }

        // footer
        ctx.fillStyle = C.ink;
        ctx.font = '600 24px Oswald, Arial, sans-serif';
        ctx.fillText('DAILY', 70, h - 50);
        ctx.textAlign = 'right';
        ctx.fillText('PRICE: ONE PINCH', w - 70, h - 50);
    });
}
