import type { SerializedDecal } from './decals';

export interface AppState {
  c: string; // paint id
  d: SerializedDecal[];
  p?: Record<string, string>; // 零件改色：partId -> 色碼
}

export function encodeStateToHash(state: AppState) {
  const json = JSON.stringify(state);
  const b64 = btoa(unescape(encodeURIComponent(json)))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
  return `#${b64}`;
}

export function decodeStateFromHash(): AppState | null {
  const hash = location.hash.slice(1);
  if (!hash) return null;
  try {
    const b64 = hash.replaceAll('-', '+').replaceAll('_', '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const state = JSON.parse(json);
    if (typeof state.c !== 'string' || !Array.isArray(state.d)) return null;
    return state as AppState;
  } catch {
    return null;
  }
}
