'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { FS_PX, MAX_TEXT, clampZoom, elH, type BoardEl, type Viewport } from '@/lib/board/types';

type Gesture =
  | { kind: 'pan'; sx: number; sy: number; vx: number; vy: number; moved: boolean; onEmpty: boolean }
  | { kind: 'pinch'; d0: number; z0: number; wx: number; wy: number }
  | { kind: 'drag'; ids: string[]; sx: number; sy: number; orig: Map<string, { x: number; y: number }>; moved: boolean }
  | { kind: 'resize'; id: string; sx: number; sy: number; w0: number; h0: number }
  | { kind: 'band'; sx: number; sy: number };

const DBL_MS = 350;

type ItemProps = {
  el: BoardEl;
  selected: boolean;
  editing: boolean;
  editable: boolean;
  onText: (id: string, text: string) => void;
  onDone: () => void;
};

/** Один елемент; перемальовується лише тоді, коли змінився він сам (React.memo) */
const Item = memo(function Item({ el, selected, editing, editable, onText, onDone }: ItemProps) {
  const fs = FS_PX[el.fs];
  const style: React.CSSProperties = {
    transform: `translate(${el.x}px, ${el.y}px)`,
    width: el.w,
    fontSize: fs,
    zIndex: el.z,
    ...(el.t === 'note' ? { height: el.h, background: `var(--ww-note-${el.c})` } : {}),
  };
  const body = editing ? (
    <textarea
      className="ww-bel-edit"
      autoFocus
      value={el.text}
      maxLength={MAX_TEXT}
      style={{ fontSize: Math.max(16, fs) }}
      onChange={(e) => onText(el.id, e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone();
        e.stopPropagation();
      }}
      onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
    />
  ) : (
    <div className="ww-bel-text">{el.text || (editable ? '…' : '')}</div>
  );
  return (
    <div data-el={el.id} className={`ww-bel is-${el.t}${selected ? ' is-sel' : ''}`} style={style}>
      {body}
      {editable && selected && el.t === 'note' && !editing && <span data-resize="1" className="ww-bel-resize" aria-hidden="true" />}
    </div>
  );
});

export type BoardProps = {
  els: BoardEl[];
  vp: Viewport;
  onVp: (vp: Viewport) => void;
  editable: boolean;
  sel: Set<string>;
  setSel: (s: Set<string>) => void;
  editing: string | null;
  setEditing: (id: string | null) => void;
  /** commit=false — промітний рух (перетягування), true — фінал (потрапляє в історію) */
  onChange?: (next: BoardEl[], commit: boolean) => void;
  onAddAt?: (x: number, y: number) => void;
  /** плавний рух в'юпорта (учень «за викладачем») */
  smooth?: boolean;
  /** заборонити рух полем (учень, що слідує за викладачем) */
  lockView?: boolean;
  onSize?: (w: number, h: number) => void;
};

/**
 * Поле дошки: DOM, не canvas. Світ — один div з transform translate+scale; елементи — absolute з transform.
 * Лише pointer events (миша, палець, стилус): 1 вказівник — рух/перетягування, 2 — пінч-масштаб,
 * Shift+рамка — виділення, подвійний клік/тап по порожньому — новий стікер, по елементу — редагування.
 */
