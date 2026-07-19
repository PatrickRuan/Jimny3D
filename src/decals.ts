import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import type { Viewer } from './viewer';
import type { CarModel } from './model';
import { isTextSticker, buildTextStickerSvg } from './textSticker';

export interface PlacedDecal {
  stickerId: string;
  targetIndex: number; // paintableMeshes 的索引
  position: THREE.Vector3;
  normal: THREE.Vector3;
  rotation: number; // 沿法線的旋轉角
  size: number;
  aspect: number; // 寬/高比，1 = 正方形
  mesh: THREE.Mesh;
}

export interface SerializedDecal {
  s: string;
  t: number;
  p: number[];
  n: number[];
  r: number;
  w: number;
  a: number;
}

const DEFAULT_SIZE = 0.45;
const DEFAULT_ASPECT = 1;

interface HandleDrag {
  kind: 'rotate' | 'scale';
  center: { x: number; y: number };
  startX: number;
  startY: number;
  startRotation: number;
  startSize: number;
}

export class DecalManager {
  decals: PlacedDecal[] = [];
  selected: PlacedDecal | null = null;
  placingStickerId: string | null = null;

  onSelectionChange: (d: PlacedDecal | null) => void = () => {};
  onPlacingChange: (stickerId: string | null) => void = () => {};

  // 貼紙疊貼紙時的畫面堆疊順序：每貼一張新的就遞增，讓後貼的一定畫在先貼的上面，
  // 不會因為兩張貼紙剛好用一樣的 polygonOffset/renderOrder 而互相「打架」只顯示一半。
  private stackCounter = 0;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private helper = new THREE.Object3D();
  private previewMesh: THREE.Mesh | null = null;
  private textureCache = new Map<string, THREE.Texture>();
  private downPos: { x: number; y: number } | null = null;
  private lastPreviewAt = 0;
  private draggingDecal = false;
  private handleDrag: HandleDrag | null = null;

  private viewer: Viewer;
  private getModel: () => CarModel | null;
  private gizmoRotate: HTMLButtonElement;
  private gizmoScale: HTMLButtonElement;

