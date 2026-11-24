'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useT } from '@/i18n/client';
import { fitViewport, applyOps, sanitizeEls, type BoardEl, type BoardMsg, type Viewport } from '@/lib/board/types';
import { useDock } from '@/components/dock/DockChannel';
import { Board } from './Board';
import { useBoardChannel } from './BoardChannel';

/**
 * Дошка викладача для учня-глядача: лише перегляд. Запрошення/виключення приходять у dock:<uid>
 * (bd-invite / bd-kick), живі зміни — з board:main, знімок — з teacher_board (RLS пускає лише глядачів).
 */
export function StudentBoard({ studentId, name }: { studentId: string; name?: string }) {
  const t = useT();
  const supabase = useMemo(() => createClient(), []);
  const { listen } = useDock();
  const [isViewer, setIsViewer] = useState(false);
  const [open, setOpen] = useState(false);
  const [els, setEls] = useState<BoardEl[]>([]);
  const [tvp, setTvp] = useState<Viewport | null>(null);
  const [ownVp, setOwnVp] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [follow, setFollow] = useState(true);
  const [sel] = useState(() => new Set<string>());
  const rev = useRef(0);
  const size = useRef({ w: 0, h: 0 });
  const fitted = useRef(false);
  const loading = useRef(false);
  const viewerRef = useRef(false);
  viewerRef.current = isViewer;
  const elsRef = useRef<BoardEl[]>([]);
  elsRef.current = els;

  const load = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    const { data, error } = await supabase.from('teacher_board').select('els, vp, follow, rev').eq('id', 1).maybeSingle();
    loading.current = false;
    if (error || !data) {
      // дошки не видно — значить, права глядача більше немає
      setIsViewer(false);
      setOpen(false);
      return;
    }
    const e = sanitizeEls(data.els);
    setEls(e);
    rev.current = Number(data.rev ?? 0);
    setFollow(data.follow !== false);
    setTvp((data.vp as Viewport | null) ?? null);
    if (!fitted.current && size.current.w) {
      fitted.current = true;
      setOwnVp(fitViewport(e, size.current.w, size.current.h));
    }
  }, [supabase]);

  // чи я глядач (при вході на сторінку / перезавантаженні)
  useEffect(() => {
    let alive = true;
    supabase
      .from('board_viewers')
      .select('student_id')
      .eq('student_id', studentId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive && data) setIsViewer(true);
      });
    return () => {
      alive = false;
    };
  }, [supabase, studentId]);

  // запрошення / виключення
  useEffect(
    () =>
      listen((m) => {
        if (m.k === 'bd-invite') {
          setIsViewer(true);
          setOpen(true);
        } else if (m.k === 'bd-kick') {
          setIsViewer(false);
          setOpen(false);
        }
      }),
    [listen]
  );

  const onMessage = useCallback(
    (m: BoardMsg) => {
      if (m.k === 'bd-ops') {
        if (m.rev <= rev.current) return;
        if (m.rev !== rev.current + 1) return void load();
        rev.current = m.rev;
        setEls((p) => applyOps(p, m.ops));
      } else if (m.k === 'bd-vp') setTvp(m.vp);
      else if (m.k === 'bd-follow') setFollow(m.follow);
      else if (m.k === 'bd-full') void load();
      else if (m.k === 'bd-kick' && m.uid === studentId) {
        setIsViewer(false);
        setOpen(false);
      }
    },
    [load, studentId]
  );
  useBoardChannel({
    enabled: isViewer,
    presence: () => ({ uid: studentId, name, at: Date.now() }),
    onMessage,
    onSubscribed: () => void load(),
  });

  useEffect(() => {
    if (!isViewer) return;
    void load();
    const on = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', on);
    window.addEventListener('online', on);
    return () => {
      document.removeEventListener('visibilitychange', on);
      window.removeEventListener('online', on);
    };
  }, [isViewer, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const onSize = useCallback(
    (w: number, h: number) => {
      size.current = { w, h };
      if (!fitted.current && w && elsRef.current.length) {
        fitted.current = true;
        setOwnVp(fitViewport(elsRef.current, w, h));
      }
    },
    []
  );

  if (!isViewer) return null;
  const following = follow && !!tvp;
  const vp = following ? tvp! : ownVp;
  return (
    <>
      {!open && (
        <button type="button" className="ww-board-chip" onClick={() => setOpen(true)} data-testid="board-chip">
          {t('Дошка')} <i aria-hidden="true" />
        </button>
      )}
      {open && (
        <div className="ww-boardscreen" role="dialog" aria-modal="true" aria-label={t('Дошка викладача')} data-testid="student-board">
          <div className="ww-boardscreen-bar">
            <div className="ww-bar">
              <p className="min-w-0 flex-1 truncate font-display text-base text-paper">{t('Дошка викладача')}</p>
              {following && <span className="ww-label">{t('Слідує за викладачем')}</span>}
              {!following && (
                <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" onClick={() => setOwnVp(fitViewport(els, size.current.w, size.current.h))}>
                  {t('Вмістити все')}
                </button>
              )}
              <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => setOpen(false)}>
                {t('Згорнути')}
              </button>
            </div>
          </div>
          <div className="ww-boardscreen-main">
            <Board els={els} vp={vp} onVp={setOwnVp} editable={false} sel={sel} setSel={() => undefined} editing={null} setEditing={() => undefined} smooth={following} lockView={following} onSize={onSize} />
          </div>
        </div>
      )}
    </>
  );
}
