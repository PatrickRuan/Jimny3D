// 2023 Suzuki Jimny Sierra（tonielpro520, Sketchfab）這個模型的零件對照表。
// 這台模型的鈑件/飾件材質大量被不相干的零件共用（同一份 "Carro_Metal_Preto_1"
// 材質同時是車頂殼、輪圈輻條、保桿飾條……），沒辦法只靠材質名稱或 mesh 名稱切乾淨，
// 所以車頂用「明確 mesh 名稱」，輪圈/銘牌則用「世界座標範圍遮罩」——
// 不管幾何被切成幾個破碎的 mesh，只要三角形落在指定的空間範圍內就上色，範圍外維持原色。
// 座標是透過在瀏覽器 console 逐一標色、比對截圖位置量出來的。
// 如果換成別的 glTF 模型，這份表需要重新對照（見 README「替換 3D 模型」章節）。

/**
 * 車頂殼的三個 mesh：前緣、頂蓋、後緣。
 * car body 材質（Carro_Pintura）完全不含車頂，車頂是獨立的塑料材質
 * （跟輪圈共用的 Carro_Metal_Preto_1）做的另一個殼件，兩者有清楚的零件邊界。
 */
export const ROOF_SHELL_MESH_NAMES = ['Object_24', 'Object_26', 'Object_35'];

/** 上漆用的車身材質名稱：這個材質底下的 mesh 全部都是車身鈑件，完全不含車頂 */
export const BODY_PAINT_MATERIAL_NAME = 'Carro_Pintura';

/** 車窗玻璃材質（可以貼貼紙，但不能換色/上漆） */
export const WINDOW_MATERIAL_NAMES = ['Carro_Vidros'];

export interface MaskRegion {
  /** 中心世界座標 */
  cx: number;
  cy: number;
  cz: number;
  /** 各軸半徑（橢球判定：((x-cx)/rx)²+((y-cy)/ry)²+((z-cz)/rz)² < 1 視為命中） */
  rx: number;
  ry: number;
  rz: number;
}

export interface MaskedPartDef {
  id: string;
  label: string;
  /** 這個零件的可見部分實際用的材質名稱（遮罩只在這個材質範圍內生效） */
  materialNames: string[];
  regions: MaskRegion[];
}

// 4 個輪圈（輻條+外唇框）的世界座標範圍
export const WHEEL_MASK: MaskedPartDef = {
  id: 'wheels',
  label: '輪圈',
  materialNames: ['Carro_Metal_Preto_1'],
  regions: [
    { cx: -0.7, cy: 0.37, cz: 1.12, rx: 0.36, ry: 0.3, rz: 0.36 },
    { cx: 0.7, cy: 0.37, cz: 1.12, rx: 0.36, ry: 0.3, rz: 0.36 },
    { cx: -0.7, cy: 0.37, cz: -1.03, rx: 0.36, ry: 0.3, rz: 0.36 },
    { cx: 0.7, cy: 0.37, cz: -1.03, rx: 0.36, ry: 0.3, rz: 0.36 },
  ],
};

// 鍍鉻銘牌：前 Suzuki 廠徽 + 左右車尾 SUZUKI 字樣。
// 這個模型的尾門被備胎擋住、也沒找到獨立的 JIMNY 字樣幾何（可能沒建模或烤進貼圖），
// 所以目前只做得到這三處。
export const BADGE_MASK: MaskedPartDef = {
  id: 'chrome',
  label: '鍍鉻銘牌',
  materialNames: ['Carro_Cromado'],
  regions: [
    { cx: 0, cy: 0.85, cz: 1.65, rx: 0.22, ry: 0.18, rz: 0.15 },
    { cx: 0.45, cy: 0.74, cz: -1.51, rx: 0.14, ry: 0.06, rz: 0.08 },
    { cx: -0.45, cy: 0.74, cz: -1.51, rx: 0.14, ry: 0.06, rz: 0.08 },
  ],
};

export const MASKED_PARTS: MaskedPartDef[] = [WHEEL_MASK, BADGE_MASK];
