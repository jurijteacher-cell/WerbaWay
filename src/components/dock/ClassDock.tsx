'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, MessageSquare, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLocale, useT } from '@/i18n/client';
import { HTML_LANG } from '@/i18n/config';
import { Switch } from '@/components/ui/Switch';
import {
  CHAT_MAX,
  CHAT_PAGE,
  CHAT_RENDER_MAX,
  CHAT_WARN,
  type ChatRow,
  type DockMsg,
  type LocalChat,
} from '@/lib/dock/protocol';
import { useDock } from './DockChannel';
import { WordsPanel } from './WordsPanel';

const LS_KEY = 'ww.dock';
const LS_SOUND = 'ww.dock.sound';
const W_MIN = 320;
const W_MAX = 560;
const W_DEF = 380;

type Props = {
  role: 'student' | 'teacher';
  studentId: string;
  studentName?: string;
  /** лекція, у якій зараз учень (для прив'язки повідомлень і фільтра) */
  lesson: { slug: string; pg: number | null } | null;
  defaultOpen?: boolean;
  /** відкрити одразу з фільтром «ця лекція» (посилання з профілю учня) */
  initialFilterLesson?: string;
  studentOnline?: boolean;
  /** викладач: стрілка «← Усі чати» у шапці (повернутись до списку розмов) */
  onBack?: () => void;
};

type DockSaved = { open?: boolean; w?: number; tab?: 'chat' | 'words'; at?: number };
/** скільки на телефоні пам'ятаємо, що аркуш був відкритий */
const SHEET_KEEP_MS = 6 * 3600_000;

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* приватний режим — налаштування просто не запам'ятається */
  }
}

const sortRows = (a: LocalChat, b: LocalChat) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : 1);

/** вставляє/оновлює рядки за id, відкидаючи дублікати */
function mergeRows(prev: LocalChat[], rows: LocalChat[]): LocalChat[] {
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const r of rows) {
    const old = map.get(r.id);
    // прочитане не «розчитується»: broadcast міг прийти раніше за оновлення read_at
    map.set(r.id, old?.read_at && !r.read_at ? { ...r, read_at: old.read_at } : r);
  }
  return [...map.values()].sort(sortRows);
}

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="ww-dock-link">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}

let audioCtx: AudioContext | null = null;
function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    audioCtx ??= new AC();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.25);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.26);
  } catch {
    /* звук — необов'язковий */
  }
}

