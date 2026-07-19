// 2023 Suzuki Jimny Sierra（tonielpro520, Sketchfab）這個模型的零件對照表。
// mesh 名稱（Object_NN）是透過實際把每個 mesh 分別標成螢光色、截圖比對車身找出來的
// （不是用材質名稱猜的——這個模型很多不相干的零件共用同一份材質，材質名不可靠。
// 例如 "Carro_Roda"，字面上是葡萄牙文的「輪子」，實際卻貼在座椅椅背上；
// 輪圈輻條真正用的是車頂殼也在用的 Carro_Metal_Preto_1，兩者混在一起，
// 沒辦法只靠材質名稱乾淨切出來，必須指定明確的 mesh 名稱）。
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
  /** 依材質名稱抓（適合材質命名乾淨、沒有被不相干零件共用的情況） */
  materialNames?: string[];
  /** 依明確 mesh 名稱抓（材質被其他零件共用時，用視覺標色法逐一比對出來的） */
  meshNames?: string[];
}

// 可獨立改色的既有零件（改車功能第一步）。
export const CUSTOM_PARTS: CustomPartDef[] = [
  {
    id: 'wheels',
    label: '輪圈',
    // 四個輪圈的輻條 + 外唇框（前後各一組），用視覺標色法比對出來
    meshNames: ['Object_31', 'Object_32', 'Object_33', 'Object_34', 'Object_43', 'Object_44'],
  },
  { id: 'chrome', label: '鍍鉻飾件', materialNames: ['Carro_Cromado'] },
];
