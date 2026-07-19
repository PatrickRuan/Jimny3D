import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import type { Viewer } from './viewer';
import type { CarModel } from './model';

export interface PlacedDecal {
  stickerId: string;
  targetIndex: number; // paintableMeshes 的索引
  position: THREE.Vector3;
  normal: THREE.Vector3;
  rotation: number; // 沿法線的旋轉角
  size: number;
  mesh: THREE.Mesh;
}

export interface SerializedDecal {
  s: string;
  t: number;
  p: number[];
  n: number[];
  r: number;
  w: number;
}

const DEFAULT_SIZE = 0.45;

export class DecalManager {
  decals: PlacedDecal[] = [];
  selected: PlacedDecal | null = null;
  placingStickerId: string | null = null;

  onSelectionChange: (d: PlacedDecal | null) => void = () => {};
  onPlacingChange: (stickerId: string | null) => void = () => {};

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private helper = new THREE.Object3D();
  private previewMesh: THREE.Mesh | null = null;
  private textureCache = new Map<string, THREE.Texture>();
  private downPos: { x: number; y: number } | null = null;
  private lastPreviewAt = 0;

  private viewer: Viewer;
  private getModel: () => CarModel | null;

  constructor(viewer: Viewer, getModel: () => CarModel | null) {
    this.viewer = viewer;
    this.getModel = getModel;
    const canvas = viewer.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      this.downPos = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.cancelPlacement();
    });
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

  deleteSelected() {
    if (!this.selected) return;
    const d = this.selected;
    this.viewer.scene.remove(d.mesh);
    d.mesh.geometry.dispose();
    this.decals = this.decals.filter((x) => x !== d);
    this.select(null);
  }

  clearAll() {
    for (const d of this.decals) {
      this.viewer.scene.remove(d.mesh);
      d.mesh.geometry.dispose();
    }
    this.decals = [];
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

  private onPointerMove(e: PointerEvent) {
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
      0.55,
    ).then((mesh) => {
      if (!this.placingStickerId) return;
      this.removePreview();
      this.previewMesh = mesh;
      this.viewer.scene.add(mesh);
    });
  }

  private async onPointerUp(e: PointerEvent) {
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
  ): Promise<PlacedDecal> {
    const mesh = await this.makeDecalMesh(stickerId, target, position, normal, rotation, size, 1);
    this.viewer.scene.add(mesh);
    const d: PlacedDecal = { stickerId, targetIndex, position, normal, rotation, size, mesh };
    this.decals.push(d);
    return d;
  }

  private rebuild(d: PlacedDecal) {
    const model = this.getModel();
    const target = model?.paintableMeshes[d.targetIndex];
    if (!target) return;
    const old = d.mesh.geometry;
    d.mesh.geometry = this.buildGeometry(target, d.position, d.normal, d.rotation, d.size);
    old.dispose();
  }

  private buildGeometry(
    target: THREE.Mesh,
    position: THREE.Vector3,
    normal: THREE.Vector3,
    rotation: number,
    size: number,
  ): DecalGeometry {
    target.updateMatrixWorld();
    this.helper.position.copy(position);
    this.helper.lookAt(position.clone().add(normal));
    this.helper.rotation.z += rotation;
    return new DecalGeometry(
      target,
      position,
      this.helper.rotation.clone(),
      new THREE.Vector3(size, size, Math.max(size * 0.5, 0.1)),
    );
  }

  private async makeDecalMesh(
    stickerId: string,
    target: THREE.Mesh,
    position: THREE.Vector3,
    normal: THREE.Vector3,
    rotation: number,
    size: number,
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
      this.buildGeometry(target, position, normal, rotation, size),
      material,
    );
    mesh.renderOrder = 10;
    return mesh;
  }

  private loadTexture(stickerId: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(stickerId);
    if (cached) return Promise.resolve(cached);
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        `stickers/${stickerId}.svg`,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          this.textureCache.set(stickerId, tex);
          resolve(tex);
        },
        undefined,
        reject,
      );
    });
  }
}
