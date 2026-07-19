import * as THREE from 'three';

export interface BackgroundPreset {
  id: string;
  label: string;
  /** UI 色票按鈕用的 CSS 漸層，跟實際場景背景用同一組顏色 */
  css: string;
  stops: [number, string][];
}

function gradientTexture(stops: [number, string][]): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  for (const [offset, color] of stops) grad.addColorStop(offset, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'default', label: '預設', css: '#dfe3e8', stops: [[0, '#dfe3e8']] },
  {
    id: 'beach',
    label: '海邊',
    css: 'linear-gradient(#bfe3f5, #eaf6ee 55%, #e8dcb0)',
    stops: [
      [0, '#bfe3f5'],
      [0.55, '#eaf6ee'],
      [1, '#e8dcb0'],
    ],
  },
  {
    id: 'forest',
    label: '森林',
    css: 'linear-gradient(#cfe0d6, #b7cdb5 55%, #6c7a56)',
    stops: [
      [0, '#cfe0d6'],
      [0.55, '#b7cdb5'],
      [1, '#6c7a56'],
    ],
  },
  {
    id: 'creek',
    label: '溯溪',
    css: 'linear-gradient(#d7e6ea, #aebfb6 55%, #7f9088)',
    stops: [
      [0, '#d7e6ea'],
      [0.55, '#aebfb6'],
      [1, '#7f9088'],
    ],
  },
  {
    id: 'coast-sunset',
    label: '海邊公路',
    css: 'linear-gradient(#f7c98e, #f2896b 45%, #a6688c 75%, #4c4a70)',
    stops: [
      [0, '#f7c98e'],
      [0.4, '#f2896b'],
      [0.75, '#a6688c'],
      [1, '#4c4a70'],
    ],
  },
];

export const DEFAULT_BACKGROUND_ID = 'default';

export function getBackground(id: string): BackgroundPreset {
  return BACKGROUND_PRESETS.find((b) => b.id === id) ?? BACKGROUND_PRESETS[0];
}

export function buildBackground(id: string): THREE.Color | THREE.Texture {
  const preset = getBackground(id);
  if (preset.stops.length === 1) return new THREE.Color(preset.stops[0][1]);
  return gradientTexture(preset.stops);
}