export function ClassDock({ role, studentId, studentName, lesson, defaultOpen, initialFilterLesson, studentOnline, onBack }: Props) {
  const t = useT();
  const locale = useLocale();
  const lang = HTML_LANG[locale];
  const supabase = useMemo(() => createClient(), []);
  const { link, send, listen, subscribedTick } = useDock();

  const [open, setOpen] = useState(!!defaultOpen);
  const [tab, setTab] = useState<'chat' | 'words'>('chat');
  const [width, setWidth] = useState(W_DEF);
  const [desktop, setDesktop] = useState(true);
  const [msgs, setMsgs] = useState<LocalChat[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [filterSlug, setFilterSlug] = useState<string | null>(initialFilterLesson ?? null);
  const [sound, setSound] = useState(role === 'student');
  const [menu, setMenu] = useState<string | null>(null);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(true);
  const [vv, setVv] = useState<{ h: number; top: number } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const selfRef = useRef<string | null>(role === 'student' ? studentId : null);
  const openRef = useRef(open);
  openRef.current = open;
  const visRef = useRef(visible);
  visRef.current = visible;
  useEffect(() => {
    if (!open) return;
    writeLS(LS_KEY, { ...readLS<DockSaved>(LS_KEY, {}), tab, at: Date.now() });
  }, [tab, open]);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;
  const firstLoad = useRef(true);

  /* ── налаштування: відкрито/ширина/звук ── */
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onMq = () => setDesktop(mq.matches);
    onMq();
    mq.addEventListener('change', onMq);
    const saved = readLS<DockSaved>(LS_KEY, {});
    if (typeof saved.w === 'number') setWidth(Math.min(W_MAX, Math.max(W_MIN, saved.w)));
    // панель закриває лише людина: «відкрито» і вкладка переживають перехід між сторінками (на телефоні — 6 год)
    if (saved.open && (mq.matches || (saved.at ?? 0) > Date.now() - SHEET_KEEP_MS)) {
      setOpen(true);
      if (saved.tab === 'words' || saved.tab === 'chat') setTab(saved.tab);
    }
    setSound(readLS<boolean>(LS_SOUND, role === 'student'));
    return () => mq.removeEventListener('change', onMq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (nextOpen: boolean, w = width) => {
    writeLS(LS_KEY, { ...readLS<DockSaved>(LS_KEY, {}), open: nextOpen, w, at: Date.now() });
  };
  const toggle = useCallback(
    (v?: boolean) => {
      setOpen((o) => {
        const n = v ?? !o;
        writeLS(LS_KEY, { ...readLS<DockSaved>(LS_KEY, {}), open: n, w: width, at: Date.now() });
        return n;
      });
    },
    [desktop, width]
  );

  /* ── вплив на сторінку: зсув вмісту (ПК) / блокування прокрутки (аркуш) ── */
  useEffect(() => {
    const html = document.documentElement;
    if (open && desktop) {
      html.style.setProperty('--ww-dock-w', `${width}px`);
      document.body.classList.add('ww-dock-open');
    }
    if (open && !desktop) html.classList.add('ww-dock-lock');
    return () => {
      document.body.classList.remove('ww-dock-open');
      html.classList.remove('ww-dock-lock');
      html.style.removeProperty('--ww-dock-w');
    };
  }, [open, desktop, width]);

  /* ── клавіатура на телефоні: висота аркуша від visualViewport ── */
  useEffect(() => {
    if (!open || desktop || !window.visualViewport) {
      setVv(null);
      return;
    }
    const v = window.visualViewport;
    const on = () => setVv({ h: v.height, top: v.offsetTop });
    on();
    v.addEventListener('resize', on);
    v.addEventListener('scroll', on);
    return () => {
      v.removeEventListener('resize', on);
      v.removeEventListener('scroll', on);
    };
  }, [open, desktop]);

  /* ── гарячі клавіші ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && openRef.current && !desktop && (e.target as Element | null)?.closest?.('.ww-dock')) {
        if (menu) setMenu(null);
        else toggle(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggle, desktop, menu]);

  useEffect(() => {
    const on = () => setVisible(document.visibilityState === 'visible');
    on();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  /* ── хто я ── */
  const getSelf = useCallback(async () => {
    if (selfRef.current) return selfRef.current;
    const { data } = await supabase.auth.getUser();
    selfRef.current = data.user?.id ?? null;
    return selfRef.current;
  }, [supabase]);

  /* ── історія ── */
  const load = useCallback(
    async (before?: string) => {
      let q = supabase.from('class_messages').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(CHAT_PAGE);
      if (before) q = q.lt('created_at', before);
      const { data, error } = await q;
      if (error || !data) return false;
      setMsgs((p) => mergeRows(p, data as ChatRow[]));
      if (before || firstLoad.current) {
        setHasMore(data.length === CHAT_PAGE);
        firstLoad.current = false;
      }
      return true;
    },
    [supabase, studentId]
  );

  useEffect(() => {
    void load();
  }, [load, subscribedTick]);

  useEffect(() => {
    const re = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', re);
    window.addEventListener('online', re);
    window.addEventListener('focus', re);
    return () => {
      document.removeEventListener('visibilitychange', re);
      window.removeEventListener('online', re);
      window.removeEventListener('focus', re);
    };
  }, [load]);

  /* ── вхідні повідомлення ── */
  useEffect(() => {
    return listen((m: DockMsg) => {
      if (m.k === 'chat') {
        const row = m.m;
        if (!row || row.student_id !== studentId) return;
        setMsgs((p) => mergeRows(p, [row]));
        if (row.sender_role !== role && (!openRef.current || !visRef.current) && soundRef.current) beep();
      } else if (m.k === 'chat-del') {
        setMsgs((p) => p.map((x) => (x.id === m.id ? { ...x, deleted_at: x.deleted_at ?? new Date().toISOString() } : x)));
      } else if (m.k === 'chat-read') {
        if (m.by !== role) setMsgs((p) => p.map((x) => (x.sender_role === role && !x.read_at ? { ...x, read_at: m.at } : x)));
      }
    });
  }, [listen, role, studentId]);

  /* ── непрочитані ── */
  const unread = useMemo(
    () => msgs.filter((m) => m.sender_role !== role && !m.read_at && !m.deleted_at && !m.local).length,
    [msgs, role]
  );
  useEffect(() => {
    if (!open || tab !== 'chat' || !visible || unread === 0) return;
    const at = new Date().toISOString();
    (async () => {
      if (role === 'student') await supabase.rpc('mark_chat_read');
      else await supabase.from('class_messages').update({ read_at: at }).eq('student_id', studentId).eq('sender_role', 'student').is('read_at', null);
      setMsgs((p) => p.map((x) => (x.sender_role !== role && !x.read_at ? { ...x, read_at: at } : x)));
      void send({ k: 'chat-read', by: role, at });
    })();
  }, [open, tab, visible, unread, role, studentId, supabase, send]);

  /* ── прокрутка вниз ── */
  const shown = useMemo(() => {
    const base = filterSlug ? msgs.filter((m) => m.lesson_slug === filterSlug) : msgs;
    return base.slice(-CHAT_RENDER_MAX);
  }, [msgs, filterSlug]);
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [shown, open, vv]);

  /* ── назви лекцій для чипів ── */
  useEffect(() => {
    const need = [...new Set(msgs.map((m) => m.lesson_slug).filter((s): s is string => !!s && !(s in titles)))];
    if (!need.length) return;
    let alive = true;
    fetch(`/api/lesson-titles?slugs=${encodeURIComponent(need.join(','))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { titles?: Record<string, string> } | null) => {
        if (alive) setTitles((p) => ({ ...p, ...(j?.titles ?? Object.fromEntries(need.map((s) => [s, s]))) }));
      })
      .catch(() => {
        if (alive) setTitles((p) => ({ ...p, ...Object.fromEntries(need.map((s) => [s, s])) }));
      });
    return () => {
      alive = false;
    };
  }, [msgs, titles]);

  /* ── відправка ── */
  const post = useCallback(
    async (body: string, tmpId?: string, ctx?: { slug: string | null; pg: number | null }) => {
      const self = await getSelf();
      const les = ctx ?? { slug: lessonRef.current?.slug ?? null, pg: lessonRef.current?.pg ?? null };
      const tmp = tmpId ?? `tmp-${Math.random().toString(36).slice(2, 10)}`;
      const base: LocalChat = {
        id: tmp,
        student_id: studentId,
        sender_id: self ?? studentId,
        sender_role: role,
        kind: 'text',
        body,
        meta: null,
        lesson_slug: les.slug,
        page_idx: les.pg,
        created_at: new Date().toISOString(),
        read_at: null,
        deleted_at: null,
        local: 'sending',
      };
      stick.current = true;
      setMsgs((p) => mergeRows(p.filter((x) => x.id !== tmp), [base]));
      if (!self) {
        setMsgs((p) => p.map((x) => (x.id === tmp ? { ...x, local: 'failed' } : x)));
        return;
      }
      const { data, error } = await supabase
        .from('class_messages')
        .insert({ student_id: studentId, sender_id: self, sender_role: role, kind: 'text', body, lesson_slug: les.slug, page_idx: les.pg })
        .select()
        .single();
      if (error || !data) {
        setMsgs((p) => p.map((x) => (x.id === tmp ? { ...x, local: 'failed' } : x)));
        return;
      }
      setMsgs((p) => mergeRows(p.filter((x) => x.id !== tmp), [data as ChatRow]));
      void send({ k: 'chat', m: data as ChatRow });
    },
    [getSelf, studentId, role, supabase, send]
  );

  /** картка слова, яку API вже записав у чат: показуємо в себе й розсилаємо по каналу */
  const onWordChat = useCallback(
    (row: ChatRow) => {
      setMsgs((p) => mergeRows(p, [row]));
      void send({ k: 'chat', m: row });
    },
    [send]
  );

  function submit() {
    const body = text.trim();
    if (!body || body.length > CHAT_MAX) return;
    setText('');
    if (taRef.current) taRef.current.style.height = 'auto';
    void post(body);
  }
  function retry(m: LocalChat) {
    void post(m.body, m.id, { slug: m.lesson_slug, pg: m.page_idx });
  }
  async function remove(m: LocalChat) {
    setMenu(null);
    const at = new Date().toISOString();
    const { error } = await supabase.from('class_messages').update({ deleted_at: at }).eq('id', m.id);
    if (error) return;
    setMsgs((p) => p.map((x) => (x.id === m.id ? { ...x, deleted_at: at } : x)));
    void send({ k: 'chat-del', id: m.id });
  }
  async function more() {
    const first = msgs[0];
    if (!first || loadingMore) return;
    setLoadingMore(true);
    stick.current = false;
    await load(first.created_at);
    setLoadingMore(false);
  }

  /* ── ширина (ПК) ── */
  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => setWidth(Math.min(W_MAX, Math.max(W_MIN, window.innerWidth - ev.clientX)));
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      const w = Math.min(W_MAX, Math.max(W_MIN, window.innerWidth - ev.clientX));
      persist(true, w);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  }

  /* ── форматування часу ── */
  const fmtTime = useMemo(() => new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }), [lang]);
  const fmtFull = useMemo(() => new Intl.DateTimeFormat(lang, { dateStyle: 'long', timeStyle: 'short' }), [lang]);
  const fmtDay = useMemo(() => new Intl.DateTimeFormat(lang, { dateStyle: 'long' }), [lang]);
  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const key = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    const now = new Date();
    if (key(d) === key(now)) return t('Сьогодні');
    if (key(d) === key(new Date(now.getTime() - 86400000))) return t('Вчора');
    return fmtDay.format(d);
  };

  /* ── довгий тап ── */
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current);
    press.current = null;
  };

  const name = studentName ?? t('Викладач');
  const slugForFilter = lesson?.slug ?? filterSlug;
  const over = text.length > CHAT_WARN;

  const items: React.ReactNode[] = [];
  let prevDay = '';
  let prevSlug: string | null = null;
  for (const m of shown) {
    const day = dayLabel(m.created_at);
    if (day !== prevDay) {
      items.push(
        <div key={`d-${m.id}`} className="ww-dock-day">
          <span>{day}</span>
        </div>
      );
      prevDay = day;
    }
    if (m.lesson_slug && m.lesson_slug !== prevSlug) {
      items.push(
        <div key={`l-${m.id}`} className="ww-dock-lessonchip">
          <Link href={`/learn/${m.lesson_slug}${typeof m.page_idx === 'number' ? `?p=${m.page_idx + 1}` : ''}`}>
            {titles[m.lesson_slug] ?? m.lesson_slug}
          </Link>
        </div>
      );
    }
    prevSlug = m.lesson_slug ?? prevSlug;
    const own = m.sender_role === role;
    const del = !!m.deleted_at;
    const full = fmtFull.format(new Date(m.created_at));
    items.push(
      <div key={m.id} className={`ww-dock-row${own ? ' is-own' : ''}`}>
        <div
          className={`ww-dock-msg${own ? ' is-own' : ''}${m.local === 'failed' ? ' is-failed' : ''}${del ? ' is-del' : ''}${m.kind !== 'text' ? ` is-${m.kind}` : ''}`}
          title={full}
          onContextMenu={(e) => {
            if (!del) {
              e.preventDefault();
              setMenu(m.id);
            }
          }}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' || del) return;
            cancelPress();
            press.current = setTimeout(() => setMenu(m.id), 500);
          }}
          onPointerUp={cancelPress}
          onPointerMove={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
        >
          <p className="ww-dock-body">{del ? t('повідомлення видалено') : m.kind === 'word' ? <><b>{t('Нове слово')}:</b> {m.body}</> : <Linkified text={m.body} />}</p>
          {!del && m.kind === 'word' && typeof m.meta?.example === 'string' && <span className="ww-dock-wordex">{m.meta.example}</span>}
          <p className="ww-dock-meta">
            <time dateTime={m.created_at}>{fmtTime.format(new Date(m.created_at))}</time>
            {own && !m.local && !del && <span aria-label={m.read_at ? t('Прочитано') : t('Надіслано')}>{m.read_at ? ' ✓✓' : ' ✓'}</span>}
            {m.local === 'sending' && <span> …</span>}
          </p>
          {m.local === 'failed' && (
            <p className="ww-dock-fail">
              {t('Не надіслано')} ·{' '}
              <button type="button" onClick={() => retry(m)}>
                {t('Повторити')}
              </button>
            </p>
          )}
          {!del && !m.local && (
            <button type="button" className="ww-dock-more" aria-label={t('Дії з повідомленням')} aria-expanded={menu === m.id} onClick={() => setMenu(menu === m.id ? null : m.id)}>
              ⋯
            </button>
          )}
          {menu === m.id && (
            <div className={`ww-menu ww-dock-menu${own ? '' : ' is-left'}`} role="menu">
              <p className="ww-dock-menu-date">{full}</p>
              <button type="button" role="menuitem" className="ww-menu-row" onClick={() => { void navigator.clipboard?.writeText(m.body).catch(() => undefined); setMenu(null); }}>
                {t('Копіювати')}
              </button>
              {role === 'teacher' && own && (
                <button type="button" role="menuitem" className="ww-menu-row ww-dock-menu-danger" onClick={() => void remove(m)}>
                  {t('Видалити')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="class-dock">
      {!open && (
        <div className="ww-dock-launch">
          <button type="button" className="ww-dock-toggle" onClick={() => { setTab('chat'); toggle(true); }} aria-label={unread ? t('Чат: непрочитаних {n}', { n: unread }) : t('Чат')} title={`${t('Чат')} (Alt+C)`} data-testid="dock-open">
            <MessageSquare size={20} aria-hidden="true" />
            <span className="ww-dock-toggle-text">{t('Чат')}</span>
            {unread > 0 && <span className="ww-dock-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          <button type="button" className="ww-dock-toggle" onClick={() => { setTab('words'); toggle(true); }} aria-label={t('Додати слово')} title={t('Додати слово')} data-testid="dock-add-word">
            <Plus size={20} aria-hidden="true" />
            <span className="ww-dock-toggle-text">{t('Слово')}</span>
          </button>
          {role === 'teacher' && (
            <a href={`/teacher/board?add=${studentId}`} target="_blank" rel="noopener" className="ww-dock-toggle" aria-label={t('Дошка')} title={t('Дошка: відкрити й додати цього учня глядачем')} data-testid="dock-board">
              <LayoutDashboard size={20} aria-hidden="true" />
              <span className="ww-dock-toggle-text">{t('Дошка')}</span>
            </a>
          )}
        </div>
      )}
      {open && (
        <aside
          className={`ww-dock ${desktop ? 'is-desktop' : 'is-sheet'}`}
          style={desktop ? { width } : vv ? { height: vv.h, top: vv.top } : undefined}
          aria-label={t('Чат')}
          role="complementary"
        >
          {desktop && <div className="ww-dock-resize" onPointerDown={startResize} role="separator" aria-orientation="vertical" aria-label={t('Змінити ширину панелі')} />}
          <header className="ww-dock-head">
            {onBack && (
              <button type="button" className="ww-dock-close" onClick={onBack} aria-label={t('Усі чати')} title={t('Усі чати')} data-testid="dock-back">
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0">
              <p className="ww-label">{t('Чат')}</p>
              <p className="ww-dock-title">
                {name}
                {role === 'teacher' && <span className={`ww-dock-dot${studentOnline ? ' is-on' : ''}`} title={studentOnline ? t('онлайн') : t('не в мережі')} />}
              </p>
            </div>
            <Switch checked={sound} onChange={(v) => { setSound(v); writeLS(LS_SOUND, v); }} label={t('Звук')} />
            {role === 'teacher' && (
              <a href={`/teacher/board?add=${studentId}`} target="_blank" rel="noopener" className="ww-dock-close" aria-label={t('Дошка')} title={t('Дошка: запросити цього учня')} data-testid="dock-head-board">
                <LayoutDashboard size={18} aria-hidden="true" />
              </a>
            )}
            <button type="button" className="ww-dock-close" onClick={() => toggle(false)} aria-label={desktop ? t('Закрити чат') : t('Згорнути')}>
              {desktop ? <X size={18} aria-hidden="true" /> : <span>{t('Згорнути')}</span>}
            </button>
          </header>

          <div className="ww-dock-tabs" role="tablist" aria-label={t('Розділи дока')}>
            <button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>
              {t('Чат')}
              {unread > 0 && tab !== 'chat' ? ` (${unread})` : ''}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'words'} onClick={() => setTab('words')}>
              {t('Слова')}
            </button>
          </div>

          {tab === 'words' && (
            <div className="ww-dock-scroll">
              <WordsPanel ownerId={studentId} forStudent={role === 'teacher'} onChat={onWordChat} />
            </div>
          )}

          {tab === 'chat' && slugForFilter && (
            <div className="ww-dock-filter" role="group" aria-label={t('Фільтр')}>
              <button type="button" aria-pressed={!filterSlug} onClick={() => setFilterSlug(null)}>
                {t('Усі')}
              </button>
              <button type="button" aria-pressed={!!filterSlug} onClick={() => setFilterSlug(slugForFilter)}>
                {t('Ця лекція')}
              </button>
            </div>
          )}

          {tab === 'chat' && link === 'offline' && <p className="ww-dock-offline">{t('Немає зв’язку — перепідключаюсь. Надіслане збережеться.')}</p>}

          {tab === 'chat' && (
          <div
            ref={listRef}
            className="ww-dock-list"
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            onClick={(e) => {
              if (menu && !(e.target as HTMLElement).closest('.ww-dock-menu, .ww-dock-more')) setMenu(null);
            }}
          >
            {hasMore && !filterSlug && (
              <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm ww-dock-older" onClick={() => void more()} disabled={loadingMore}>
                {t('Показати раніше')}
              </button>
            )}
            {shown.length === 0 && <p className="ww-dock-empty">{role === 'student' ? t('Напиши викладачу — він відповість тут.') : t('Поки немає повідомлень. Напиши першим.')}</p>}
            {items}
          </div>
          )}

          {tab === 'chat' && (
          <form
            className="ww-dock-compose"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <textarea
              ref={taRef}
              className="ww-input ww-dock-input"
              rows={1}
              value={text}
              placeholder={t('Повідомлення…')}
              aria-label={t('Повідомлення')}
              maxLength={CHAT_MAX}
              enterKeyHint="send"
              onChange={(e) => {
                setText(e.target.value);
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 6 * 24 + 16)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button type="submit" className="ww-btn ww-btn-primary ww-btn-sm" disabled={!text.trim()}>
              {t('Надіслати')}
            </button>
            {over && <span className="ww-dock-count">{text.length}/{CHAT_MAX}</span>}
          </form>
          )}
        </aside>
      )}
    </div>
  );
}
