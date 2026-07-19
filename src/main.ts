import './style.css';
import { createViewer } from './viewer';
import { loadCarModel, applyPaint, type CarModel } from './model';
import { DecalManager } from './decals';
import { DEFAULT_PAINT_ID, getPaint } from './colors';
import { encodeStateToHash, decodeStateFromHash } from './share';
import { buildUI } from './ui';

const app = document.querySelector<HTMLElement>('#app')!;
const viewer = createViewer(app);

let model: CarModel | null = null;
let currentPaintId = DEFAULT_PAINT_ID;

const decalManager = new DecalManager(viewer, () => model);

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
  onSizeChange(v) {
    decalManager.setSelectedSize(v);
  },
  onRotationChange(v) {
    decalManager.setSelectedRotation(v);
  },
  onDelete() {
    decalManager.deleteSelected();
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
    const hash = encodeStateToHash({ c: currentPaintId, d: decalManager.serialize() });
    const url = `${location.origin}${location.pathname}${hash}`;
    history.replaceState(null, '', hash);
    navigator.clipboard
      .writeText(url)
      .then(() => ui.toast('分享連結已複製'))
      .catch(() => ui.toast(`連結：${url}`));
  },
});

decalManager.onSelectionChange = (d) => ui.showDecalControls(d);
decalManager.onPlacingChange = (id) => ui.setPlacing(id);

loadCarModel(viewer.scene).then(async (m) => {
  model = m;

  const shared = decodeStateFromHash();
  currentPaintId = shared && getPaint(shared.c).id === shared.c ? shared.c : DEFAULT_PAINT_ID;
  applyPaint(model, getPaint(currentPaintId));
  ui.setActivePaint(currentPaintId);

  if (shared?.d?.length) await decalManager.restore(shared.d);

  ui.setAttribution(
    model.isPlaceholder
      ? '目前為佔位模型 — 將 Sketchfab 下載的 glTF 放到 public/models/jimny.glb 即可替換'
      : '3D model via Sketchfab (CC-BY) — 詳見專案 README',
  );
});
