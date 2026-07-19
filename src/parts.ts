// 2023 Suzuki Jimny Sierra（tonielpro520, Sketchfab）這個模型的零件對照表。
// mesh 名稱（Object_NN）是透過實際把每個 mesh 分別標成螢光色、截圖比對車身找出來的
// （不是用材質名稱猜的——這個模型很多不相干的零件共用同一份材質，材質名不可靠）。
// 如果換成別的 glTF 模型，這份表需要重新對照（見 README「替換 3D 模型」章節）。

/**
 * 車頂殼的三個 mesh：前緣、頂蓋、後緣。
 * 這是唯一真正「整片都是車頂」的部分——car body 材質（Carro_Pintura）完全不包含車頂，
 * 車頂是獨立的塑料材質（Carro_Metal_Preto_1）做的另一個殼件，兩者中間有清楚的零件邊界，
 * 所以車頂可以整塊上色，不需要用高度去猜切割線。
 */
export const ROOF_SHELL_MESH_NAMES = ['Object_24', 'Object_26', 'Object_35'];

/** 上漆用的車身材質名稱：這個材質底下的 mesh 全部都是車身鈑件，完全不含車頂 */
export const BODY_PAINT_MATERIAL_NAME = 'Carro_Pintura';

export interface CustomPartDef {
  id: string;
  label: string;
  /** 這個零件對應的原始材質名稱（同一材質底下所有 mesh 一起換色） */
  materialNames: string[];
}

// 可獨立改色的既有零件（改車功能第一步）。
// 只挑選材質名稱在整台車裡「語意單純、不會跟其他功能衝突」的部件：
// 不選車窗框/飾條（Carro_Plastico、Carro_Metal_Preto）——那些材質同時被很多不同位置的零件共用，
// 沒辦法只靠材質名稱乾淨地切出「這是門把」或「這是輪拱」，需要更進一步的手動零件切割才能做，先不做。
export const CUSTOM_PARTS: CustomPartDef[] = [
  { id: 'wheels', label: '輪圈', materialNames: ['Carro_Roda'] },
  { id: 'mirrors', label: '後視鏡蓋', materialNames: ['Carro_Espelhos'] },
  { id: 'calipers', label: '煞車卡鉗', materialNames: ['Carro_Freio'] },
  { id: 'chrome', label: '鍍鉻飾件', materialNames: ['Carro_Cromado'] },
];
