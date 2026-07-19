import { PAINTS } from './colors';
import type { PlacedDecal } from './decals';
import { STICKER_FONTS, buildTextStickerSvg, encodeTextSticker } from './textSticker';

export const STICKERS: { id: string; name: string }[] = [
  { id: 'jimny-text', name: 'JIMNY 字樣' },
  { id: 'mountain', name: '山形' },
  { id: 'fourxfour', name: '4×4' },
  { id: 'badge', name: '圓形號碼' },
  { id: 'stripe', name: '賽道線條' },
  { id: 'tracks', name: '胎痕' },
];

// 這兩款貼紙以純白線條繪製，允許使用者換色
const RECOLORABLE_STICKERS = new Set(['jimny-text', 'mountain']);

export interface UICallbacks {
  onPaint(id: string): void;
  onStickerPick(id: string): void;
  onTextStickerPlace(text: string, fontId: string, colorHex: string): void;
  onSizeChange(v: number): void;
  onRotationChange(v: number): void;
  onDelete(): void;
  onScreenshot(): void;
  onShare(): void;
  onKidToggle(): void;
}

export interface UI {
  setActivePaint(id: string): void;
  setPlacing(stickerId: string | null): void;
  showDecalControls(d: PlacedDecal | null): void;
  setAttribution(text: string): void;
  setKidMode(active: boolean): void;
  toast(msg: string): void;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (HTMLElement | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'id') node.id = v;
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

export function buildUI(root: HTMLElement, cb: UICallbacks): UI {
  const shotBtn = el('button', { id: 'btn-shot' }, ['📷 截圖下載']);
  const shareBtn = el('button', { id: 'btn-share' }, ['🔗 分享連結']);
  const kidBtn = el('button', { id: 'btn-kid', class: 'kid-toggle', title: '切換成小朋友版玩具車' }, [
    '🧸 小朋友 Jimny',
  ]);
  shotBtn.addEventListener('click', () => cb.onScreenshot());
  shareBtn.addEventListener('click', () => cb.onShare());
  kidBtn.addEventListener('click', () => cb.onKidToggle());

  const title = el('h1', {}, ['Jimny', el('span', {}, ['3D'])]);
  root.append(
    el('header', { class: 'topbar' }, [
      title,
      el('div', { class: 'actions' }, [kidBtn, shotBtn, shareBtn]),
    ]),
  );

  const hint = el('div', { class: 'hint', hidden: '' }, ['點擊車身貼上貼紙（Esc 取消）']);
  root.append(hint);

  const sizeCtl = el('input', { type: 'range', min: '0.15', max: '1.2', step: '0.01' });
  const rotCtl = el('input', { type: 'range', min: '-3.14', max: '3.14', step: '0.01' });
  const delBtn = el('button', { class: 'danger' }, ['🗑 刪除貼紙']);
  sizeCtl.addEventListener('input', () => cb.onSizeChange(Number(sizeCtl.value)));
  rotCtl.addEventListener('input', () => cb.onRotationChange(Number(rotCtl.value)));
  delBtn.addEventListener('click', () => cb.onDelete());
  const panel = el('aside', { class: 'decal-panel', hidden: '' }, [
    el('label', {}, ['大小 ', sizeCtl]),
    el('label', {}, ['旋轉 ', rotCtl]),
    delBtn,
  ]);
  root.append(panel);

  // --- 原廠 / 客製色票 -------------------------------------------------
  const paintsEl = el('div', { class: 'row paints' });
  for (const p of PAINTS) {
    const btn = el('button', { class: 'swatch', 'data-id': p.id, title: p.nameTw });
    btn.style.background = p.isTwoTone
      ? `linear-gradient(to bottom, ${p.roofHex} 38%, ${p.bodyHex} 38%)`
      : p.bodyHex;
    if (p.category === 'custom') btn.classList.add('custom');
    btn.addEventListener('click', () => cb.onPaint(p.id));
    paintsEl.append(btn);
  }

  // --- 貼紙（含可換色款）------------------------------------------------
  const stickerColors = new Map<string, string>(); // baseId -> 色碼（不含 #）
  const stickerRawSvg = new Map<string, string>(); // baseId -> 原始 SVG 內容（供即時預覽換色）

  const stickersEl = el('div', { class: 'row stickers' });
  for (const s of STICKERS) {
    const img = el('img', { src: `stickers/${s.id}.svg`, alt: s.name });
    const btn = el('button', { class: 'sticker', 'data-id': s.id, title: s.name }, [img]);
    const wrap = el('div', { class: 'sticker-wrap' }, [btn]);

    if (RECOLORABLE_STICKERS.has(s.id)) {
      fetch(`stickers/${s.id}.svg`)
        .then((r) => r.text())
        .then((raw) => stickerRawSvg.set(s.id, raw));

      const colorInput = el('input', { type: 'color', class: 'sticker-color', value: '#ffffff' });
      colorInput.addEventListener('click', (e) => e.stopPropagation());
      colorInput.addEventListener('input', () => {
        const hex = (colorInput as HTMLInputElement).value;
        stickerColors.set(s.id, hex.slice(1));
        const raw = stickerRawSvg.get(s.id);
        if (raw) {
          const recolored = raw.replace(/#ffffff/gi, hex);
          img.src = `data:image/svg+xml;utf8,${encodeURIComponent(recolored)}`;
        }
      });
      wrap.append(colorInput);
    }

    btn.addEventListener('click', () => {
      const color = stickerColors.get(s.id);
      cb.onStickerPick(color && color !== 'ffffff' ? `${s.id}@${color}` : s.id);
    });
    stickersEl.append(wrap);
  }

  // --- 文字貼紙面板 -----------------------------------------------------
  const textToggleBtn = el(
    'button',
    { class: 'sticker text-toggle', 'data-id': 'text', title: '文字貼紙' },
    ['Aa'],
  );
  stickersEl.append(textToggleBtn);
  root.append(el('footer', { class: 'dock' }, [paintsEl, stickersEl]));

  const textInput = el('input', {
    type: 'text',
    maxlength: '14',
    placeholder: '輸入文字…',
    class: 'text-input',
  }) as HTMLInputElement;
  const fontSelect = el(
    'select',
    { class: 'text-font' },
    STICKER_FONTS.map((f) => el('option', { value: f.id }, [f.label])),
  ) as HTMLSelectElement;
  const textColorInput = el('input', { type: 'color', value: '#ffffff', class: 'text-color' });
  const textPreview = el('img', { class: 'text-preview', alt: '預覽' });
  const submitBtn = el('button', {}, ['貼上']);
  const textPanel = el('div', { class: 'text-panel', hidden: '' }, [
    textPreview,
    textInput,
    fontSelect,
    textColorInput,
    submitBtn,
  ]);
  root.append(textPanel);

  const updateTextPreview = () => {
    const text = textInput.value.trim();
    if (!text) {
      textPreview.style.visibility = 'hidden';
      return;
    }
    textPreview.style.visibility = 'visible';
    const id = encodeTextSticker(text, fontSelect.value, (textColorInput as HTMLInputElement).value);
    textPreview.src = `data:image/svg+xml;utf8,${encodeURIComponent(buildTextStickerSvg(id))}`;
  };
  textInput.addEventListener('input', updateTextPreview);
  fontSelect.addEventListener('change', updateTextPreview);
  textColorInput.addEventListener('input', updateTextPreview);

  textToggleBtn.addEventListener('click', () => {
    textPanel.hidden = !textPanel.hidden;
    if (!textPanel.hidden) {
      updateTextPreview();
      textInput.focus();
    }
  });

  const submitText = () => {
    const text = textInput.value.trim();
    if (!text) return;
    cb.onTextStickerPlace(text, fontSelect.value, (textColorInput as HTMLInputElement).value);
    textPanel.hidden = true;
  };
  submitBtn.addEventListener('click', submitText);
  textInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitText();
  });

  const attribution = el('div', { class: 'attribution' });
  const toastEl = el('div', { class: 'toast', hidden: '' });
  root.append(attribution, toastEl);

  let toastTimer = 0;

  return {
    setActivePaint(id) {
      paintsEl.querySelectorAll('.swatch').forEach((node) => {
        node.classList.toggle('active', (node as HTMLElement).dataset.id === id);
      });
    },
    setPlacing(stickerId) {
      hint.hidden = !stickerId;
      const activeBase = stickerId ? stickerId.split('@')[0].split(':')[0] : null;
      stickersEl.querySelectorAll('.sticker').forEach((node) => {
        node.classList.toggle('active', (node as HTMLElement).dataset.id === activeBase);
      });
    },
    showDecalControls(d) {
      panel.hidden = !d;
      if (d) {
        sizeCtl.value = String(d.size);
        rotCtl.value = String(d.rotation);
      }
    },
    setAttribution(text) {
      attribution.textContent = text;
    },
    setKidMode(active) {
      kidBtn.classList.toggle('active', active);
    },
    toast(msg) {
      toastEl.textContent = msg;
      toastEl.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => (toastEl.hidden = true), 2200);
    },
  };
}
