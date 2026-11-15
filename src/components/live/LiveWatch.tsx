'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'rrweb/dist/style.css';
import Link from 'next/link';
import { useT } from '@/i18n/client';
import { isLessonPath, lessonSlugOf, pickStudent, type ClassMsg, type Presence } from '@/lib/live/protocol';
import { useLiveChannel } from './useLiveChannel';
import { MarkLessonDone } from './MarkLessonDone';

type Rep = {
  addEvent: (e: unknown) => void;
  startLive: () => void;
  destroy?: () => void;
  on: (ev: string, cb: (p: { width: number; height: number }) => void) => void;
  wrapper: HTMLElement;
};

/**
 * Викладач дивиться екран учня наживо — рівно те, що бачить учень у курсі. Лише перегляд:
 * кліки й клавіші сюди не доходять, учневі нічого не надсилається, крім прохання про свіжий знімок.
 */
export function LiveWatch({ studentId, name }: { studentId: string; name: string }) {
  const t = useT();
  const [student, setStudent] = useState<Presence | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const repRef = useRef<Rep | null>(null);
  const viewport = useRef({ w: 1280, h: 800 });
  const gotFrame = useRef(false);
  const sendRef = useRef<(m: ClassMsg) => Promise<boolean>>(() => Promise.resolve(false));

  // екран учня по ширині кадру викладача (не більше 1:1)
  const fit = useCallback(() => {
    const stage = stageRef.current;
    const mount = mountRef.current;
    const rep = repRef.current;
    if (!stage || !mount || !rep) return;
    const vp = viewport.current;
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
        mouseTail: false,
        // анімації появи застигали на першому кадрі з opacity 0 — у перегляді вони не потрібні
        insertStyleRules: ['*,*::before,*::after{animation:none!important;transition:none!important}'],
      }) as unknown as Rep;
      rep.on('resize', ({ width, height }) => {
        viewport.current = { w: width, h: height };
        fit();
      });
      rep.startLive();
      repRef.current = rep;
    },
    [fit]
  );

  // пакети застосовуємо строго по черзі: знімок перебудовує програвач
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mods = useRef<Promise<[typeof import('rrweb'), typeof import('@rrweb/packer')]> | null>(null);
  const onRR = useCallback(
    (packed: string[]) => {
      queue.current = queue.current
        .then(async () => {
          mods.current ??= Promise.all([import('rrweb'), import('@rrweb/packer')]);
          const [rrweb, { unpack }] = await mods.current;
          let ts = Date.now();
          for (const p of packed) {
            const ev = unpack(p) as { type: number; timestamp: number };
            if (ev.type === 4) await resetReplayer(rrweb); // новий документ → новий програвач
            ev.timestamp = ts++; // годинники учня й викладача різні
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

  const expectSeq = useRef(0);
  const lastAsk = useRef(0);
  const askSnap = useCallback(() => {
    const now = Date.now();
    if (now - lastAsk.current < 1500) return;
    lastAsk.current = now;
    void sendRef.current({ k: 'need-snap' });
  }, []);

  const { link, send } = useLiveChannel({
    studentId,
    presence: () => ({ role: 'teacher', mode: 'watch', at: Date.now() }),
    onMessage: (m) => {
      if (m.k !== 'rr') return;
      // пакет загубився — далі картинка була б застарілою, тому просимо свіжий знімок
      if (typeof m.n === 'number') {
        if (expectSeq.current && m.n !== expectSeq.current && m.n !== 1) askSnap();
        expectSeq.current = m.n + 1;
      }
      onRR(m.d);
    },
    onPresence: (all) => {
      const s = pickStudent(all);
      setStudent(s);
      if (!s || s.mode !== 'lesson') {
        gotFrame.current = false;
        setHasFrame(false);
        expectSeq.current = 0;
      }
    },
  });
  sendRef.current = send;

  const inLesson = !!student && student.mode === 'lesson' && isLessonPath(student.path);

  // просимо картинку, доки не прийде (учень міг почати запис раніше, ніж ми підключились)
  useEffect(() => {
    if (!inLesson || hasFrame) return;
    void send({ k: 'need-snap' });
    const id = setInterval(() => void send({ k: 'need-snap' }), 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inLesson, hasFrame, link]);

  useEffect(() => {
    const on = () => fit();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [fit]);

  const slug = inLesson ? lessonSlugOf(student?.path) : null;
  const status = link !== 'online'
    ? t("Підключаюсь…")
    : !student
      ? t("{name} зараз не на сайті. Щойно учень відкриє лекцію, тут з'явиться його екран.", { name })
      : !inLesson
        ? t("{name} на сайті, але не в лекції. Екран з'явиться, щойно учень відкриє лекцію.", { name })
        : !hasFrame
          ? t("Отримую екран учня…")
          : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-paper-muted">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${inLesson ? 'bg-correct' : student ? 'bg-gold-fill' : 'bg-paper-muted'}`} />
          {inLesson
            ? t("у лекції: {title}", { title: student?.title || slug || '' })
            : student
              ? t("на сайті")
              : t("не в мережі")}
        </span>
        <span className="flex-1" />
        {slug && (
          <>
            <Link href={`/learn/${slug}`} className="ww-btn ww-btn-ghost" target="_blank">
              {t("Відкрити лекцію ↗")}
            </Link>
            <MarkLessonDone studentId={studentId} lessons={[{ slug, title: student?.title || slug }]} compact />
          </>
        )}
      </div>
      <div ref={stageRef} className="ww-live-stage">
        {status && <p className="ww-live-status">{status}</p>}
        <div ref={mountRef} className="ww-live-mount" style={{ display: hasFrame && inLesson ? undefined : 'none' }} />
      </div>
    </div>
  );
}
