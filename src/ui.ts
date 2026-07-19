import { PAINTS } from './colors';
import type { PlacedDecal } from './decals';

export const STICKERS: { id: string; name: string }[] = [
  { id: 'jimny-text', name: 'JIMNY 字樣' },
  { id: 'mountain', name: '山形' },
  { id: 'fourxfour', name: '4×4' },
  { id: 'badge', name: '圓形號碼' },
  { id: 'stripe', name: '賽道線條' },
  { id: 'tracks', name: '胎痕' },
];

export interface UICallbacks {
  onPaint(id: string): void;
  onStickerPick(id: string): void;
  onSizeChange(v: number): void;
  onRotationChange(v: number): void;
  onDelete(): void;
  onScreenshot(): void;
  onShare(): void;
}

export interface UI {
  setActivePaint(id: string): void;
  setPlacing(stickerId: string | null): void;
  showDecalControls(d: PlacedDecal | null): void;
  setAttribution(text: string): void;
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
  shotBtn.addEventListener('click', () => cb.onScreenshot());
  shareBtn.addEventListener('click', () => cb.onShare());

  const title = el('h1', {}, ['Jimny', el('span', {}, ['3D'])]);
  root.append(
    el('header', { class: 'topbar' }, [title, el('div', { class: 'actions' }, [shotBtn, shareBtn])]),
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

  const paintsEl = el('div', { class: 'row paints' });
  for (const p of PAINTS) {
    const btn = el('button', { class: 'swatch', 'data-id': p.id, title: p.name });
    btn.style.background = p.roof
      ? `linear-gradient(to bottom, ${p.roof} 38%, ${p.body} 38%)`
      : p.body;
    btn.addEventListener('click', () => cb.onPaint(p.id));
    paintsEl.append(btn);
  }

  const stickersEl = el('div', { class: 'row stickers' });
  for (const s of STICKERS) {
    const btn = el('button', { class: 'sticker', 'data-id': s.id, title: s.name }, [
      el('img', { src: `stickers/${s.id}.svg`, alt: s.name }),
    ]);
    btn.addEventListener('click', () => cb.onStickerPick(s.id));
    stickersEl.append(btn);
  }
  root.append(el('footer', { class: 'dock' }, [paintsEl, stickersEl]));

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
      stickersEl.querySelectorAll('.sticker').forEach((node) => {
        node.classList.toggle('active', (node as HTMLElement).dataset.id === stickerId);
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
    toast(msg) {
      toastEl.textContent = msg;
      toastEl.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => (toastEl.hidden = true), 2200);
    },
  };
}
