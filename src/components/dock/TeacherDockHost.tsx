'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, X } from 'lucide-react';
import { useLocale, useT } from '@/i18n/client';
import { HTML_LANG } from '@/i18n/config';
import type { ChatSummary } from '@/app/api/teacher/chats/route';
import { DockBoundary } from './DockBoundary';
import { TeacherDock } from './TeacherDock';

const LS_KEY = 'ww.dock';
const W_MIN = 320;
const W_MAX = 560;
const W_DEF = 380;
const CLASS_RE = /^\/teacher\/students\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

function readSaved(): { open?: boolean; w?: number } {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

/**
 * Чат і дошка викладача на КОЖНІЙ сторінці (а не лише в «класі» учня).
 *  — поза класом: список усіх розмов; вибрав учня — відкрилась розмова;
 *  — у класі (/teacher/students/<id> і /watch): одразу чат із цим учнем, стрілка «←» веде до списку всіх чатів;
 *  — кнопка «Дошка» є завжди: з класу вона відразу запрошує цього учня, зі списку — просто відкриває дошку.
 */
export function TeacherDockHost() {
  const pathname = usePathname() ?? '';
  const [topLevel, setTopLevel] = useState(false);
  useEffect(() => {
    try {
      setTopLevel(window.self === window.top);
    } catch {
      setTopLevel(false);
    }
  }, []);
  // вправи в лекції — iframe, у них дока немає; так само не в /embed, /slides і гостьових /s
  if (!topLevel || /^\/(embed|slides|s)(\/|$)/.test(pathname)) return null;
  return (
    <DockBoundary>
      <Host pathname={pathname} />
    </DockBoundary>
  );
}

function Host({ pathname }: { pathname: string }) {
  const classId = pathname.match(CLASS_RE)?.[1] ?? null;
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [listMode, setListMode] = useState(false);
  const [wantOpen, setWantOpen] = useState(false);
  const [qs, setQs] = useState<{ dock: boolean; lesson?: string }>({ dock: false });

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/teacher/chats', { cache: 'no-store' });
      if (!r.ok) return;
      const j = (await r.json()) as { chats?: ChatSummary[] };
      if (j.chats) setChats(j.chats);
    } catch {
      /* мережа впала — наступного разу */
    }
  }, []);

  // зайшли в інший клас / вийшли з класу — починаємо з чистого аркуша; ?dock=1 і ?lesson= — з посилань («Чат цієї лекції»)
  useEffect(() => {
    setPicked(null);
    setListMode(false);
    const p = new URLSearchParams(window.location.search);
    const lesson = p.get('lesson') ?? '';
    setQs({ dock: p.get('dock') === '1', lesson: /^[a-z0-9][a-z0-9-]*$/.test(lesson) ? lesson : undefined });
  }, [classId]);

  useEffect(() => {
    void load();
    const tick = () => document.visibilityState === 'visible' && void load();
    const timer = setInterval(tick, 30_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  const target = picked ?? (classId && !listMode ? classId : null);
  const name = chats?.find((c) => c.id === target)?.name ?? '…';
  const unreadTotal = useMemo(() => (chats ?? []).reduce((n, c) => n + c.unread, 0), [chats]);

  if (target) {
    const inClass = target === classId;
    return (
      <TeacherDock
        key={target}
        studentId={target}
        name={name}
        defaultOpen={wantOpen || (inClass && qs.dock)}
        initialFilterLesson={inClass ? qs.lesson : undefined}
        onBack={() => {
          setPicked(null);
          setListMode(true);
          setWantOpen(true);
          void load();
        }}
      />
    );
  }
  return (
    <ChatList
      chats={chats}
      unreadTotal={unreadTotal}
      defaultOpen={wantOpen}
      onPick={(id) => {
        setWantOpen(true);
        setPicked(id);
      }}
      onReload={load}
    />
  );
}

/** Список усіх розмов: пошук, останнє повідомлення, непрочитане */
function ChatList({
  chats,
  unreadTotal,
  defaultOpen,
  onPick,
  onReload,
}: {
  chats: ChatSummary[] | null;
  unreadTotal: number;
  defaultOpen: boolean;
  onPick: (id: string) => void;
  onReload: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const lang = HTML_LANG[locale];
  const [open, setOpen] = useState(defaultOpen);
  const [desktop, setDesktop] = useState(true);
  const [width, setWidth] = useState(W_DEF);
  const [q, setQ] = useState('');
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener('change', on);
    const saved = readSaved();
    if (typeof saved.w === 'number') setWidth(Math.min(W_MAX, Math.max(W_MIN, saved.w)));
    if (!defaultOpen && saved.open && mq.matches) setOpen(true);
    return () => mq.removeEventListener('change', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = useCallback(
    (v: boolean) => {
      setOpen(v);
      if (v) onReload();
      try {
        if (desktop) localStorage.setItem(LS_KEY, JSON.stringify({ open: v, w: widthRef.current }));
      } catch {
        /* приватний режим */
      }
    },
    [desktop, onReload]
  );

  // як і в ClassDock: на ПК панель зсуває сторінку, на телефоні — аркуш із блокуванням прокрутки
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyC') {
        e.preventDefault();
        toggle(!open);
      } else if (e.key === 'Escape' && open && !desktop) toggle(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, desktop, toggle]);

  const fmtTime = useMemo(() => new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' }), [lang]);
  const fmtDay = useMemo(() => new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }), [lang]);
  const when = (iso: string) => {
    const d = new Date(iso);
    return d.toDateString() === new Date().toDateString() ? fmtTime.format(d) : fmtDay.format(d);
  };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (chats ?? []).filter((c) => !needle || c.name.toLowerCase().includes(needle));
  }, [chats, q]);

  return (
    <div data-testid="teacher-chat-list">
      {!open && (
        <div className="ww-dock-launch">
          <button type="button" className="ww-dock-toggle" onClick={() => toggle(true)} aria-label={unreadTotal ? t('Чат: непрочитаних {n}', { n: unreadTotal }) : t('Чат')} title={`${t('Чат')} (Alt+C)`} data-testid="dock-open">
            <MessageSquare size={20} aria-hidden="true" />
            <span className="ww-dock-toggle-text">{t('Чат')}</span>
            {unreadTotal > 0 && <span className="ww-dock-badge">{unreadTotal > 9 ? '9+' : unreadTotal}</span>}
          </button>
          <a href="/teacher/board" target="_blank" rel="noopener" className="ww-dock-toggle" aria-label={t('Дошка')} title={t('Дошка')} data-testid="dock-board">
            <LayoutDashboard size={20} aria-hidden="true" />
            <span className="ww-dock-toggle-text">{t('Дошка')}</span>
          </a>
        </div>
      )}
      {open && (
        <aside className={`ww-dock ${desktop ? 'is-desktop' : 'is-sheet'}`} style={desktop ? { width } : undefined} aria-label={t('Усі чати')} role="complementary">
          <header className="ww-dock-head">
            <div className="min-w-0">
              <p className="ww-label">{t('Чат')}</p>
              <p className="ww-dock-title">{t('Усі чати')}</p>
            </div>
            <a href="/teacher/board" target="_blank" rel="noopener" className="ww-dock-close" aria-label={t('Дошка')} title={t('Дошка')} data-testid="dock-head-board">
              <LayoutDashboard size={18} aria-hidden="true" />
            </a>
            <button type="button" className="ww-dock-close" onClick={() => toggle(false)} aria-label={desktop ? t('Закрити чат') : t('Згорнути')}>
              {desktop ? <X size={18} aria-hidden="true" /> : <span>{t('Згорнути')}</span>}
            </button>
          </header>
          <div className="ww-chatlist-search">
            <input className="ww-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Пошук учня')} aria-label={t('Пошук учня')} />
          </div>
          <div className="ww-dock-scroll">
            {chats === null && <p className="ww-dock-empty">{t('Завантажую…')}</p>}
            {chats !== null && rows.length === 0 && <p className="ww-dock-empty">{t('Нікого не знайдено')}</p>}
            <ul className="ww-chatlist">
              {rows.map((c) => (
                <li key={c.id}>
                  <button type="button" className={`ww-chatlist-row${c.unread ? ' is-unread' : ''}`} onClick={() => onPick(c.id)} data-testid="chat-row">
                    <span className="ww-chatlist-main">
                      <span className="ww-chatlist-name">{c.name}</span>
                      <span className="ww-chatlist-last">
                        {c.last ? `${c.last.mine ? `${t('Ви')}: ` : ''}${c.last.body}` : t('Ще немає повідомлень')}
                      </span>
                    </span>
                    <span className="ww-chatlist-side">
                      {c.last && <time dateTime={c.last.at}>{when(c.last.at)}</time>}
                      {c.unread > 0 && <span className="ww-chatlist-badge">{c.unread > 9 ? '9+' : c.unread}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      )}
    </div>
  );
}
