// 2026/7 SUZUKI Taiwan 型錄原廠色 + 2 款客製色
export interface PaintMaterialProps {
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

export interface PaintOption {
  id: string;
  nameTw: string;
  nameEn: string;
  bodyCode: string;
  roofCode: string;
  bodyHex: string;
  roofHex: string;
  material: PaintMaterialProps;
  isTwoTone: boolean;
  category: 'factory' | 'custom';
}

export const PAINTS: PaintOption[] = [
  // === 原廠 2026 台灣常態色 ===
  {
    id: 'kinetic_yellow_black',
    nameTw: '螢光黃/黑頂',
    nameEn: 'Kinetic Yellow / Bluish Black Pearl',
    bodyCode: 'ZZB (DG5)',
    roofCode: 'ZJ3',
    bodyHex: '#C7E74C',
    roofHex: '#0D1117',
    material: { metalness: 0.1, roughness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.05 },
    isTwoTone: true,
    category: 'factory',
  },
  {
    id: 'chiffon_ivory_black',
    nameTw: '象牙米/黑頂',
    nameEn: 'Chiffon Ivory Metallic / Bluish Black Pearl',
    bodyCode: 'ZVG (2BW)',
    roofCode: 'ZJ3',
    bodyHex: '#D7C49E',
    roofHex: '#0D1117',
    material: { metalness: 0.3, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.05 },
    isTwoTone: true,
    category: 'factory',
  },
  {
    id: 'brisk_blue_black',
    nameTw: '星翼藍/黑頂',
    nameEn: 'Brisk Blue Metallic / Bluish Black Pearl',
    bodyCode: 'ZWY (CZW)',
    roofCode: 'ZJ3',
    bodyHex: '#3A8EBA',
    roofHex: '#0D1117',
    material: { metalness: 0.4, roughness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.05 },
    isTwoTone: true,
    category: 'factory',
  },
  {
    id: 'bluish_black',
    nameTw: '珍珠黑',
    nameEn: 'Bluish Black Pearl 3',
    bodyCode: 'ZJ3',
    roofCode: 'ZJ3',
    bodyHex: '#0D1117',
    roofHex: '#0D1117',
    material: { metalness: 0.5, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.02 },
    isTwoTone: false,
    category: 'factory',
  },
  {
    id: 'pure_white',
    nameTw: '純潔白',
    nameEn: 'Pure White Pearl',
    bodyCode: 'ZVR',
    roofCode: 'ZVR',
    bodyHex: '#F3F4F6',
    roofHex: '#F3F4F6',
    material: { metalness: 0.1, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.1 },
    isTwoTone: false,
    category: 'factory',
  },
  {
    id: 'medium_gray',
    nameTw: '水泥灰',
    nameEn: 'Medium Gray',
    bodyCode: 'ZVL',
    roofCode: 'ZVL',
    bodyHex: '#707372',
    roofHex: '#707372',
    material: { metalness: 0.0, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.1 },
    isTwoTone: false,
    category: 'factory',
  },
  {
    id: 'jungle_green',
    nameTw: '叢林綠',
    nameEn: 'Jungle Green',
    bodyCode: 'ZZC',
    roofCode: 'ZZC',
    bodyHex: '#354531',
    roofHex: '#354531',
    material: { metalness: 0.0, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.15 },
    isTwoTone: false,
    category: 'factory',
  },
  {
    id: 'chiffon_ivory_single',
    nameTw: '象牙米',
    nameEn: 'Chiffon Ivory Metallic',
    bodyCode: 'ZVG',
    roofCode: 'ZVG',
    bodyHex: '#D7C49E',
    roofHex: '#D7C49E',
    material: { metalness: 0.3, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.05 },
    isTwoTone: false,
    category: 'factory',
  },

  // === 獨家客製改裝色 (Custom Colors) ===
  {
    id: 'niuniu_yellow_black',
    nameTw: '牛牛黃/黑頂',
    nameEn: 'NiuNiu Yellow / Bluish Black Pearl',
    bodyCode: 'CUSTOM-01',
    roofCode: 'ZJ3',
    bodyHex: '#FFCC00',
    roofHex: '#0D1117',
    material: { metalness: 0.15, roughness: 0.18, clearcoat: 1.0, clearcoatRoughness: 0.04 },
    isTwoTone: true,
    category: 'custom',
  },
  {
    id: 'twilight_cocoa_white',
    nameTw: '暮色可可/白頂',
    nameEn: 'Twilight Cocoa Pearl / Pure White',
    bodyCode: 'CUSTOM-02',
    roofCode: 'ZVR',
    bodyHex: '#5C4033',
    roofHex: '#F3F4F6',
    material: { metalness: 0.35, roughness: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.05 },
    isTwoTone: true,
    category: 'custom',
  },
];

export const DEFAULT_PAINT_ID = 'jungle_green';

export function getPaint(id: string): PaintOption {
  return PAINTS.find((p) => p.id === id) ?? PAINTS[0];
}
