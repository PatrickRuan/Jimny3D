import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { PaintOption } from './colors';

export interface CarModel {
  root: THREE.Group;
  bodyMaterials: THREE.MeshStandardMaterial[];
  roofMaterials: THREE.MeshStandardMaterial[];
  /** 貼紙 raycast 的目標（車身外板） */
  paintableMeshes: THREE.Mesh[];
  isPlaceholder: boolean;
}

const MODEL_URL = 'models/jimny.glb';

export async function loadCarModel(scene: THREE.Scene): Promise<CarModel> {
  try {
    const model = await loadGltf();
    scene.add(model.root);
    return model;
  } catch {
    console.info('[Jimny3D] 找不到 public/models/jimny.glb，使用內建佔位模型。');
    const model = buildPlaceholder();
    scene.add(model.root);
    return model;
  }
}

async function loadGltf(): Promise<CarModel> {
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);

  const gltf = await loader.loadAsync(MODEL_URL);
  const root = new THREE.Group();
  root.add(gltf.scene);

  // 正規化尺寸與位置：車長對齊 3.5m，貼齊地面置中
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const size = box.getSize(new THREE.Vector3());
  const scale = 3.5 / Math.max(size.x, size.z);
  gltf.scene.scale.setScalar(scale);
  const box2 = new THREE.Box3().setFromObject(gltf.scene);
  const center = box2.getCenter(new THREE.Vector3());
  gltf.scene.position.sub(new THREE.Vector3(center.x, box2.min.y, center.z));

  const bodyMaterials: THREE.MeshStandardMaterial[] = [];
  const roofMaterials: THREE.MeshStandardMaterial[] = [];
  const paintableMeshes: THREE.Mesh[] = [];
  const meshInfo: { mesh: string; material: string }[] = [];

  // pintura/carroceria = 葡文車漆/車身（Sketchfab 上不少車模用葡文命名）
  const bodyRe = /pintura|body|carroceria|paint|shell|exterior|车身|hood|door|fender/i;
  const roofRe = /roof|teto|top(?!olog)/i;
  const excludeRe = /glass|window|vidro|tire|tyre|pneu|wheel|roda|light|lamp|farol|lanterna|interior|interno|seat|chrome|cromado|mirror|espelho|grille|bumper|plate|refle/i;

  gltf.scene.updateMatrixWorld(true);

  const paintMeshes: THREE.Mesh[] = [];
  gltf.scene.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    mesh.castShadow = true;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) meshInfo.push({ mesh: mesh.name, material: mat.name });

    const label = `${mesh.name} ${mats.map((m) => m.name).join(' ')}`;
    if (excludeRe.test(label)) return;
    const isRoof = roofRe.test(label);
    const isBody = bodyRe.test(label);
    if (!isRoof && !isBody) return;

    if (isRoof) {
      const cloned = mats.map((m) => (m as THREE.MeshStandardMaterial).clone());
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
      roofMaterials.push(...cloned);
      paintableMeshes.push(mesh);
    } else {
      paintMeshes.push(mesh);
    }
  });

  if (paintMeshes.length > 0) {
    // 車頂沒有獨立分件時：依世界座標高度把漆面三角形切成車身/車頂兩組，
    // 讓雙色車型（黑車頂）能運作
    const srcMat = (
      Array.isArray(paintMeshes[0].material)
        ? paintMeshes[0].material[0]
        : paintMeshes[0].material
    ) as THREE.MeshStandardMaterial;
    const bodyMat = srcMat.clone();
    const roofMat = srcMat.clone();
    bodyMaterials.push(bodyMat);
    if (roofMaterials.length === 0) roofMaterials.push(roofMat);

    const bbox = new THREE.Box3();
    for (const mesh of paintMeshes) bbox.expandByObject(mesh);
    const roofY = bbox.min.y + (bbox.max.y - bbox.min.y) * 0.9;

    for (const mesh of paintMeshes) {
      splitMeshByHeight(mesh, roofY, bodyMat, roofMat);
      paintableMeshes.push(mesh);
    }

    // 有些模型（如此 Sierra 模型）的車頂外皮做在獨立的塑料材質上：
    // 用幾何特徵（大面積 + 到達車頂高度）找出來，車頂線以上的三角形一起納入車頂色
    const carBox = new THREE.Box3().setFromObject(gltf.scene);
    const carW = carBox.max.x - carBox.min.x;
    const carL = carBox.max.z - carBox.min.z;
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || paintableMeshes.includes(mesh)) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (excludeRe.test(`${mesh.name} ${mats.map((m) => m.name).join(' ')}`)) return;
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
      // 以車頂線為基準（不用全車最高點——天線/行李架會把它拉高）
      const nearTop = bb.max.y > roofY + 0.03;
      const wide = bb.max.x - bb.min.x > carW * 0.55;
      const long = bb.max.z - bb.min.z > carL * 0.4;
      if (!nearTop || !wide || !long) return;
      const keepMat = mats[0] as THREE.MeshStandardMaterial;
      const roofPanelMat = keepMat.clone();
      splitMeshByHeight(mesh, roofY, keepMat, roofPanelMat);
      roofMaterials.push(roofPanelMat);
      paintableMeshes.push(mesh);
    });
  }

  // 協助調整分類規則：在 console 列出模型結構
  console.info('[Jimny3D] glTF mesh 結構：');
  console.table(meshInfo);

  if (bodyMaterials.length === 0) {
    // 找不到符合命名的車身 → 退而求其次，把最大的 mesh 當車身
    let biggest: THREE.Mesh | null = null;
    let maxCount = 0;
    gltf.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const count = mesh.geometry.getAttribute('position')?.count ?? 0;
      if (count > maxCount) {
        maxCount = count;
        biggest = mesh;
      }
    });
    if (biggest) {
      const b = biggest as THREE.Mesh;
      const mats = (Array.isArray(b.material) ? b.material : [b.material]).map(
        (m) => (m as THREE.MeshStandardMaterial).clone(),
      );
      b.material = Array.isArray(b.material) ? mats : mats[0];
      bodyMaterials.push(...mats);
      paintableMeshes.push(b);
      console.warn('[Jimny3D] 未匹配到車身命名，改用最大 mesh：', b.name);
    }
  }

  return { root, bodyMaterials, roofMaterials, paintableMeshes, isPlaceholder: false };
}

