'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import 'rrweb/dist/style.css';
import {
  CLASS_EMBEDS,
  COURSE_EMBED,
  isCourseRoom,
  EMPTY_ROOM,
  elementPath,
  shortText,
  type ClassMsg,
  type Presence,
  type RoomState,
  type StepDTO,
} from '@/lib/class/protocol';
import { useClassChannel } from './useClassChannel';
import { Toolbar, type ToolbarItem } from '@/components/ui/Toolbar';
import { Switch } from '@/components/ui/Switch';
import { StepNav, useSteps } from './StepNav';
import './class.css';
import '@/components/lesson/lesson.css';

/** Межі масштабу дзеркала: 1 = екран учня один в один */
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 3;
const ZOOM_STEP = 1.1;

type Lesson = { id: string; title: string };
type Props = {
  studentId: string;
  studentName: string;
  lessons: Lesson[];
  /** Лекції курсу (нові сторінки /learn), у порядку курсів */
  pages: (Lesson & { group?: string })[];
  initialRoom: RoomState;
};

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
export function ClassTeacher({ studentId, studentName, lessons, pages, initialRoom }: Props) {
  const [room, setRoom] = useState<RoomState>(initialRoom);
  const [lessonId, setLessonId] = useState(isCourseRoom(initialRoom) ? lessons[0]?.id ?? '' : initialRoom.lesson_id ?? lessons[0]?.id ?? '');
  const [embed, setEmbed] = useState(isCourseRoom(initialRoom) ? 'slides' : initialRoom.embed ?? 'slides');
  const [blocks, setBlocks] = useState(initialRoom.blocks ?? '');
  const [student, setStudent] = useState<Presence | null>(null);
  const [hasFrame, setHasFrame] = useState(false);
  const [pult, setPult] = useState(false);
  const pultOn = useRef(false);
  pultOn.current = pult;
  const [courseSlug, setCourseSlug] = useState<string>(isCourseRoom(initialRoom) ? initialRoom.lesson_id ?? '' : '');
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState<'fit' | 'all' | number>('fit');
  const zoomRef = useRef<'fit' | 'all' | number>('fit');
  zoomRef.current = zoom;
  const [big, setBig] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef<HTMLDivElement>(null);
  const repRef = useRef<Rep | null>(null);
  const viewport = useRef<{ w: number; h: number } | null>(null);
  const sendRef = useRef<(m: ClassMsg) => Promise<boolean>>(() => Promise.resolve(false));
  const gotFrame = useRef(false);

  const lastK = useRef(0);
  const fit = useCallback(() => {
    const stage = stageRef.current;
    const mount = mountRef.current;
    const vp = viewport.current;
    const rep = repRef.current;
    if (!stage || !mount || !vp || !rep) return;
    // «по ширині»: екран учня займає всю ширину кадру, без пустих полів — рівно те, що бачить учень;
    // «вмістити» — щоб уся сторінка учня влазила без прокрутки
    const z = zoomRef.current;
    const byW = stage.clientWidth / vp.w;
    const byH = stage.clientHeight / vp.h;
    // 1 = один в один з екраном учня; ширший кадр викладача картинку НЕ роздуває
    const k = z === 'fit' ? Math.min(1, byW) : z === 'all' ? Math.min(1, byW, byH) : z;
    // точка сторінки учня, що зараз у центрі кадру: після зміни масштабу вона лишається в центрі,
    // інакше картинка «тікала» вправо й униз (бо збільшується від лівого верхнього кута)
    const prev = lastK.current;
    const cx = prev ? (stage.scrollLeft + stage.clientWidth / 2) / prev : vp.w / 2;
    const cy = prev ? (stage.scrollTop + stage.clientHeight / 2) / prev : 0;
    rep.wrapper.style.transform = `scale(${k})`;
    rep.wrapper.style.transformOrigin = 'top left';
    mount.style.width = `${vp.w * k}px`;
    mount.style.height = `${vp.h * k}px`;
    lastK.current = k;
    if (prev && Math.abs(k - prev) > 0.001) {
      stage.scrollLeft = Math.max(0, cx * k - stage.clientWidth / 2);
      stage.scrollTop = Math.max(0, cy * k - stage.clientHeight / 2);
    }
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
        // курсор учня і слід за ним не показуємо (.cls-mirror ховає й сам маркер)
        mouseTail: false,
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

  // Batches must be applied strictly one after another: a snapshot rebuilds the replayer, and events of the
  // next batch that sneak in meanwhile would be lost (the picture and the element ids then drift apart).
  const queue = useRef<Promise<void>>(Promise.resolve());
  const mods = useRef<Promise<[typeof import('rrweb'), typeof import('@rrweb/packer')]> | null>(null);
  const onRR = useCallback(
    (packed: string[]) => {
      queue.current = queue.current
        .then(async () => {
          mods.current ??= Promise.all([import('rrweb'), import('@rrweb/packer')]);
          const [rrweb, { unpack }] = await mods.current;
          let t = Date.now();
          for (const p of packed) {
            const ev = unpack(p) as { type: number; timestamp: number };
            // a new document (Meta) → a fresh replayer; timestamps are re-stamped locally (clocks differ)
            if (ev.type === 4) {
              await resetReplayer(rrweb);
              // нова сторінка в учня — дзеркало «перегортається»
              const box = turnRef.current;
              if (box && gotFrame.current) {
                box.classList.remove('cls-mirror-turn');
                void box.offsetWidth;
                box.classList.add('cls-mirror-turn');
              }
            }
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

  // номер наступного очікуваного пакета і час останнього запиту знімка
  const expectSeq = useRef(0);
  const lastAsk = useRef(0);
  const lastMsgAt = useRef(Date.now());
  const askedIdle = useRef(false);
  const goUrlRef = useRef<(url: string) => void>(() => {});
  const askSnap = useCallback(() => {
    const now = Date.now();
    if (now - lastAsk.current < 1500) return;
    lastAsk.current = now;
    sendRef.current({ k: 'need-snap' });
  }, []);

  const { link, send, supabase } = useClassChannel({
    studentId,
    presence: () => ({ role: 'teacher', at: Date.now() }),
    onMessage: (m) => {
      if (m.k === 'go') {
        // учень сам перегорнув сторінку — відкриваємо її обом
        goUrlRef.current(m.url);
        return;
      }
      if (m.k !== 'rr') return;
      lastMsgAt.current = Date.now();
      askedIdle.current = false;
      // пакет загубився по дорозі — далі картинка була б застарілою, тому просимо свіжий знімок
      if (typeof m.n === 'number') {
        if (expectSeq.current && m.n !== expectSeq.current) askSnap();
        expectSeq.current = m.n + 1;
      }
      onRR(m.d);
    },
    onPresence: (all) => {
      const stu = all.filter((p) => p.role === 'student');
      // учень може бути в кількох вкладках: головна — та, що вже в класі
      const s = stu.find((p) => p.mode === 'class') ?? stu.find((p) => p.mode === 'lobby') ?? stu[0] ?? null;
      setStudent(s);
      if (!s) {
        gotFrame.current = false;
        setHasFrame(false);
        expectSeq.current = 0;
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

  // якщо останній пакет не доїхав, а учень сидить тихо — картинка залишилась би старою назавжди
  useEffect(() => {
    if (!hasFrame) return;
    const id = setInterval(() => {
      if (askedIdle.current || Date.now() - lastMsgAt.current < 15_000) return;
      askedIdle.current = true;
      askSnap();
    }, 5000);
    return () => clearInterval(id);
  }, [hasFrame, askSnap]);

  // зміна зуму — одразу перемальовуємо
  useEffect(() => {
    fit();
  }, [zoom, fit]);

  // великий екран: дзеркало переїжджає в інший контейнер, тому просимо намалювати заново
  useEffect(() => {
    gotFrame.current = false;
    setHasFrame(false);
    repRef.current?.destroy?.();
    repRef.current = null;
    sendRef.current({ k: 'need-snap' });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBig(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [big]);

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
    expectSeq.current = 0;
    send({ k: 'room', room: next });
  }

  const zoomNow = () => {
    const stage = stageRef.current;
    const vp = viewport.current;
    if (!stage || !vp) return 1;
    const byW = stage.clientWidth / vp.w;
    if (zoomRef.current === 'all') return Math.min(1, byW, stage.clientHeight / vp.h);
    return Math.min(1, byW);
  };

  const course = useSteps(courseSlug || null);

  // нотатки викладача (сторінка «TEACHER · …») для обраної лекції
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<{ title: string; html: string } | null>(null);
  useEffect(() => {
    setNotes(null);
    if (!courseSlug) return;
    let dead = false;
    fetch(`/api/learn/teacher-notes?slug=${encodeURIComponent(courseSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !dead && setNotes(d?.notes ?? null))
      .catch(() => undefined);
    return () => {
      dead = true;
    };
  }, [courseSlug]);
  const inCourse = isCourseRoom(room) && room.active && room.lesson_id === courseSlug;

  const stepIdx = inCourse && course ? course.steps.findIndex((s) => s.url === room.blocks) : -1;
  const goStep = (d: 1 | -1) => {
    if (!course || stepIdx < 0 || busy) return;
    const st = course.steps[stepIdx + d];
    if (st) void pickStep(st);
  };
  const goRef = useRef(goStep);
  goRef.current = goStep;
  useEffect(() => {
    // ← → гортають сторінки учня (якщо фокус не в полі вводу)
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') goRef.current(1);
      else if (e.key === 'ArrowLeft') goRef.current(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pickStep = (st: StepDTO) =>
    setRoomState({ active: true, lesson_id: courseSlug, embed: COURSE_EMBED, blocks: st.url });

  // учень може гортати сам: беремо лише кроки поточної лекції
  goUrlRef.current = (urlFromStudent: string) => {
    if (!course || !room.active || busy) return;
    const st = course.steps.find((x) => x.url === urlFromStudent);
    if (st && st.url !== room.blocks) void pickStep(st);
  };
  const startCourse = () => {
    if (!course) return;
    // з залу очікування повертаємось туди, де зупинились, а не на початок
    const resume =
      room.lesson_id === courseSlug && isCourseRoom(room) ? course.steps.find((s) => s.url === room.blocks) : undefined;
    const st = resume ?? course.steps[0];
    if (st) pickStep(st);
  };

  /** Завершити лекцію: запис в історію учня + автоматично задається домашка */
  async function finishLecture() {
    if (!courseSlug || !course) return;
    setBusy(true);
    setErr(null);
    const { data: prev } = await supabase
      .from('lesson_progress')
      .select('homework_assigned_at')
      .eq('student_id', studentId)
      .eq('lesson_slug', courseSlug)
      .maybeSingle();
    const now = new Date().toISOString();
    const { error } = await supabase.from('lesson_progress').upsert({
      student_id: studentId,
      lesson_slug: courseSlug,
      completed_at: now,
      completed_via: 'class',
      homework_assigned_at: prev?.homework_assigned_at ?? (course.hasHomework ? now : null),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(course.hasHomework ? 'Лекцію завершено, домашку задано.' : 'Лекцію завершено (домашки в цьому уроці немає).');
  }

  const enter = () =>
    setRoomState({ active: true, lesson_id: lessonId, embed, blocks: embed === 'grammar' && blocks.trim() ? blocks.trim() : null });
  const leave = () => setRoomState({ ...EMPTY_ROOM, lesson_id: room.lesson_id, embed: room.embed, blocks: room.blocks });

  // колесо над дзеркалом гортає сторінку в самого учня
  const pultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = pultRef.current;
    if (!el || !pult) return;
    let acc = 0;
    let t: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      t = null;
      if (!acc) return;
      sendRef.current({ k: 'scroll', dy: acc });
      acc = 0;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      if (!t) t = setTimeout(flush, 70);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (t) clearTimeout(t);
    };
  }, [pult, hasFrame]);

  // з пультом набір з клавіатури йде в поле учня (← → лишаються гортанням сторінок)
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e: KeyboardEvent) => {
    if (!pultOn.current) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) && t.ownerDocument === document) return;
    // AltGr (Ctrl+Alt) дає польські літери — їх пропускаємо, справжні комбінації — ні
    if (e.metaKey) return;
    if (e.ctrlKey && !e.altKey) return;
    if (e.altKey && !e.ctrlKey && [...e.key].length !== 1) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') return;
    if ([...e.key].length === 1 || e.key === 'Backspace' || e.key === 'Enter') {
      e.preventDefault();
      void sendRef.current({ k: 'key', key: e.key });
    }
  };

  // символи, що приходять не клавішею (мертві клавіші, підказки, вставка)
  const onInputRef = useRef<(e: Event) => void>(() => {});
  onInputRef.current = (ev: Event) => {
    const e = ev as InputEvent;
    if (!pultOn.current || !e.data) return;
    const t = e.target as HTMLElement | null;
    if (t && t.ownerDocument === document) return; // викладач пише у своє поле
    if (e.inputType !== 'insertText' && e.inputType !== 'insertCompositionText') return;
    e.preventDefault();
    for (const ch of e.data) void sendRef.current({ k: 'key', key: ch });
  };

  useEffect(() => {
    if (!pult || !hasFrame) return;
    const onKey = (e: KeyboardEvent) => onKeyRef.current(e);
    const onInput = (e: Event) => onInputRef.current(e);
    pultRef.current?.focus();
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeinput', onInput, true);
    // дзеркало повторює фокус учня і забирає клавіатуру собі: слухаємо клавіші й усередині нього
    const hook = setInterval(() => {
      const doc = repRef.current?.iframe?.contentDocument as (Document & { __wwKeys?: boolean }) | null | undefined;
      if (doc && !doc.__wwKeys) {
        doc.__wwKeys = true;
        doc.addEventListener('keydown', onKey, true);
        doc.addEventListener('beforeinput', onInput, true);
      }
    }, 300);
    return () => {
      clearInterval(hook);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeinput', onInput, true);
      const doc = repRef.current?.iframe?.contentDocument as (Document & { __wwKeys?: boolean }) | null | undefined;
      if (doc) {
        doc.__wwKeys = false;
        doc.removeEventListener('keydown', onKey, true);
        doc.removeEventListener('beforeinput', onInput, true);
      }
    };
  }, [pult, hasFrame]);

  function onStageClick(e: React.MouseEvent<HTMLDivElement>) {
    // тримаємо фокус на накладці: інакше клавіші йдуть у дзеркало й не доходять до учня
    e.currentTarget.focus();
    const rep = repRef.current;
    const vp = viewport.current;
    if (!pult || !rep || !vp) return;
    const r = e.currentTarget.getBoundingClientRect();
    const k = r.width / vp.w;
    const doc = rep.iframe?.contentDocument;
    if (!doc) return;
    // вправа лекції — це ще один iframe усередині сторінки: elementFromPoint крізь кадри не бачить
    // і повертає сам кадр, тому в учня «клікало» по кадру, а не по полю. Спускаємось усередину.
    let hitDoc: Document = doc;
    let x = (e.clientX - r.left) / k;
    let y = (e.clientY - r.top) / k;
    let el = hitDoc.elementFromPoint(x, y);
    let deep = false;
    for (let i = 0; i < 4 && el && el.tagName === 'IFRAME'; i++) {
      const frame = el as HTMLIFrameElement;
      let inner: Document | null = null;
      try {
        inner = frame.contentDocument;
      } catch {
        inner = null;
      }
      if (!inner) break;
      const fr = frame.getBoundingClientRect();
      const bx = parseFloat(getComputedStyle(frame).borderLeftWidth) || 0;
      const by = parseFloat(getComputedStyle(frame).borderTopWidth) || 0;
      const nx = x - fr.left - bx;
      const ny = y - fr.top - by;
      const next = inner.elementFromPoint(nx, ny);
      if (!next) break;
      hitDoc = inner;
      x = nx;
      y = ny;
      el = next;
      deep = true;
    }
    if (!el) return;
    const id = rep.getMirror().getId(el);
    // запасний шлях по дереву годиться лише для верхнього документа: у вкладеному кадрі
    // такий самий шлях привів би в учня до зовсім іншого елемента
    if (id > 0) send({ k: 'click', id, tag: el.tagName, text: shortText(el), path: deep ? undefined : elementPath(el) });
  }

  const where = !student
    ? 'не в мережі'
    : student.mode === 'class'
      ? 'у класі'
      : student.mode === 'site'
        ? 'на сайті'
        : 'у залі очікування';
  const dot = !student ? 'bg-paper-muted' : student.mode === 'class' ? 'bg-correct' : 'bg-gold-fill';

  const zoomControls = (
          <div className="ww-zoom">
            <span className="ww-zoom-label">Масштаб</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, (typeof z === 'number' ? z : zoomNow()) / ZOOM_STEP))}
              className="ww-btn ww-btn-secondary ww-btn-sm"
              aria-label="Зменшити"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, (typeof z === 'number' ? z : zoomNow()) * ZOOM_STEP))}
              className="ww-btn ww-btn-secondary ww-btn-sm"
              aria-label="Збільшити"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => setZoom('fit')}
              className={`ww-btn ww-btn-sm ${zoom === 'fit' ? 'ww-btn-primary' : 'ww-btn-secondary'}`}
              title="Як на екрані учня"
            >
              як в учня
            </button>
            <button
              type="button"
              onClick={() => setZoom('all')}
              className={`ww-btn ww-btn-sm ${zoom === 'all' ? 'ww-btn-primary' : 'ww-btn-secondary'}`}
            >
              вмістити
            </button>
          </div>
  );

  /** Кнопки панелі в порядку важливості: те, що не влізло, Toolbar ховає в «Ще» */
  const barItems = (inBig: boolean): ToolbarItem[] => {
    const list: ToolbarItem[] = [];
    const showPrimary = courseSlug ? !inCourse : true;
    if (!inBig && showPrimary)
      list.push({
        id: 'enter',
        label: room.active ? 'Перейти' : 'У клас',
        node: (
          <button
            type="button"
            onClick={courseSlug ? startCourse : enter}
            disabled={busy || (courseSlug ? !course : !lessonId)}
            className="ww-btn ww-btn-primary ww-btn-sm"
          >
            {room.active ? 'Перейти сюди' : 'У клас'}
          </button>
        ),
      });
    list.push({
      id: 'pult',
      label: 'Пульт',
      node: (
        <Switch
          checked={pult}
          onChange={setPult}
          label="Пульт"
          hint="Клік по екрану = клік в учня, колесо = прокрутка, набір з клавіатури — у поле учня"
        />
      ),
    });
    if (hasFrame) list.push({ id: 'zoom', label: 'Масштаб', node: zoomControls });
    list.push({
      id: 'big',
      label: inBig ? 'Згорнути' : 'Великий екран',
      node: (
        <button type="button" onClick={() => setBig(!inBig)} className="ww-btn ww-btn-secondary ww-btn-sm">
          {inBig ? 'Згорнути (Esc)' : '⤢ Великий екран'}
        </button>
      ),
    });
    if (!inBig && courseSlug)
      list.push({
        id: 'finish',
        label: 'Завершити лекцію',
        node: (
          <button type="button" onClick={finishLecture} disabled={busy || !course} className="ww-btn ww-btn-success ww-btn-sm">
            Завершити лекцію
          </button>
        ),
      });
    if (!inBig && room.active)
      list.push({
        id: 'lobby',
        label: 'У зал очікування',
        node: (
          <button type="button" onClick={leave} disabled={busy} className="ww-btn ww-btn-ghost ww-btn-sm">
            У зал очікування
          </button>
        ),
      });
    if (!inBig && courseSlug && notes)
      list.push({
        id: 'notes',
        label: 'Нотатки викладача',
        node: (
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            aria-expanded={notesOpen}
            className={`ww-btn ww-btn-sm ${notesOpen ? 'ww-btn-accent' : 'ww-btn-secondary'}`}
          >
            📋 Нотатки
          </button>
        ),
      });
    return list;
  };

  const stageBox = (
    <div
      ref={stageRef}
      className={
        big
          ? 'cls-stage min-w-0 flex-1 overflow-auto'
          : 'cls-stage min-w-0 overflow-auto rounded-lg border border-ink-line md:max-h-[calc(100vh-11rem)]'
      }
    >
        <div ref={turnRef} className={`relative mx-auto ${hasFrame ? '' : 'hidden'}`} style={{ width: 'fit-content' }}>
          <div ref={mountRef} className="cls-mirror relative overflow-hidden" />
          {pult && hasFrame && (
            <div
              ref={pultRef}
              onClick={onStageClick}
              tabIndex={-1}
              className="absolute inset-0 cursor-pointer outline-none ring-2 ring-gold/60"
              title="Пульт: клік = клік в учня, колесо = прокрутка, набір з клавіатури = у поле учня"
            />
          )}
        </div>
        {!hasFrame && (
          <p className="px-4 py-16 text-center text-paper-muted">
            {!student
              ? 'Учня немає в мережі. Він має увійти на сайт.'
              : student.mode === 'site'
                ? 'Учень на сайті. Оберіть урок і натисніть «У клас» — його перекине сюди.'
                : student.mode !== 'class'
                  ? 'Учень у класі й чекає. Оберіть урок і натисніть «У клас».'
                : 'Чекаю на екран учня…'}
          </p>
        )}
    </div>
  );

  return (
    <div className="mx-auto max-w-[2200px] px-3 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-paper">{studentName}</h1>
          <a href={`/teacher/students/${studentId}`} className="ww-btn ww-btn-secondary ww-btn-sm">
            Профіль учня
          </a>
        </div>
        <div className="flex items-center gap-4 text-sm text-paper-muted">
          <span className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
            {where}
          </span>
          <span>{link === 'online' ? 'канал: ок' : link === 'connecting' ? 'канал: підключення…' : 'канал: немає зв’язку'}</span>
        </div>
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <div className="ww-bar flex-wrap">
          <label className="ww-field min-w-[16rem] flex-1">
            <span>Що проводимо</span>
            <select
              value={courseSlug}
              onChange={(e) => {
                setCourseSlug(e.target.value);
                setDone(null);
              }}
            >
              <option value="">Окрема вправа (без лекції)</option>
              {[...new Set(pages.map((p) => p.group ?? 'Лекції'))].map((g) => (
                <optgroup key={g} label={g}>
                  {pages
                    .filter((p) => (p.group ?? 'Лекції') === g)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          {!courseSlug && (
            <>
              <label className="ww-field min-w-[14rem] flex-1">
                <span>Урок</span>
                <select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="ww-field min-w-[11rem]">
                <span>Що відкрити</span>
                <select value={embed} onChange={(e) => setEmbed(e.target.value)}>
                  {CLASS_EMBEDS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {embed === 'grammar' && (
                <label className="ww-field w-36">
                  <span>Блоки (g2-g5)</span>
                  <input value={blocks} onChange={(e) => setBlocks(e.target.value)} />
                </label>
              )}
            </>
          )}
        </div>
        <div className="ww-bar">
          <Toolbar items={barItems(false)} />
        </div>
      </div>
      {inCourse && (
        <p className="mb-3 text-xs text-paper-muted">
          ← → гортають сторінки в учня. З пультом: клік по екрану = клік в учня, колесо = прокрутка, а те, що
          набираєш на клавіатурі, пишеться в поле учня.
        </p>
      )}
      {err && <p className="mb-3 text-incorrect">Не вдалося: {err}</p>}
      {done && <p className="mb-3 text-correct">{done}</p>}

      <div
        className={
          courseSlug && course
            ? notesOpen && notes
              ? 'grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)_22rem]'
              : 'grid gap-3 md:grid-cols-[13rem_minmax(0,1fr)]'
            : ''
        }
      >
      {courseSlug && course && (
        <aside className="md:sticky md:top-4 md:max-h-[calc(100vh-11rem)] md:self-start md:overflow-y-auto">
          <p className="mb-3 font-display text-base text-paper">{course.title}</p>
          <StepNav steps={course.steps} currentUrl={inCourse ? room.blocks : null} onPick={pickStep} disabled={busy} />
        </aside>
      )}
      <div className="min-w-0 md:sticky md:top-4 md:self-start">
      {inCourse && course && stepIdx >= 0 && (
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => goStep(-1)}
            disabled={busy || stepIdx <= 0}
            className="ww-btn ww-btn-secondary"
          >
            ‹ Назад
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-sm text-paper-muted">
            <b className="text-paper">
              {stepIdx + 1} / {course.steps.length}
            </b>{' '}
            {course.steps[stepIdx].section}
            {course.steps[stepIdx].kind !== 'text' && course.steps[stepIdx].kind !== 'goal' && `: ${course.steps[stepIdx].label}`}
          </p>
          <button
            type="button"
            onClick={() => goStep(1)}
            disabled={busy || stepIdx >= course.steps.length - 1}
            className="ww-btn ww-btn-primary"
          >
            Далі ›
          </button>
        </div>
      )}
      {!big && stageBox}
      </div>
      {notesOpen && notes && (
        <aside className="lp-root min-w-0 rounded-lg border border-ink-line bg-ink-raised p-4 xl:max-h-[85vh] xl:overflow-y-auto" aria-label="Нотатки викладача">
          <p className="mb-2 text-xs text-paper-muted">Бачиш лише ти</p>
          <p className="mb-3 font-display text-base text-paper">{notes.title}</p>
          <div className="lp-prose" style={{ fontSize: '.95rem' }} dangerouslySetInnerHTML={{ __html: notes.html }} />
        </aside>
      )}
      </div>
      {big && (
        <div className="fixed inset-0 z-50 flex flex-col bg-ink">
          <div className="flex flex-wrap items-center gap-2 border-b border-ink-line px-3 py-2">
            <span className="truncate font-display text-paper">{studentName}</span>
            {inCourse && course && stepIdx >= 0 && (
              <>
                <button
                  type="button"
                  onClick={() => goStep(-1)}
                  disabled={busy || stepIdx <= 0}
                  className="ww-btn ww-btn-secondary ww-btn-sm"
                >
                  ‹ Назад
                </button>
                <span className="min-w-0 truncate text-sm text-paper-muted">
                  <b className="text-paper">
                    {stepIdx + 1} / {course.steps.length}
                  </b>{' '}
                  {course.steps[stepIdx].section}
                </span>
                <button
                  type="button"
                  onClick={() => goStep(1)}
                  disabled={busy || stepIdx >= course.steps.length - 1}
                  className="ww-btn ww-btn-primary ww-btn-sm"
                >
                  Далі ›
                </button>
              </>
            )}
            <Toolbar items={barItems(true)} className="ml-auto" />
          </div>
          {stageBox}
        </div>
      )}
    </div>
  );
}
