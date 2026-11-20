/**
 * Web Audio 音效引擎（全部合成音，无外部音频资源）。
 * 每个音效都绑定可见事件：点击 / 选中 / 排盘 / 大限切换 / 导出 / 错误。
 * 默认开启，顶部导航提供全局静音开关（store.soundOn）。
 * AudioContext 在首次用户手势时惰性创建，兼容自动播放策略。
 */
import { getState } from './store';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext ?? (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** 首次手势时解锁音频上下文 */
export function unlockAudio(): void {
  const handler = () => {
    ensure();
    document.removeEventListener('pointerdown', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('pointerdown', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}

function tone(freq: number, dur: number, type: OscillatorType, delay = 0, vol = 1): void {
  if (!getState().soundOn) return;
  // 手势解锁前不创建上下文，避免自动播放策略告警；解锁后 ensure() 已就绪
  if (!ctx || ctx.state !== 'running') return;
  const c = ctx;
  if (!master) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** 轻点（按钮 / 开关） */
export function sTap(): void {
  tone(660, 0.07, 'sine', 0, 0.5);
}

/** 选中宫位 / 星曜（双音钟鸣） */
export function sSelect(): void {
  tone(523.25, 0.16, 'sine', 0, 0.6);
  tone(783.99, 0.22, 'sine', 0.07, 0.45);
}

/** 排盘完成（上行琶音） */
export function sCompute(): void {
  [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(f, 0.3, 'triangle', i * 0.09, 0.5));
}

/** 大限推进（柔和铃声） */
export function sStage(): void {
  tone(880, 0.35, 'sine', 0, 0.4);
  tone(1318.5, 0.4, 'sine', 0.05, 0.2);
}

/** 导出成功 */
export function sExport(): void {
  tone(659.25, 0.14, 'triangle', 0, 0.5);
  tone(987.77, 0.24, 'triangle', 0.1, 0.45);
}

/** 错误（低沉稳重） */
export function sError(): void {
  tone(196, 0.22, 'sawtooth', 0, 0.25);
  tone(147, 0.3, 'sawtooth', 0.08, 0.2);
}