// 依三角形重心的世界高度，把 mesh 的 index 重排成「車身 / 車頂」兩個 group，
// 指派各自的材質，讓沒有分件的模型也能做雙色
function splitMeshByHeight(
  mesh: THREE.Mesh,
  worldY: number,
  bodyMat: THREE.Material,
  roofMat: THREE.Material,
) {
  const geo = mesh.geometry;
  const pos = geo.getAttribute('position');
  if (!geo.getIndex()) {
    geo.setIndex([...Array(pos.count).keys()]);
  }
  const index = geo.getIndex()!;
  const body: number[] = [];
  const roof: number[] = [];
  const v = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    let cy = 0;
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(pos, index.getX(i + k)).applyMatrix4(mesh.matrixWorld);
      cy += v.y;
    }
    const tri = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    (cy / 3 > worldY ? roof : body).push(...tri);
  }
  geo.setIndex([...body, ...roof]);
  geo.clearGroups();
  geo.addGroup(0, body.length, 0);
  geo.addGroup(body.length, roof.length, 1);
  mesh.material = [bodyMat, roofMat];
}

export function applyPaint(model: CarModel, paint: PaintOption) {
  for (const mat of model.bodyMaterials) mat.color.set(paint.body);
  const roofColor = paint.roof ?? paint.body;
  for (const mat of model.roofMaterials) mat.color.set(roofColor);
}

// ---------------------------------------------------------------------------
// 佔位模型：方塊風格 JB74，車身與車頂分件，供在取得正式模型前完整測試功能
// ---------------------------------------------------------------------------

function buildPlaceholder(): CarModel {
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: '#5c6650',
    metalness: 0.4,
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  });
  const roofMat = bodyMat.clone();
  const darkMat = new THREE.MeshStandardMaterial({ color: '#17181a', roughness: 0.7 });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0e1418',
    metalness: 0,
    roughness: 0.05,
    envMapIntensity: 1.2,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: '#3a3d40', metalness: 0.8, roughness: 0.35 });

  const paintableMeshes: THREE.Mesh[] = [];

  const add = (
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: [number, number, number],
    opts: { name?: string; paintable?: boolean; rot?: [number, number, number] } = {},
  ) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    if (opts.rot) mesh.rotation.set(...opts.rot);
    if (opts.name) mesh.name = opts.name;
    mesh.castShadow = true;
    if (opts.paintable) paintableMeshes.push(mesh);
    root.add(mesh);
    return mesh;
  };

  // 車身主體（含引擎蓋）
  add(new RoundedBoxGeometry(3.2, 0.72, 1.62, 4, 0.06), bodyMat, [0, 0.81, 0], {
    name: 'body',
    paintable: true,
  });
  // 車艙玻璃帶
  add(new THREE.BoxGeometry(1.95, 0.44, 1.5), glassMat, [-0.52, 1.36, 0]);
  // 車頂（獨立分件 → 雙色）
  add(new RoundedBoxGeometry(2.02, 0.1, 1.6, 3, 0.03), roofMat, [-0.52, 1.62, 0], {
    name: 'roof',
    paintable: true,
  });
  // 四根車柱（車身色）
  for (const x of [0.42, -1.46]) {
    for (const z of [0.72, -0.72]) {
      add(new THREE.BoxGeometry(0.1, 0.46, 0.14), bodyMat, [x, 1.36, z], {
        name: 'pillar',
        paintable: true,
      });
    }
  }
  // 前後保險桿
  add(new RoundedBoxGeometry(0.28, 0.26, 1.66, 2, 0.04), darkMat, [1.6, 0.5, 0]);
  add(new RoundedBoxGeometry(0.24, 0.26, 1.66, 2, 0.04), darkMat, [-1.6, 0.5, 0]);
  // 水箱護罩
  add(new THREE.BoxGeometry(0.06, 0.3, 0.9), darkMat, [1.6, 0.98, 0]);
  // 圓形頭燈
  const lightMat = new THREE.MeshStandardMaterial({
    color: '#e8ecef',
    emissive: '#aab4bb',
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });
  for (const z of [0.55, -0.55]) {
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 24), lightMat, [1.61, 0.98, z], {
      rot: [0, 0, Math.PI / 2],
    });
  }
  // 車輪 + 背掛備胎
  const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 28);
  const rimGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.27, 20);
  for (const x of [1.05, -1.05]) {
    for (const z of [0.76, -0.76]) {
      add(tireGeo, tireMat, [x, 0.36, z], { rot: [Math.PI / 2, 0, 0] });
      add(rimGeo, rimMat, [x, 0.36, z], { rot: [Math.PI / 2, 0, 0] });
    }
  }
  add(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 28), tireMat, [-1.73, 0.85, 0], {
    rot: [0, 0, Math.PI / 2],
  });

  return {
    root,
    bodyMaterials: [bodyMat],
    roofMaterials: [roofMat],
    paintableMeshes,
    isPlaceholder: true,
  };
}
