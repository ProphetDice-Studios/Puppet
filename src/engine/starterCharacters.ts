export interface StarterCharacterSpec {
  id: string;
  name: string;
  role: string;
  renderToCanvas: (canvas: HTMLCanvasElement) => void;
}

function drawRoundedLimb(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  fill: string,
  stroke = '#1e293b',
  lineWidth = 4
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width + lineWidth * 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = fill;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/**
 * Generates crisp, transparent PNG starter characters directly on an offscreen canvas.
 * Every starter PNG goes through the exact same PNG pixel loader & silhouette auto-rigger
 * as user-uploaded PNG files!
 */
export const STARTER_CHARACTERS: StarterCharacterSpec[] = [
  {
    id: 'nova_astro',
    name: 'Nova (Space Explorer)',
    role: 'Balanced A-Pose PNG',
    renderToCanvas: (canvas) => {
      canvas.width = 420;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 420, 480);

      const cx = 210;
      const ink = '#0f172a';

      // Left & Right Legs
      drawRoundedLimb(ctx, cx - 32, 265, cx - 42, 398, 30, '#e2e8f0', ink, 4);
      drawRoundedLimb(ctx, cx + 32, 265, cx + 42, 398, 30, '#e2e8f0', ink, 4);

      // Boots
      const drawBoot = (bx: number, dir: number) => {
        ctx.fillStyle = '#2563eb';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(bx - 22, 384, 46, 38, [12, 12, 10, 10]);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(bx - 20, 412, 42, 7);
        if (dir < 0) {
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(bx - 12, 392, 16, 6);
        } else {
          ctx.fillStyle = '#60a5fa';
          ctx.fillRect(bx - 4, 392, 16, 6);
        }
      };
      drawBoot(cx - 44, -1);
      drawBoot(cx + 44, 1);

      // Arms (clean A-pose so silhouette auto-rig locks onto shoulders, elbows, hands)
      drawRoundedLimb(ctx, cx - 54, 168, cx - 132, 232, 26, '#f1f5f9', ink, 4);
      drawRoundedLimb(ctx, cx + 54, 168, cx + 132, 232, 26, '#f1f5f9', ink, 4);

      // Gloves
      for (const gx of [cx - 138, cx + 138]) {
        ctx.beginPath();
        ctx.arc(gx, 237, 17, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = ink;
        ctx.stroke();
      }

      // Torso Suit
      ctx.fillStyle = '#f8fafc';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.roundRect(cx - 56, 148, 112, 128, [28, 28, 34, 34]);
      ctx.fill();
      ctx.stroke();

      // Chest Chestplate & Belt
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.roundRect(cx - 34, 172, 68, 42, 12);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, 193, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 54, 244, 108, 14);

      // Neck ring
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(cx - 22, 128, 44, 24, 8);
      ctx.fill();
      ctx.stroke();

      // Antenna
      ctx.strokeStyle = ink;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, 44);
      ctx.lineTo(cx, 24);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, 20, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.stroke();

      // Helmet
      ctx.beginPath();
      ctx.arc(cx, 88, 50, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = ink;
      ctx.stroke();

      // Visor
      ctx.beginPath();
      ctx.roundRect(cx - 36, 66, 72, 44, 20);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Friendly glowing eyes inside visor
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.ellipse(cx - 14, 88, 6, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 14, 88, 6, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Visor highlight
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.ellipse(cx - 18, 75, 10, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'pip_fox',
    name: 'Pip (Woodland Fox)',
    role: 'Hoodie Mascot PNG',
    renderToCanvas: (canvas) => {
      canvas.width = 420;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 420, 480);

      const cx = 210;
      const ink = '#1e1b18';

      // Jeans Legs
      drawRoundedLimb(ctx, cx - 30, 268, cx - 38, 398, 28, '#334155', ink, 4);
      drawRoundedLimb(ctx, cx + 30, 268, cx + 38, 398, 28, '#334155', ink, 4);

      // Sneakers
      for (const sx of [cx - 40, cx + 40]) {
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(sx - 22, 388, 44, 32, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 20, 410, 40, 8);
      }

      // Hoodie Sleeves + Fox Paws
      drawRoundedLimb(ctx, cx - 50, 174, cx - 128, 234, 25, '#f59e0b', ink, 4);
      drawRoundedLimb(ctx, cx + 50, 174, cx + 128, 234, 25, '#f59e0b', ink, 4);

      for (const px of [cx - 134, cx + 134]) {
        ctx.beginPath();
        ctx.arc(px, 238, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#ea580c';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = ink;
        ctx.stroke();
      }

      // Mustard Hoodie Torso
      ctx.fillStyle = '#f59e0b';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.roundRect(cx - 54, 154, 108, 122, [26, 26, 22, 22]);
      ctx.fill();
      ctx.stroke();

      // Kangaroo pocket
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(cx - 34, 218, 68, 36, 12);
      ctx.fill();
      ctx.stroke();

      // Neck
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.roundRect(cx - 16, 132, 32, 26, 8);
      ctx.fill();
      ctx.stroke();

      // Pointy Fox Ears
      const drawEar = (dir: number) => {
        ctx.fillStyle = '#ea580c';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(cx + dir * 18, 56);
        ctx.lineTo(cx + dir * 46, 20);
        ctx.lineTo(cx + dir * 48, 74);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.moveTo(cx + dir * 24, 56);
        ctx.lineTo(cx + dir * 41, 31);
        ctx.lineTo(cx + dir * 42, 68);
        ctx.closePath();
        ctx.fill();
      };
      drawEar(-1);
      drawEar(1);

      // Fox Head
      ctx.fillStyle = '#ea580c';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.ellipse(cx, 92, 52, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cream Cheeks
      ctx.fillStyle = '#fffbeb';
      ctx.beginPath();
      ctx.ellipse(cx - 24, 106, 22, 18, 0.2, 0, Math.PI * 2);
      ctx.ellipse(cx + 24, 106, 22, 18, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Eyes & Nose
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(cx - 18, 86, 5.5, 0, Math.PI * 2);
      ctx.arc(cx + 18, 86, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(cx, 100, 7, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  {
    id: 'cobalt_knight',
    name: 'Rook (Paper Knight)',
    role: 'Storybook Hero PNG',
    renderToCanvas: (canvas) => {
      canvas.width = 420;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, 420, 480);

      const cx = 210;
      const ink = '#0f172a';

      // Armored Greaves
      drawRoundedLimb(ctx, cx - 30, 268, cx - 38, 404, 28, '#94a3b8', ink, 4);
      drawRoundedLimb(ctx, cx + 30, 268, cx + 38, 404, 28, '#94a3b8', ink, 4);

      for (const fx of [cx - 40, cx + 40]) {
        ctx.fillStyle = '#475569';
        ctx.strokeStyle = ink;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(fx - 20, 394, 40, 28, 10);
        ctx.fill();
        ctx.stroke();
      }

      // Armored Arms
      drawRoundedLimb(ctx, cx - 54, 168, cx - 130, 226, 24, '#94a3b8', ink, 4);
      drawRoundedLimb(ctx, cx + 54, 168, cx + 130, 226, 24, '#94a3b8', ink, 4);

      for (const gx of [cx - 136, cx + 136]) {
        ctx.beginPath();
        ctx.arc(gx, 230, 15, 0, Math.PI * 2);
        ctx.fillStyle = '#475569';
        ctx.fill();
        ctx.stroke();
      }

      // Tunic & Breastplate
      ctx.fillStyle = '#1d4ed8';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.roundRect(cx - 52, 150, 104, 128, [22, 22, 16, 16]);
      ctx.fill();
      ctx.stroke();

      // Gold Emblem
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.moveTo(cx, 174);
      ctx.lineTo(cx + 18, 198);
      ctx.lineTo(cx, 222);
      ctx.lineTo(cx - 18, 198);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Neck
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.roundRect(cx - 18, 130, 36, 24, 6);
      ctx.fill();
      ctx.stroke();

      // Plume
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(cx, 36, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Great Helm
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.roundRect(cx - 42, 46, 84, 88, [34, 34, 18, 18]);
      ctx.fill();
      ctx.stroke();

      // Visor Slit
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.roundRect(cx - 28, 82, 56, 14, 6);
      ctx.fill();
    },
  },
];

export function generateStarterPngDataUrl(spec: StarterCharacterSpec): string {
  const canvas = document.createElement('canvas');
  spec.renderToCanvas(canvas);
  return canvas.toDataURL('image/png');
}
