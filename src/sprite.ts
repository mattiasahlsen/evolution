const SPRITE_SIZE = 20;

const SPRITE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SPRITE_SIZE}" height="${SPRITE_SIZE}" viewBox="0 0 20 20">
  <!-- Body -->
  <ellipse cx="10" cy="11" rx="8" ry="7" fill="FILL_COLOR" stroke="rgba(0,0,0,0.3)" stroke-width="0.5"/>
  <!-- Left eye white -->
  <ellipse cx="7" cy="9" rx="2.5" ry="2.8" fill="white"/>
  <!-- Right eye white -->
  <ellipse cx="13" cy="9" rx="2.5" ry="2.8" fill="white"/>
  <!-- Left pupil -->
  <circle cx="7.5" cy="9.5" r="1.3" fill="#222"/>
  <!-- Right pupil -->
  <circle cx="13.5" cy="9.5" r="1.3" fill="#222"/>
  <!-- Mouth -->
  <path d="M 7 14 Q 10 16 13 14" stroke="#333" stroke-width="0.7" fill="none" stroke-linecap="round"/>
</svg>
`;

const spriteCache = new Map<string, HTMLCanvasElement>();

export function getSpriteForColor(color: string): HTMLCanvasElement {
  const cached = spriteCache.get(color);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d')!;

  const svg = SPRITE_SVG.replace('FILL_COLOR', color);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;

  // Draw synchronously if possible, otherwise schedule
  img.onload = () => {
    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
    ctx.drawImage(img, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
    URL.revokeObjectURL(url);
  };

  // Store canvas even before loaded — will render on next frame
  spriteCache.set(color, canvas);
  return canvas;
}

export function preloadSprite(color: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_SIZE;
    canvas.height = SPRITE_SIZE;
    const ctx = canvas.getContext('2d')!;

    const svg = SPRITE_SVG.replace('FILL_COLOR', color);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
      URL.revokeObjectURL(url);
      spriteCache.set(color, canvas);
      resolve(canvas);
    };
    img.src = url;
  });
}

export { SPRITE_SIZE };
