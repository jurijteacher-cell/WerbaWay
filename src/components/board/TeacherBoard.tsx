'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/i18n/client';
import { Switch } from '@/components/ui/Switch';
import { Toolbar, type ToolbarItem } from '@/components/ui/Toolbar';
import { sendDock } from '@/lib/board/dock-send';
import {
  FS_PX,
  HISTORY,
  MAX_ELS,
  NOTE_COLORS,
  diffOps,
  fitViewport,
  newId,
  type BoardEl,
  type BoardMsg,
  type FontSize,
  type NoteColor,
  type Viewport,
} from '@/lib/board/types';
import type { ChatRow } from '@/lib/dock/protocol';
import { Board } from './Board';
import { useBoardChannel } from './BoardChannel';

export type ViewerInfo = { id: string; name: string };
type Viewer = ViewerInfo & { addedAt: string };

const COLOR_LABEL: Record<NoteColor, string> = { violet: 'Бузковий', sky: 'Блакитний', pink: 'Рожевий', mint: 'М’ятний', lemon: 'Лимонний' };
const SIZES: FontSize[] = ['S', 'M', 'L', 'XL'];

export function TeacherBoard({
  initial,
  students,
  viewers: v0,
  addId,
}: {
  initial: { els: BoardEl[]; vp: Viewport | null; follow: boolean; rev: number };
  students: ViewerInfo[];
  viewers: Viewer[];
  addId?: string;
}) {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const [els, setEls] = useState<BoardEl[]>(initial.els);
  const [vp, setVpState] = useState<Viewport>(initial.vp ?? { x: 40, y: 40, zoom: 1 });
  const [follow, setFollowState] = useState(initial.follow);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [color, setColor] = useState<NoteColor>('violet');
  const [viewers, setViewers] = useState<Viewer[]>(v0);
  const [panel, setPanel] = useState(false);
  const [q, setQ] = useState('');
  const [conflict, setConflict] = useState(false);
  const [limitHint, setLimitHint] = useState(false);
  const [, bump] = useState(0);

  const elsRef = useRef(initial.els);
  const vpRef = useRef(vp);
  const followRef = useRef(follow);
  const rev = useRef(initial.rev);
  const sent = useRef(initial.els);
  const committed = useRef(initial.els);
  const hist = useRef<BoardEl[][]>([]);
  const fut = useRef<BoardEl[][]>([]);
  const size = useRef({ w: 0, h: 0 });
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const peersRef = useRef(0);

  const { link, peers, send } = useBoardChannel({ enabled: true, presence: null, onMessage: () => undefined });
  peersRef.current = peers.length;
  const sendRef = useRef(send);
  sendRef.current = send;

  /* ── збереження ── */
  const body = () => ({ els: elsRef.current, vp: vpRef.current, follow: followRef.current, rev: rev.current });
  const saveNow = useCallback(async () => {
    saveTimer.current = null;
    const b = body();
    const { data, error } = await supabase
      .from('teacher_board')
      .update({ ...b, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .lte('rev', b.rev)
      .select('rev');
    if (!error && !data?.length) setConflict(true);
    else if (!error) dirty.current = false;
  }, [supabase]);
  const scheduleSave = useCallback(() => {
    dirty.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void saveNow(), 800);
  }, [saveNow]);

  // закриття вкладки / перехід у фон: останні зміни не губимо (fetch keepalive)
  useEffect(() => {
    const beacon = () => {
      if (!dirty.current && !flushTimer.current) return;
      flush();
      try {
        void fetch('/api/board', { method: 'PUT', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body()) });
      } catch {
        /* нічого не вдієш */
      }
    };
    const onVis = () => document.visibilityState === 'hidden' && beacon();
    window.addEventListener('pagehide', beacon);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', beacon);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── зміни → глядачам ── */
  const flush = useCallback(() => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = null;
    const ops = diffOps(sent.current, elsRef.current);
    if (!ops.length) return;
    sent.current = elsRef.current;
    rev.current += 1;
    if (peersRef.current) void sendRef.current({ k: 'bd-ops', rev: rev.current, ops });
    scheduleSave();
  }, [scheduleSave]);

  const change = useCallback(
    (next: BoardEl[], commit: boolean) => {
      elsRef.current = next;
      setEls(next);
      if (commit) {
        if (committed.current !== next) {
          hist.current.push(committed.current);
          if (hist.current.length > HISTORY) hist.current.shift();
          fut.current = [];
          committed.current = next;
          bump((n) => n + 1);
        }
        flush();
      } else if (!flushTimer.current) flushTimer.current = setTimeout(flush, 100);
    },
    [flush]
  );

  const undo = useCallback(() => {
    const prev = hist.current.pop();
    if (!prev) return;
    fut.current.push(elsRef.current);
    committed.current = prev;
    elsRef.current = prev;
    setEls(prev);
    setSel(new Set());
    setEditing(null);
    flush();
    bump((n) => n + 1);
  }, [flush]);
  const redo = useCallback(() => {
    const next = fut.current.pop();
    if (!next) return;
    hist.current.push(elsRef.current);
    committed.current = next;
    elsRef.current = next;
    setEls(next);
    setSel(new Set());
    setEditing(null);
    flush();
    bump((n) => n + 1);
  }, [flush]);

  /* ── в'юпорт ── */
  const onVp = useCallback(
    (v: Viewport) => {
      vpRef.current = v;
      setVpState(v);
      if (followRef.current && !vpTimer.current)
        vpTimer.current = setTimeout(() => {
          vpTimer.current = null;
          if (peersRef.current) void sendRef.current({ k: 'bd-vp', vp: vpRef.current });
        }, 100);
      scheduleSave();
    },
    [scheduleSave]
  );
  const setFollow = (v: boolean) => {
    followRef.current = v;
    setFollowState(v);
    void send({ k: 'bd-follow', follow: v });
    if (v) void send({ k: 'bd-vp', vp: vpRef.current });
    scheduleSave();
  };
  const fit = () => onVp(fitViewport(elsRef.current, size.current.w, size.current.h));
  const onSize = useCallback((w: number, h: number) => {
    size.current = { w, h };
  }, []);

  // новий глядач підключився → пишемо поточний стан у БД одразу (він читає знімок звідти)
  useEffect(() => {
    if (peers.length) {
      flush();
      void saveNow();
      if (followRef.current) void sendRef.current({ k: 'bd-vp', vp: vpRef.current });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peers.length]);

  /* ── додати елементи ── */
  const maxZ = () => elsRef.current.reduce((m, e) => Math.max(m, e.z), 0);
  const centerWorld = () => {
    const v = vpRef.current;
    return { x: (size.current.w / 2 - v.x) / v.zoom, y: (size.current.h / 2 - v.y) / v.zoom };
  };
  const canAdd = () => {
    if (elsRef.current.length >= MAX_ELS) {
      setLimitHint(true);
      return false;
    }
    setLimitHint(false);
    return true;
  };
  const addNote = useCallback(
    (wx?: number, wy?: number) => {
      if (!canAdd()) return;
      const c = wx === undefined ? centerWorld() : { x: wx, y: wy! };
      const el: BoardEl = { id: newId(), t: 'note', x: Math.round(c.x - 90), y: Math.round(c.y - 65), w: 180, h: 130, c: color, text: '', fs: 'M', z: maxZ() + 1 };
      change([...elsRef.current, el], true);
      setSel(new Set([el.id]));
      setEditing(el.id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [change, color]
  );
  const addText = () => {
    if (!canAdd()) return;
    const c = centerWorld();
    const el: BoardEl = { id: newId(), t: 'text', x: Math.round(c.x - 120), y: Math.round(c.y - 20), w: 240, text: '', fs: 'L', z: maxZ() + 1 };
    change([...elsRef.current, el], true);
    setSel(new Set([el.id]));
    setEditing(el.id);
  };
  const selEls = () => elsRef.current.filter((e) => sel.has(e.id));
  const remove = useCallback(() => {
    if (!sel.size) return;
    change(elsRef.current.filter((e) => !sel.has(e.id)), true);
    setSel(new Set());
  }, [sel, change]);
  const duplicate = useCallback(() => {
    const src = elsRef.current.filter((e) => sel.has(e.id));
    if (!src.length || elsRef.current.length + src.length > MAX_ELS) return setLimitHint(true);
    let z = maxZ();
    const copies = src.map((e) => ({ ...e, id: newId(), x: e.x + 24, y: e.y + 24, z: ++z }) as BoardEl);
    change([...elsRef.current, ...copies], true);
    setSel(new Set(copies.map((c) => c.id)));
  }, [sel, change]);
  const recolor = (c: NoteColor) => {
    setColor(c);
    if (sel.size) change(elsRef.current.map((e) => (sel.has(e.id) && e.t === 'note' ? { ...e, c } : e)), true);
  };
  const cycleSize = () => {
    const first = selEls()[0];
    if (!first) return;
    const next = SIZES[(SIZES.indexOf(first.fs) + 1) % SIZES.length];
    change(elsRef.current.map((e) => (sel.has(e.id) ? { ...e, fs: next } : e)), true);
  };
  const clearAll = () => {
    if (!elsRef.current.length || !window.confirm(t('Стерти всю дошку? Це не можна відновити'))) return;
    hist.current = [];
    fut.current = [];
    committed.current = [];
    change([], true);
    setSel(new Set());
    bump((n) => n + 1);
  };

  /* ── клавіатура ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (editing || tag === 'INPUT' || tag === 'TEXTAREA') return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicate();
      } else if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'Escape') {
        setSel(new Set());
        setPanel(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing, remove, duplicate, undo, redo]);

  /* ── глядачі ── */
  const addViewer = useCallback(
    async (s: ViewerInfo) => {
      const { error } = await supabase.from('board_viewers').upsert({ student_id: s.id });
      if (error) return;
      setViewers((p) => (p.some((v) => v.id === s.id) ? p : [...p, { ...s, addedAt: new Date().toISOString() }]));
      const { data: me } = await supabase.auth.getUser();
      let chat: ChatRow | null = null;
      if (me.user) {
        const { data } = await supabase
          .from('class_messages')
          .insert({ student_id: s.id, sender_id: me.user.id, sender_role: 'teacher', kind: 'board', body: t('Викладач відкрив вам дошку'), meta: { action: 'open' } })
          .select()
          .single();
        chat = (data as ChatRow | null) ?? null;
      }
      await sendDock(supabase, s.id, [{ k: 'bd-invite' }, ...(chat ? [{ k: 'chat' as const, m: chat }] : [])]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase]
  );
  const removeViewer = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('board_viewers').delete().eq('student_id', id);
      if (error) return;
      setViewers((p) => p.filter((v) => v.id !== id));
      void sendRef.current({ k: 'bd-kick', uid: id });
      void sendDock(supabase, id, [{ k: 'bd-kick' }]);
    },
    [supabase]
  );
  const addedOnce = useRef(false);
  useEffect(() => {
    if (!addId || addedOnce.current) return;
    addedOnce.current = true;
    const s = students.find((x) => x.id === addId);
    if (s && !v0.some((v) => v.id === addId)) void addViewer(s);
    setPanel(true);
  }, [addId, students, v0, addViewer]);

  const online = new Set(peers.map((p) => p.uid));
  const stale = viewers.filter((v) => Date.now() - new Date(v.addedAt).getTime() > 12 * 3600 * 1000);
  const candidates = students.filter((s) => !viewers.some((v) => v.id === s.id) && s.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 30);

  const hasSel = sel.size > 0;
  const items: ToolbarItem[] = [
    { id: 'note', label: t('Стікер'), node: <button type="button" className="ww-btn ww-btn-primary ww-btn-sm" onClick={() => addNote()} data-testid="board-add-note">{t('＋ Стікер')}</button> },
    {
      id: 'colors',
      label: t('Колір стікера'),
      node: (
        <span className="ww-board-colors" role="group" aria-label={t('Колір стікера')}>
          {NOTE_COLORS.map((c) => (
            <button key={c} type="button" className="ww-board-color" style={{ background: `var(--ww-note-${c})` }} aria-pressed={color === c} aria-label={t(COLOR_LABEL[c])} title={t(COLOR_LABEL[c])} onClick={() => recolor(c)} />
          ))}
        </span>
      ),
    },
    { id: 'text', label: t('Текст'), node: <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" onClick={addText}>{t('Т Текст')}</button> },
    { id: 'size', label: t('Розмір шрифту'), node: <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" disabled={!hasSel} onClick={cycleSize} title={t('Розмір шрифту')}>Aa{hasSel && selEls()[0] ? ` ${selEls()[0].fs}` : ''}</button> },
    { id: 'dup', label: t('Дублювати'), node: <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" disabled={!hasSel} onClick={duplicate}>{t('Дублювати')}</button> },
    { id: 'del', label: t('Видалити'), node: <button type="button" className="ww-btn ww-btn-danger ww-btn-sm" disabled={!hasSel} onClick={remove}>{t('Видалити')}</button> },
    { id: 'undo', label: t('Скасувати дію'), node: <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" disabled={!hist.current.length} onClick={undo} aria-label={t('Скасувати дію')}>↶</button> },
    { id: 'redo', label: t('Повернути дію'), node: <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" disabled={!fut.current.length} onClick={redo} aria-label={t('Повернути дію')}>↷</button> },
    { id: 'fit', label: t('Вмістити все'), node: <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" onClick={fit}>{t('Вмістити все')}</button> },
    { id: 'follow', label: t('Вести за мною'), node: <Switch checked={follow} onChange={setFollow} label={t('Вести за мною')} /> },
    {
      id: 'viewers',
      label: t('Глядачі'),
      node: (
        <button type="button" className={`ww-btn ww-btn-sm ${panel ? 'ww-btn-accent' : 'ww-btn-secondary'}`} aria-expanded={panel} onClick={() => setPanel((o) => !o)} data-testid="board-viewers">
          {t('Глядачі')} ({viewers.length})
        </button>
      ),
    },
    { id: 'clear', label: t('Очистити'), node: <button type="button" className="ww-btn ww-btn-danger ww-btn-sm" onClick={clearAll}>{t('Очистити')}</button> },
    { id: 'close', label: t('Закрити'), node: <Link href="/teacher/students" className="ww-btn ww-btn-ghost ww-btn-sm">{t('Закрити')}</Link> },
  ];

  return (
    <div className="ww-boardscreen" data-testid="teacher-board">
      <div className="ww-boardscreen-bar">
        <div className="ww-bar">
          <Toolbar items={items} />
        </div>
      </div>
      <div className="ww-boardscreen-main">
        <Board
          els={els}
          vp={vp}
          onVp={onVp}
          editable
          sel={sel}
          setSel={setSel}
          editing={editing}
          setEditing={setEditing}
          onChange={change}
          onAddAt={addNote}
          onSize={onSize}
        />
        {link === 'offline' && <p className="ww-dock-offline" style={{ position: 'absolute', left: 12, bottom: 12 }}>{t('Немає зв’язку — перепідключаюсь. Зміни зберігаються.')}</p>}
        {limitHint && <p className="ww-dock-offline" style={{ position: 'absolute', left: 12, top: 12 }}>{t('Ліміт — 300 елементів. Очистіть дошку.')}</p>}
        {conflict && (
          <p className="ww-dock-offline" style={{ position: 'absolute', left: 12, top: 12 }}>
            {t('Дошку змінили на іншому пристрої.')}{' '}
            <button type="button" className="underline" onClick={() => window.location.reload()}>{t('Оновити')}</button>
          </p>
        )}
        {panel && (
          <div className="ww-menu ww-board-viewers" style={{ top: 8, right: 10 }} role="dialog" aria-label={t('Глядачі')}>
            <p className="ww-label" style={{ padding: '4px 8px' }}>{t('Бачать дошку')}</p>
            {viewers.length === 0 && <p className="ww-dock-menu-date">{t('Поки нікого. Додай учня нижче.')}</p>}
            {viewers.map((v) => (
              <div key={v.id} className="ww-board-viewer-row">
                <i className={`ww-board-dot${online.has(v.id) ? ' is-on' : ''}`} title={online.has(v.id) ? t('онлайн') : t('не в мережі')} />
                <span>{v.name}</span>
                <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => void removeViewer(v.id)} aria-label={t('Прибрати {name}', { name: v.name })}>✕</button>
              </div>
            ))}
            {stale.length > 0 && <p className="ww-dock-menu-date">{t('Давно додані: {names} — прибрати?', { names: stale.map((s) => s.name).join(', ') })}</p>}
            {viewers.length > 1 && (
              <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => viewers.forEach((v) => void removeViewer(v.id))}>{t('Прибрати всіх')}</button>
            )}
            <p className="ww-label" style={{ padding: '8px 8px 4px' }}>{t('Додати учня')}</p>
            <input className="ww-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Пошук за іменем')} aria-label={t('Пошук за іменем')} />
            {candidates.map((s) => (
              <div key={s.id} className="ww-board-viewer-row">
                <span>{s.name}</span>
                <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" onClick={() => void addViewer(s)}>{t('Додати')}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
