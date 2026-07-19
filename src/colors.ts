// 2026/7 SUZUKI Taiwan 型錄的 8 種原廠色（近似色碼，可再對照型錄微調）
export interface PaintOption {
  id: string;
  name: string;
  body: string;
  roof?: string; // 雙色車型的車頂色
}

export const PAINTS: PaintOption[] = [
  { id: 'yellow-black', name: '黃黑雙色', body: '#e6c437', roof: '#1a1a1a' },
  { id: 'ivory', name: '米黃色', body: '#e8dfc0' },
  { id: 'blue-black', name: '藍黑雙色', body: '#3b6f9e', roof: '#1a1a1a' },
  { id: 'black', name: '黑色', body: '#141414' },
  { id: 'gray', name: '灰色', body: '#79797b' },
  { id: 'white', name: '白色', body: '#f2f3f0' },
  { id: 'jungle-green', name: '軍綠色', body: '#5c6650' },
  { id: 'chiffon-ivory', name: '米色', body: '#d9cfae' },
];

export const DEFAULT_PAINT_ID = 'jungle-green';

export function getPaint(id: string): PaintOption {
  return PAINTS.find((p) => p.id === id) ?? PAINTS[0];
}
