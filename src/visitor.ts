// 訪客計數：用免費、免註冊的 Abacus API（https://jasoncameron.dev/abacus/）
// 按「年-月」分別建立計數器，所以能同時顯示本月與上月人數，完全不需要自己的後端。

const NAMESPACE = 'jimny3d-patrickruan';
const BASE = 'https://abacus.jasoncameron.dev';
const SESSION_KEY = 'jimny3d-visit-hit-month';

export interface VisitorCounts {
  current: number;
  previous: number | null;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function previousMonthKey(d: Date): string {
  return monthKey(new Date(d.getFullYear(), d.getMonth() - 1, 1));
}

async function getCount(key: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/get/${NAMESPACE}/${key}`);
    const data = await res.json();
    return typeof data.value === 'number' ? data.value : null;
  } catch {
    return null;
  }
}

async function hitCount(key: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}/hit/${NAMESPACE}/${key}`);
    const data = await res.json();
    return typeof data.value === 'number' ? data.value : null;
  } catch {
    return null;
  }
}

// 同一個瀏覽器 session 內只計一次，避免重整頁面就一直往上加
export async function trackVisit(): Promise<VisitorCounts> {
  const now = new Date();
  const curKey = monthKey(now);
  const prevKey = previousMonthKey(now);

  const alreadyHit = sessionStorage.getItem(SESSION_KEY) === curKey;
  const [current, previous] = await Promise.all([
    alreadyHit ? getCount(curKey) : hitCount(curKey),
    getCount(prevKey),
  ]);
  if (!alreadyHit && current !== null) sessionStorage.setItem(SESSION_KEY, curKey);

  return { current: current ?? 0, previous };
}
