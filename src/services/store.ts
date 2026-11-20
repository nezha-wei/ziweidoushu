/**
 * 单一状态源（Single Source of Truth）。
 * 全站所有交互状态集中于此，UI 区域订阅后按需更新，避免多套竞争状态。
 * 罗盘实时旋转角度由罗盘组件内部管理（每帧变化），不进订阅状态以免抖动。
 */
import type { ApiError, BirthInput, Chart } from '../engine/types';
import { SAMPLE_INPUT } from '../engine/ziwei';

export type ViewMode = 'compass' | 'board';
export type Status = 'idle' | 'computing' | 'ready' | 'error';

export interface AppState {
  input: BirthInput;
  chart: Chart | null;
  status: Status;
  error: ApiError | null;
  isSample: boolean;
  selectedPalace: number | null;
  selectedStar: string | null;
  viewMode: ViewMode;
  activeStage: number;
  drawerOpen: boolean;
  // 罗盘可视化参数（永久可见控制区）
  showFlights: boolean;
  showSanfang: boolean;
  showGrid: boolean;
  focusDepth: boolean;
  autoRotate: boolean;
  rotateSpeed: number; // 0–2
  starScale: number; // 0.6–1.6
  glow: number; // 0–1.5
  // 全局
  soundOn: boolean;
  reducedMotion: boolean;
}

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const initial: AppState = {
  input: { ...SAMPLE_INPUT },
  chart: null,
  status: 'idle',
  error: null,
  isSample: true,
  selectedPalace: null,
  selectedStar: null,
  viewMode: 'compass',
  activeStage: 0,
  drawerOpen: false,
  showFlights: true,
  showSanfang: true,
  showGrid: true,
  focusDepth: true,
  autoRotate: !prefersReduced,
  rotateSpeed: 0.5,
  starScale: 1,
  glow: 1,
  soundOn: true,
  reducedMotion: !!prefersReduced,
};

let state: AppState = initial;
const listeners = new Set<(s: AppState) => void>();

export function getState(): AppState {
  return state;
}

export function setState(patch: Partial<AppState>): void {
  state = { ...state, ...patch };
  for (const l of listeners) l(state);
}

export function subscribe(l: (s: AppState) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}