export function Board({ els, vp, onVp, editable, sel, setSel, editing, setEditing, onChange, onAddAt, smooth, lockView, onSize }: BoardProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const ptrs = useRef(new Map<number, { x: number; y: number }>());
  const gest = useRef<Gesture | null>(null);
  const last = useRef({ id: '', t: 0, x: 0, y: 0 });
  const live = useRef({ els, vp, sel, editing, onChange, onVp, onAddAt, setSel, setEditing, lockView, editable });
  live.current = { els, vp, sel, editing, onChange, onVp, onAddAt, setSel, setEditing, lockView, editable };
  const [band, setBand] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [panning, setPanning] = useState(false);

  const rectOf = () => stageRef.current!.getBoundingClientRect();
  const toLocal = (e: { clientX: number; clientY: number }) => {
    const r = rectOf();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const toWorld = (p: { x: number; y: number }, v: Viewport) => ({ x: (p.x - v.x) / v.zoom, y: (p.y - v.y) / v.zoom });

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !onSize) return;
    const ro = new ResizeObserver(() => onSize(el.clientWidth, el.clientHeight));
    ro.observe(el);
    onSize(el.clientWidth, el.clientHeight);
    return () => ro.disconnect();
  }, [onSize]);

  // колесо: Ctrl/⌘ (і пінч на трекпаді) — масштаб до курсора, інакше — рух полем
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const L = live.current;
      e.preventDefault();
      if (L.lockView) return;
      const r = el.getBoundingClientRect();
      const p = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey || e.metaKey) {
        const z = clampZoom(L.vp.zoom * Math.exp(-e.deltaY * 0.01));
        const w = { x: (p.x - L.vp.x) / L.vp.zoom, y: (p.y - L.vp.y) / L.vp.zoom };
        L.onVp({ zoom: z, x: p.x - w.x * z, y: p.y - w.y * z });
      } else L.onVp({ ...L.vp, x: L.vp.x - e.deltaX, y: L.vp.y - e.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const startPan = (p: { x: number; y: number }, onEmpty: boolean) => {
    gest.current = { kind: 'pan', sx: p.x, sy: p.y, vx: live.current.vp.x, vy: live.current.vp.y, moved: false, onEmpty };
  };

  const down = (e: React.PointerEvent) => {
    const L = live.current;
    const target = e.target as HTMLElement;
    if (target.tagName === 'TEXTAREA') return;
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
    stageRef.current!.setPointerCapture(e.pointerId);
    const p = toLocal(e);
    ptrs.current.set(e.pointerId, p);

    if (ptrs.current.size === 2) {
      if (L.lockView) return;
      const [a, b] = [...ptrs.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const w = toWorld(mid, L.vp);
      gest.current = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: L.vp.zoom, wx: w.x, wy: w.y };
      return;
    }
    if (ptrs.current.size > 2) return;

    const elNode = target.closest('[data-el]') as HTMLElement | null;
    const id = elNode?.dataset.el ?? null;
    const now = Date.now();
    const world = toWorld(p, L.vp);

    // подвійний клік/тап
    const lt = last.current;
    const isDbl = now - lt.t < DBL_MS && Math.hypot(lt.x - p.x, lt.y - p.y) < 24 && lt.id === (id ?? '');
    last.current = { id: id ?? '', t: now, x: p.x, y: p.y };
    if (isDbl && L.editable) {
      last.current.t = 0;
      if (id) {
        L.setSel(new Set([id]));
        L.setEditing(id);
      } else L.onAddAt?.(world.x, world.y);
      return;
    }

    if (target.dataset.resize && id && L.editable) {
      const el = L.els.find((x) => x.id === id);
      if (el && el.t === 'note') gest.current = { kind: 'resize', id, sx: p.x, sy: p.y, w0: el.w, h0: el.h };
      return;
    }
    if (id && L.editable) {
      let ids: string[];
      if (e.shiftKey) {
        const n = new Set(L.sel);
        if (n.has(id)) n.delete(id);
        else n.add(id);
        L.setSel(n);
        ids = [...n];
      } else if (L.sel.has(id)) ids = [...L.sel];
      else {
        L.setSel(new Set([id]));
        ids = [id];
      }
      if (L.editing && L.editing !== id) L.setEditing(null);
      const orig = new Map(L.els.filter((x) => ids.includes(x.id)).map((x) => [x.id, { x: x.x, y: x.y }]));
      gest.current = { kind: 'drag', ids, sx: p.x, sy: p.y, orig, moved: false };
      return;
    }
    if (!id && L.editable && e.shiftKey) {
      gest.current = { kind: 'band', sx: p.x, sy: p.y };
      return;
    }
    if (L.editing) L.setEditing(null);
    if (L.lockView) return;
    startPan(p, !id);
    setPanning(true);
  };

  const move = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const L = live.current;
    const p = toLocal(e);
    ptrs.current.set(e.pointerId, p);
    const g = gest.current;
    if (!g) return;
    if (g.kind === 'pinch') {
      if (ptrs.current.size < 2) return;
      const [a, b] = [...ptrs.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const z = clampZoom((g.z0 * (Math.hypot(a.x - b.x, a.y - b.y) || 1)) / g.d0);
      L.onVp({ zoom: z, x: mid.x - g.wx * z, y: mid.y - g.wy * z });
    } else if (g.kind === 'pan') {
      const dx = p.x - g.sx;
      const dy = p.y - g.sy;
      if (!g.moved && Math.hypot(dx, dy) > 4) g.moved = true;
      if (g.moved) L.onVp({ ...L.vp, x: g.vx + dx, y: g.vy + dy });
    } else if (g.kind === 'drag') {
      const dx = (p.x - g.sx) / L.vp.zoom;
      const dy = (p.y - g.sy) / L.vp.zoom;
      if (!g.moved && Math.hypot(dx, dy) * L.vp.zoom < 4) return;
      g.moved = true;
      L.onChange?.(
        L.els.map((x) => {
          const o = g.orig.get(x.id);
          return o ? { ...x, x: Math.round(o.x + dx), y: Math.round(o.y + dy) } : x;
        }),
        false
      );
    } else if (g.kind === 'resize') {
      const dx = (p.x - g.sx) / L.vp.zoom;
      const dy = (p.y - g.sy) / L.vp.zoom;
      L.onChange?.(
        L.els.map((x) => (x.id === g.id && x.t === 'note' ? { ...x, w: Math.max(100, Math.round(g.w0 + dx)), h: Math.max(70, Math.round(g.h0 + dy)) } : x)),
        false
      );
    } else if (g.kind === 'band') {
      setBand({ x: Math.min(g.sx, p.x), y: Math.min(g.sy, p.y), w: Math.abs(p.x - g.sx), h: Math.abs(p.y - g.sy) });
    }
  };

  const up = (e: React.PointerEvent) => {
    if (!ptrs.current.has(e.pointerId)) return;
    const L = live.current;
    ptrs.current.delete(e.pointerId);
    const g = gest.current;
    if (g?.kind === 'drag') {
      if (g.moved) L.onChange?.(L.els, true);
    } else if (g?.kind === 'resize') L.onChange?.(L.els, true);
    else if (g?.kind === 'band' && band) {
      const a = toWorld({ x: band.x, y: band.y }, L.vp);
      const b = toWorld({ x: band.x + band.w, y: band.y + band.h }, L.vp);
      L.setSel(new Set(L.els.filter((x) => x.x < b.x && x.x + x.w > a.x && x.y < b.y && x.y + elH(x) > a.y).map((x) => x.id)));
    } else if (g?.kind === 'pan' && !g.moved && g.onEmpty && !e.shiftKey) L.setSel(new Set());
    setBand(null);
    if (g?.kind === 'pinch' && ptrs.current.size === 1) {
      // один палець лишився — продовжуємо рух полем без стрибка
      const [p] = [...ptrs.current.values()];
      startPan(p, false);
      return;
    }
    if (ptrs.current.size === 0) {
      gest.current = null;
      setPanning(false);
    }
  };

  const onText = useCallback((id: string, text: string) => {
    const L = live.current;
    L.onChange?.(L.els.map((x) => (x.id === id ? { ...x, text } : x)), false);
  }, []);
  const onDone = useCallback(() => {
    const L = live.current;
    L.setEditing(null);
    L.onChange?.(L.els, true);
  }, []);

  const sorted = [...els].sort((a, b) => a.z - b.z);
  return (
    <div
      ref={stageRef}
      className={`ww-board-stage${panning ? ' is-panning' : ''}${editable ? ' is-editable' : ''}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      data-testid="board-stage"
    >
      <div
        className={`ww-board-world${smooth && !panning ? ' is-smooth' : ''}`}
        style={{ transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})` }}
      >
        {sorted.map((el) => (
          <Item key={el.id} el={el} selected={sel.has(el.id)} editing={editing === el.id} editable={editable} onText={onText} onDone={onDone} />
        ))}
      </div>
      {band && <div className="ww-board-band" style={{ left: band.x, top: band.y, width: band.w, height: band.h }} />}
    </div>
  );
}
