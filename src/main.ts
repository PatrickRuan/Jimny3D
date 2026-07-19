import './style.css';
import { createViewer } from './viewer';
import { loadRealModel, buildKidModel, applyPaint, applyPartColor, type CarModel } from './model';
import { DecalManager } from './decals';
import { DEFAULT_PAINT_ID, getPaint } from './colors';
import { encodeStateToHash, decodeStateFromHash } from './share';
import { encodeTextSticker } from './textSticker';
import { buildUI, type UIPart } from './ui';
import { trackVisit } from './visitor';

const REAL_ATTRIBUTION = '3D model: "2023 Suzuki Jimny Sierra" by tonielpro520 (Sketchfab), CC-BY-4.0';
const KID_ATTRIBUTION = '小尼可醬版 Jimny — 積木玩具風，操作最簡單 🧸';

const app = document.querySelector<HTMLElement>('#app')!;
const viewer = createViewer(app);

let model: CarModel | null = null;
let realModel: CarModel | null = null;
let kidModel: CarModel | null = null;
let usingKid = false;
let currentPaintId = DEFAULT_PAINT_ID;

const decalManager = new DecalManager(viewer, () => model, app);

function refreshCustomPartsUI() {
  const parts: UIPart[] = (model?.customParts ?? []).map((p) => ({
    id: p.id,
    label: p.label,
    hex: `#${p.material.color.getHexString()}`,
    defaultHex: p.defaultHex,
  }));
  ui.setCustomParts(parts);
}

function activate(next: CarModel) {
  const hadDecals = decalManager.decals.length > 0;
  decalManager.clearAll();
  if (model) viewer.scene.remove(model.root);
  model = next;
  viewer.scene.add(model.root);
  applyPaint(model, getPaint(currentPaintId));
  refreshCustomPartsUI();
  if (hadDecals) ui.toast('已切換車型，貼紙重新開始擺放');
}

function setKidMode(kid: boolean) {
  if (kid) {
    if (!kidModel) kidModel = buildKidModel();
    activate(kidModel);
    usingKid = true;
  } else {
    if (!realModel) {
      ui.toast('正式模型尚未載入完成');
      return;
    }
    activate(realModel);
    usingKid = false;
  }
  ui.setKidMode(usingKid);
  ui.setAttribution(usingKid ? KID_ATTRIBUTION : REAL_ATTRIBUTION);
}

const ui = buildUI(app, {
  onPaint(id) {
    currentPaintId = id;
    if (model) applyPaint(model, getPaint(id));
    ui.setActivePaint(id);
  },
  onStickerPick(id) {
    if (decalManager.placingStickerId === id) decalManager.cancelPlacement();
    else decalManager.beginPlacement(id);
  },
  onTextStickerPlace(text, fontId, colorHex, strokeHex) {
    decalManager.beginPlacement(encodeTextSticker(text, fontId, colorHex, strokeHex));
  },
  onSizeChange(v) {
    decalManager.setSelectedSize(v);
  },
  onRotationChange(v) {
    decalManager.setSelectedRotation(v);
  },
  onAspectChange(v) {
    decalManager.setSelectedAspect(v);
  },
  onDelete() {
    decalManager.deleteSelected();
  },
  onDuplicate() {
    decalManager.duplicateSelected();
  },
  onScreenshot() {
    viewer.renderer.render(viewer.scene, viewer.camera);
    viewer.canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'jimny.png';
      a.click();
      URL.revokeObjectURL(url);
      ui.toast('已下載截圖');
    }, 'image/png');
  },
  onShare() {
    const partColors: Record<string, string> = {};
    for (const p of model?.customParts ?? []) partColors[p.id] = `#${p.material.color.getHexString()}`;
    const hash = encodeStateToHash({ c: currentPaintId, d: decalManager.serialize(), p: partColors });
    const url = `${location.origin}${location.pathname}${hash}`;
    history.replaceState(null, '', hash);
    navigator.clipboard
      .writeText(url)
      .then(() => ui.toast('分享連結已複製'))
      .catch(() => ui.toast(`連結：${url}`));
  },
  onKidToggle() {
    setKidMode(!usingKid);
  },
  onPartColorChange(partId, hex) {
    if (model) applyPartColor(model, partId, hex);
  },
});

decalManager.onSelectionChange = (d) => ui.showDecalControls(d);
decalManager.onPlacingChange = (id) => ui.setPlacing(id);

async function boot() {
  kidModel = buildKidModel();
  try {
    realModel = await loadRealModel();
  } catch (err) {
    console.error('[Jimny3D] 正式模型載入失敗：', err);
    realModel = null;
  }

  const shared = decodeStateFromHash();
  currentPaintId = shared && getPaint(shared.c).id === shared.c ? shared.c : DEFAULT_PAINT_ID;

  activate(realModel ?? kidModel);
  usingKid = !realModel;
  ui.setKidMode(usingKid);
  ui.setActivePaint(currentPaintId);

  if (shared?.p && model) {
    for (const [partId, hex] of Object.entries(shared.p)) applyPartColor(model, partId, hex);
    refreshCustomPartsUI();
  }

  if (shared?.d?.length) await decalManager.restore(shared.d);

  ui.setAttribution(
    usingKid
      ? realModel
        ? KID_ATTRIBUTION
        : '正式模型載入失敗，暫以小尼可醬版顯示'
      : REAL_ATTRIBUTION,
  );
}

boot();

trackVisit()
  .then(({ current, previous }) => ui.setVisitorCounts(current, previous))
  .catch(() => {});