  constructor(viewer: Viewer, getModel: () => CarModel | null, gizmoContainer: HTMLElement) {
    this.viewer = viewer;
    this.getModel = getModel;
    const canvas = viewer.canvas;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cancelPlacement();
    });

    this.gizmoRotate = document.createElement('button');
    this.gizmoRotate.className = 'decal-handle decal-handle-rotate';
    this.gizmoRotate.title = '拖曳旋轉';
    this.gizmoRotate.textContent = '↻';
    this.gizmoRotate.hidden = true;
    this.gizmoRotate.addEventListener('pointerdown', (e) => this.beginHandleDrag('rotate', e));

    this.gizmoScale = document.createElement('button');
    this.gizmoScale.className = 'decal-handle decal-handle-scale';
    this.gizmoScale.title = '拖曳縮放';
    this.gizmoScale.textContent = '⤡';
    this.gizmoScale.hidden = true;
    this.gizmoScale.addEventListener('pointerdown', (e) => this.beginHandleDrag('scale', e));

    gizmoContainer.append(this.gizmoRotate, this.gizmoScale);
    viewer.onFrame(() => this.updateGizmo());
  }

  beginPlacement(stickerId: string) {
    this.placingStickerId = stickerId;
    this.select(null);
    this.onPlacingChange(stickerId);
  }

  cancelPlacement() {
    this.placingStickerId = null;
    this.removePreview();
    this.onPlacingChange(null);
  }

  select(d: PlacedDecal | null) {
    if (this.selected) {
      (this.selected.mesh.material as THREE.MeshStandardMaterial).emissive.set(0x000000);
    }
    this.selected = d;
    if (d) {
      (d.mesh.material as THREE.MeshStandardMaterial).emissive.set(0x2a4d8f);
    }
    this.onSelectionChange(d);
  }

  setSelectedSize(size: number) {
    if (!this.selected) return;
    this.selected.size = size;
    this.rebuild(this.selected);
  }

  setSelectedRotation(rotation: number) {
    if (!this.selected) return;
    this.selected.rotation = rotation;
    this.rebuild(this.selected);
  }

  setSelectedAspect(aspect: number) {
    if (!this.selected) return;
    this.selected.aspect = aspect;
    this.rebuild(this.selected);
  }

  deleteSelected() {
    if (!this.selected) return;
    const d = this.selected;
    this.viewer.scene.remove(d.mesh);
    d.mesh.geometry.dispose();
    this.decals = this.decals.filter((x) => x !== d);
    this.select(null);
  }

  async duplicateSelected() {
    if (!this.selected) return;
    const model = this.getModel();
    const target = model?.paintableMeshes[this.selected.targetIndex];
    if (!target) return;
    // 沿著表面切線偏移一點位置，這樣看得出是複製出來的新貼紙，而不是疊在原本那張上面
    const tangent = new THREE.Vector3(1, 0, 0).cross(this.selected.normal);
    if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, 1).cross(this.selected.normal);
    tangent.normalize().multiplyScalar(0.12);
    const newPos = this.selected.position.clone().add(tangent);
    const d = await this.place(
      this.selected.stickerId,
      target,
      this.selected.targetIndex,
      newPos,
      this.selected.normal.clone(),
      this.selected.rotation,
      this.selected.size,
      this.selected.aspect,
    );
    this.select(d);
  }

  clearAll() {
    for (const d of this.decals) {
      this.viewer.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
    }
    this.decals = [];
    this.stackCounter = 0;
    this.select(null);
  }

  serialize(): SerializedDecal[] {
    const r3 = (v: number) => Math.round(v * 1000) / 1000;
    return this.decals.map((d) => ({
      s: d.stickerId,
      t: d.targetIndex,
      p: d.position.toArray().map(r3),
      n: d.normal.toArray().map(r3),
      r: r3(d.rotation),
      w: r3(d.size),
      a: r3(d.aspect),
    }));
  }

  async restore(data: SerializedDecal[]) {
    this.clearAll();
    const model = this.getModel();
    if (!model) return;
    for (const item of data) {
      const target = model.paintableMeshes[item.t];
      if (!target) continue;
      await this.place(
        item.s,
        target,
        item.t,
        new THREE.Vector3().fromArray(item.p),
        new THREE.Vector3().fromArray(item.n),
        item.r,
        item.w,
        item.a ?? DEFAULT_ASPECT,
      );
    }
  }

  // -------------------------------------------------------------------------

  private removePreview() {
    if (!this.previewMesh) return;
    this.viewer.scene.remove(this.previewMesh);
    this.previewMesh.geometry.dispose();
    (this.previewMesh.material as THREE.Material).dispose();
    this.previewMesh = null;
  }

  private updatePointer(e: PointerEvent) {
    const rect = this.viewer.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastCar(e: PointerEvent): THREE.Intersection | null {
    const model = this.getModel();
    if (!model) return null;
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.viewer.camera);
    const hits = this.raycaster.intersectObjects(model.paintableMeshes, false);
    return hits[0] ?? null;
  }

  private raycastMesh(e: PointerEvent, mesh: THREE.Mesh): THREE.Intersection | null {
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.viewer.camera);
    const hits = this.raycaster.intersectObject(mesh, false);
    return hits[0] ?? null;
  }

  private projectToScreen(pos: THREE.Vector3): { x: number; y: number } {
    const v = pos.clone().project(this.viewer.camera);
    const rect = this.viewer.canvas.getBoundingClientRect();
    return {
      x: rect.left + (v.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (1 - (v.y * 0.5 + 0.5)) * rect.height,
    };
  }

  private updateGizmo() {
    if (!this.selected) {
      this.gizmoRotate.hidden = true;
      this.gizmoScale.hidden = true;
      return;
    }
    const c = this.projectToScreen(this.selected.position);
    this.gizmoRotate.hidden = false;
    this.gizmoScale.hidden = false;
    this.gizmoRotate.style.left = `${c.x - 14}px`;
    this.gizmoRotate.style.top = `${c.y - 54}px`;
    this.gizmoScale.style.left = `${c.x + 26}px`;
    this.gizmoScale.style.top = `${c.y + 26}px`;
  }

  private beginHandleDrag(kind: 'rotate' | 'scale', e: PointerEvent) {
    if (!this.selected) return;
    e.preventDefault();
    e.stopPropagation();
    this.handleDrag = {
      kind,
      center: this.projectToScreen(this.selected.position),
      startX: e.clientX,
      startY: e.clientY,
      startRotation: this.selected.rotation,
      startSize: this.selected.size,
    };
    this.viewer.controls.enabled = false;
    window.addEventListener('pointermove', this.onHandleMove);
    window.addEventListener('pointerup', this.onHandleUp);
  }

  private onHandleMove = (e: PointerEvent) => {
    if (!this.handleDrag || !this.selected) return;
    const { kind, center, startX, startY, startRotation, startSize } = this.handleDrag;
    if (kind === 'rotate') {
      const a0 = Math.atan2(startY - center.y, startX - center.x);
      const a1 = Math.atan2(e.clientY - center.y, e.clientX - center.x);
      this.selected.rotation = startRotation + (a1 - a0);
      this.rebuild(this.selected);
    } else {
      const d0 = Math.hypot(startX - center.x, startY - center.y) || 1;
      const d1 = Math.hypot(e.clientX - center.x, e.clientY - center.y);
      this.selected.size = Math.min(1.2, Math.max(0.15, startSize * (d1 / d0)));
      this.rebuild(this.selected);
    }
    this.onSelectionChange(this.selected); // 同步滑桿數值
  };

  private onHandleUp = () => {
    this.handleDrag = null;
    this.viewer.controls.enabled = true;
    window.removeEventListener('pointermove', this.onHandleMove);
    window.removeEventListener('pointerup', this.onHandleUp);
  };

  private onPointerDown(e: PointerEvent) {
    this.downPos = { x: e.clientX, y: e.clientY };
    if (this.placingStickerId || !this.selected) return;
    // 直接在已選取的貼紙上按下 → 進入拖曳移動模式
    if (this.raycastMesh(e, this.selected.mesh)) {
      this.draggingDecal = true;
      this.viewer.controls.enabled = false;
    }
  }

  private onPointerMove(e: PointerEvent) {
    if (this.draggingDecal && this.selected) {
      const model = this.getModel();
      const hit = this.raycastCar(e);
      if (hit && hit.face && model) {
        const normal = hit.face.normal
          .clone()
          .transformDirection(hit.object.matrixWorld)
          .normalize();
        this.selected.position.copy(hit.point);
        this.selected.normal.copy(normal);
        this.selected.targetIndex = model.paintableMeshes.indexOf(hit.object as THREE.Mesh);
        this.rebuild(this.selected);
      }
      return;
    }

    if (!this.placingStickerId) return;
    // 高面數模型上重建 DecalGeometry 成本高，預覽節流
    const now = performance.now();
    if (now - this.lastPreviewAt < 90) return;
    this.lastPreviewAt = now;
    const hit = this.raycastCar(e);
    this.removePreview();
    if (!hit || !hit.face) return;
    const normal = hit.face.normal
      .clone()
      .transformDirection(hit.object.matrixWorld)
      .normalize();
    // 半透明預覽
    void this.makeDecalMesh(
      this.placingStickerId,
      hit.object as THREE.Mesh,
      hit.point,
      normal,
      0,
      DEFAULT_SIZE,
      DEFAULT_ASPECT,
      0.55,
    ).then((mesh) => {
      if (!this.placingStickerId) return;
      this.removePreview();
      this.previewMesh = mesh;
      this.viewer.scene.add(mesh);
    });
  }

  private async onPointerUp(e: PointerEvent) {
    if (this.draggingDecal) {
      this.draggingDecal = false;
      this.viewer.controls.enabled = true;
      this.downPos = null;
      return;
    }

    // 拖曳（旋轉視角）不算點擊
    if (this.downPos) {
      const dx = e.clientX - this.downPos.x;
      const dy = e.clientY - this.downPos.y;
      this.downPos = null;
      if (Math.hypot(dx, dy) > 6) return;
    }

    if (this.placingStickerId) {
      const hit = this.raycastCar(e);
      if (!hit || !hit.face) return;
      const normal = hit.face.normal
        .clone()
        .transformDirection(hit.object.matrixWorld)
        .normalize();
      const model = this.getModel()!;
      const targetIndex = model.paintableMeshes.indexOf(hit.object as THREE.Mesh);
      const stickerId = this.placingStickerId;
      this.cancelPlacement();
      const d = await this.place(
        stickerId,
        hit.object as THREE.Mesh,
        targetIndex,
        hit.point,
        normal,
        0,
        DEFAULT_SIZE,
        DEFAULT_ASPECT,
      );
      this.select(d);
      return;
    }

    // 非擺放模式：點選既有貼紙
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.viewer.camera);
    const decalHits = this.raycaster.intersectObjects(
      this.decals.map((d) => d.mesh),
      false,
    );
    if (decalHits[0]) {
      const d = this.decals.find((x) => x.mesh === decalHits[0].object)!;
      this.select(d);
    } else {
      this.select(null);
    }
  }

  private async place(
    stickerId: string,
    target: THREE.Mesh,
    targetIndex: number,
    position: THREE.Vector3,
    normal: THREE.Vector3,
    rotation: number,
    size: number,
    aspect: number,
  ): Promise<PlacedDecal> {
    const mesh = await this.makeDecalMesh(stickerId, target, position, normal, rotation, size, aspect, 1);
    const stack = this.stackCounter++;
    mesh.renderOrder = 10 + stack;
    (mesh.material as THREE.MeshStandardMaterial).polygonOffsetFactor = -4 - stack * 0.5;
    this.viewer.scene.add(mesh);
    const d: PlacedDecal = { stickerId, targetIndex, position, normal, rotation, size, aspect, mesh };
    this.decals.push(d);
    return d;
  }

  private rebuild(d: PlacedDecal) {
    const model = this.getModel();
    const target = model?.paintableMeshes[d.targetIndex];
    if (!target) return;
    const old = d.mesh.geometry;
    d.mesh.geometry = this.buildGeometry(target, d.position, d.normal, d.rotation, d.size, d.aspect);
    old.dispose();
  }

  private buildGeometry(
    target: THREE.Mesh,
    position: THREE.Vector3,
    normal: THREE.Vector3,
    rotation: number,
    size: number,
    aspect: number,
  ): DecalGeometry {
    target.updateMatrixWorld();
    this.helper.position.copy(position);
    this.helper.lookAt(position.clone().add(normal));
    this.helper.rotation.z += rotation;
    const width = size * Math.sqrt(aspect);
    const height = size / Math.sqrt(aspect);
    return new DecalGeometry(
      target,
      position,
      this.helper.rotation.clone(),
      new THREE.Vector3(width, height, Math.max(size * 0.5, 0.1)),
    );
  }

  private async makeDecalMesh(
    stickerId: string,
    target: THREE.Mesh,
    position: THREE.Vector3,
    normal: THREE.Vector3,
    rotation: number,
    size: number,
    aspect: number,
    opacity: number,
  ): Promise<THREE.Mesh> {
    const texture = await this.loadTexture(stickerId);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      opacity,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      roughness: 0.55,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(
      this.buildGeometry(target, position, normal, rotation, size, aspect),
      material,
    );
    mesh.renderOrder = 10;
    return mesh;
  }

  private async resolveTextureUrl(stickerId: string): Promise<string> {
    if (isTextSticker(stickerId)) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(buildTextStickerSvg(stickerId))}`;
    }
    if (stickerId.startsWith('upload:')) {
      // 使用者上傳的自訂貼紙圖片：整張圖（已縮圖）編碼進 stickerId 本身，
      // 跟文字貼紙同樣道理，分享連結不需要額外的伺服器就能還原
      return decodeURIComponent(stickerId.slice('upload:'.length));
    }
    const atIdx = stickerId.indexOf('@');
    if (atIdx === -1) return `stickers/${stickerId}.svg`;
    // 換色貼紙：baseId@色碼，把原始 SVG 的白色部分替換成指定顏色
    const baseId = stickerId.slice(0, atIdx);
    const color = stickerId.slice(atIdx + 1);
    const raw = await fetch(`stickers/${baseId}.svg`).then((r) => r.text());
    const recolored = raw.replace(/#ffffff/gi, `#${color}`);
    return `data:image/svg+xml;utf8,${encodeURIComponent(recolored)}`;
  }

  private loadTexture(stickerId: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(stickerId);
    if (cached) return Promise.resolve(cached);
    return this.resolveTextureUrl(stickerId).then(
      (url) =>
        new Promise<THREE.Texture>((resolve, reject) => {
          new THREE.TextureLoader().load(
            url,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.anisotropy = 8;
              this.textureCache.set(stickerId, tex);
              resolve(tex);
            },
            undefined,
            reject,
          );
        }),
    );
  }
}
