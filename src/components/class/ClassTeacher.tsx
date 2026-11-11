'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'rrweb/dist/style.css';
import {
  CLASS_EMBEDS,
  EMPTY_ROOM,
  elementPath,
  shortText,
  type ClassMsg,
  type Presence,
  type RoomState,
} from '@/lib/class/protocol';
import { useClassChannel } from './useClassChannel';

type Lesson = { id: string; title: string };
type Props = { studentId: string; studentName: string; lessons: Lesson[]; initialRoom: RoomState };

type Rep = {
  addEvent: (e: unknown) => void;
  startLive: (t?: number) => void;
  destroy?: () => void;
  getMirror: () => { getId: (n: unknown) => number };
  wrapper: HTMLElement;
  iframe: HTMLIFrameElement;
  on: (ev: string, cb: (p: { width: number; height: number }) => void) => void;
};

/** Teacher side: pick a lesson, move the student in, watch the student's screen live and click on it. */
export function ClassTeacher({ studentId, studentName, lessons, initialRoom }: Props) {
  const [room, setRoom] = useState<RoomState>(initialRoom);
  const [lessonId, setLessonId] = useState(initialRoom.lesson_id ?? lessons[0]?.id ?? '');
  const [embed, setEmbed] = useState(initialRoom.embed ?? 'slides');
  const [blocks, setBlocks] = useState(initialRoom.blocks ?? '');
  const [student, setStudent] = useState<Presence | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [pult, setPult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const repRef = useRef<Rep | null>(null);
  const viewport = useRef<{ w: number; h: number } | null>(null);
  const sendRef = useRef<(m: ClassMsg) => boolean>(() => false);
  const gotFrame = useRef(false);

  const fit = useCallback(() => {
    const stage = stageRef.current;
    const mount = mountRef.current;
    const vp = viewport.current;
    const rep = repRef.current;
    if (!stage || !mount || !vp || !rep) return;
    const k = Math.min(1, stage.clientWidth / vp.w);
    rep.wrapper.style.transform = `scale(${k})`;
    rep.wrapper.style.transformOrigin = 'top left';
    mount.style.width = `${vp.w * k}px`;
    mount.style.height = `${vp.h * k}px`;
  }, []);

  const resetReplayer = useCallback(
    async (rrweb: typeof import('rrweb')) => {
      const mount = mountRef.current;
      if (!mount) return;
      repRef.current?.destroy?.();
      mount.innerHTML = '';
      const rep = new rrweb.Replayer([], {
        root: mount,
        liveMode: true,
        showWarning: false,
        mouseTail: { strokeStyle: '#d4a843', lineWidth: 3 },
      }) as unknown as Rep;
      rep.on('resize', ({ width, height }) => {
        viewport.current = { w: width, h: height };
        fit();
      });
      rep.startLive();
      repRef.current = rep;
      (window as unknown as { __wwRep?: unknown }).__wwRep = rep;
    },
    [fit]
  );

  // Batches must be applied strictly one after another: a snapshot rebuilds the replayer, and events of the
  // next batch that sneak in meanwhile would be lost (the picture and the element ids then drift apart).
  const queue = useRef<Promise<void>>(Promise.resolve());
  const onRR = useCallback(
    (packed: string[]) => {
      queue.current = queue.current
        .then(async () => {
          const [rrweb, { unpack }] = await Promise.all([import('rrweb'), import('@rrweb/packer')]);
          let t = Date.now();
          for (const p of packed) {
            const ev = unpack(p) as { type: number; timestamp: number };
            // a new document (Meta) → a fresh replayer; timestamps are re-stamped locally (clocks differ)
            if (ev.type === 4) await resetReplayer(rrweb);
            ev.timestamp = t++;
            repRef.current?.addEvent(ev);
            if (ev.type === 2 && !gotFrame.current) {
              gotFrame.current = true;
              setHasFrame(true);
            }
          }
        })
        .catch(() => undefined);
    },
    [resetReplayer]
  );

  const { link, send, supabase } = useClassChannel({
    studentId,
    presence: () => ({ role: 'teacher', at: Date.now() }),
    onMessage: (m) => {
      if (m.k === 'rr') onRR(m.d);
    },
    onPresence: (all) => {
      const s = all.find((p) => p.role === 'student') ?? null;
      setStudent(s);
      if (!s) {
        gotFrame.current = false;
        setHasFrame(false);
      }
    },
    onSubscribed: () => sendRef.current({ k: 'need-snap' }),
  });
  sendRef.current = send;

  // ask for a picture until one arrives (the student may join after us)
  useEffect(() => {
    if (!student || student.mode !== 'class' || hasFrame) return;
    send({ k: 'need-snap' });
    const id = setInterval(() => send({ k: 'need-snap' }), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.mode, hasFrame, link]);

  useEffect(() => {
    const on = () => fit();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [fit]);

  useEffect(() => () => repRef.current?.destroy?.(), []);

  async function setRoomState(next: RoomState) {
    setBusy(true);
    setErr(null);
    const { error } = await supabase
      .from('class_rooms')
      .upsert({ student_id: studentId, ...next, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setRoom(next);
    gotFrame.current = false;
    setHasFrame(false);
    send({ k: 'room', room: next });
  }

  const enter = () =>
    setRoomState({ active: true, lesson_id: lessonId, embed, blocks: embed === 'grammar' && blocks.trim() ? blocks.trim() : null });
  const leave = () => setRoomState({ ...EMPTY_ROOM, lesson_id: room.lesson_id, embed: room.embed, blocks: room.blocks });

  function onStageClick(e: React.MouseEvent<HTMLDivElement>) {
    const rep = repRef.current;
    const vp = viewport.current;
    if (!pult || !rep || !vp) return;
    const r = e.currentTarget.getBoundingClientRect();
    const k = r.width / vp.w;
    const doc = rep.iframe?.contentDocument;
    const el = doc?.elementFromPoint((e.clientX - r.left) / k, (e.clientY - r.top) / k);
    if (!el) return;
    const id = rep.getMirror().getId(el);
    if (id > 0) send({ k: 'click', id, tag: el.tagName, text: shortText(el), path: elementPath(el) });
  }

  const where = !student ? 'не в мережі' : student.mode === 'class' ? 'у класі' : 'у залі очікування';
  const dot = !student ? 'bg-paper-muted' : student.mode === 'class' ? 'bg-correct' : 'bg-gold-fill';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl text-paper">{studentName}</h1>
        <div className="flex items-center gap-4 text-sm text-paper-muted">
          <span className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
            {where}
          </span>
          <span>{link === 'online' ? 'канал: ок' : link === 'connecting' ? 'канал: підключення…' : 'канал: немає зв’язку'}</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-ink-line p-4">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs text-paper-muted">
          Урок
          <select
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            className="rounded-md border border-ink-line bg-ink px-3 py-2 text-sm text-paper"
          >
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-paper-muted">
          Що відкрити
          <select
            value={embed}
            onChange={(e) => setEmbed(e.target.value)}
            className="rounded-md border border-ink-line bg-ink px-3 py-2 text-sm text-paper"
          >
            {CLASS_EMBEDS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        {embed === 'grammar' && (
          <label className="flex flex-col gap-1 text-xs text-paper-muted">
            Блоки (напр. g2-g5)
            <input
              value={blocks}
              onChange={(e) => setBlocks(e.target.value)}
              className="w-32 rounded-md border border-ink-line bg-ink px-3 py-2 text-sm text-paper"
            />
          </label>
        )}
        <button
          type="button"
          onClick={enter}
          disabled={busy || !lessonId}
          className="rounded-lg bg-gold-fill px-5 py-2 text-sm font-medium text-paper hover:bg-gold-fillHover disabled:opacity-50"
        >
          {room.active ? 'Перейти до цього' : 'У клас'}
        </button>
        {room.active && (
          <button
            type="button"
            onClick={leave}
            disabled={busy}
            className="rounded-lg border border-gold/40 px-4 py-2 text-sm text-gold hover:bg-gold/10 disabled:opacity-50"
          >
            У зал очікування
          </button>
        )}
        <label className="ml-auto flex items-center gap-2 text-sm text-paper-muted">
          <input type="checkbox" checked={pult} onChange={(e) => setPult(e.target.checked)} />
          Пульт: клік по екрану = клік у учня
        </label>
      </div>
      {err && <p className="mb-3 text-incorrect">Не вдалося: {err}</p>}

      <div ref={stageRef} className="rounded-lg border border-ink-line bg-ink-soft p-2">
        <div className="relative mx-auto" style={{ width: 'fit-content' }}>
          <div ref={mountRef} className="relative overflow-hidden bg-white" />
          {pult && hasFrame && (
            <div
              onClick={onStageClick}
              className="absolute inset-0 cursor-pointer ring-2 ring-gold/60"
              title="Пульт увімкнено"
            />
          )}
        </div>
        {!hasFrame && (
          <p className="px-4 py-16 text-center text-paper-muted">
            {!student
              ? 'Учня немає в мережі. Він має відкрити сторінку «Клас» після входу.'
              : student.mode !== 'class'
                ? 'Учень у залі очікування. Оберіть урок і натисніть «У клас».'
                : 'Чекаю на екран учня…'}
          </p>
        )}
      </div>
    </div>
  );
}
