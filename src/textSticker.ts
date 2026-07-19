// 文字貼紙：把文字 + 字型 + 顏色編碼進 stickerId 本身，
// 這樣分享連結還原時不需要額外的 registry，重新算圖即可。

export interface StickerFont {
  id: string;
  label: string;
  css: string;
}

export const STICKER_FONTS: StickerFont[] = [
  { id: 'bold', label: '粗黑體', css: '"Arial Black","PingFang TC","Microsoft JhengHei",sans-serif' },
  { id: 'serif', label: '明體', css: 'Georgia,"Noto Serif TC",serif' },
  { id: 'mono', label: '等寬', css: '"Courier New",monospace' },
  { id: 'hand', label: '手寫風', css: '"Comic Sans MS",cursive' },
  { id: 'condensed', label: '窄體', css: '"Arial Narrow",sans-serif' },
];

export function getFont(id: string): StickerFont {
  return STICKER_FONTS.find((f) => f.id === id) ?? STICKER_FONTS[0];
}

const PREFIX = 'text:';

export function isTextSticker(id: string): boolean {
  return id.startsWith(PREFIX);
}

export function encodeTextSticker(text: string, fontId: string, colorHex: string): string {
  return `${PREFIX}${fontId}:${colorHex.replace('#', '')}:${encodeURIComponent(text)}`;
}

export function decodeTextSticker(id: string): { text: string; fontId: string; color: string } {
  const rest = id.slice(PREFIX.length);
  const [fontId, color, ...encTextParts] = rest.split(':');
  return { fontId, color, text: decodeURIComponent(encTextParts.join(':')) };
}

const CANVAS_SIZE = 512;
const H_PADDING = 36; // 左右各留的安全邊界，避免貼近畫布邊緣被裁到
const MAX_FONT = 200;
const MIN_FONT = 28;

// 用實際量測寬度算出剛好塞得下的字級，而不是用字數概算——
// 字數概算對等寬/窄體/手寫體這類寬度差異大的字型會嚴重失準，
// 導致長字串（如 "amor fati"）在畫布裡左右溢出被裁掉。
function fitFontSize(text: string, cssFont: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 90;
  const reference = 100;
  ctx.font = `800 ${reference}px ${cssFont}`;
  const width = ctx.measureText(text).width || reference;
  const availableWidth = CANVAS_SIZE - H_PADDING * 2;
  const fitted = Math.floor((availableWidth / width) * reference);
  return Math.max(MIN_FONT, Math.min(MAX_FONT, fitted));
}

export function buildTextStickerSvg(id: string): string {
  const { text, fontId, color } = decodeTextSticker(id);
  const font = getFont(fontId).css;
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fontSize = fitFontSize(text, font);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><text x="256" y="290" font-family='${font}' font-size="${fontSize}" font-weight="800" text-anchor="middle" fill="#${color}" stroke="#1a1a1a" stroke-width="4">${safe}</text></svg>`;
}
