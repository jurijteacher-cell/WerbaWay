/**
 * Док (права панель: чат, далі слова й дошка). Канал `dock:<uid учня>` — приватний, окремий від `class:<uid>`
 * («Дивитися учня» не чіпаємо). Права доступу — supabase/migrations/0019_class_chat.sql.
 * Доставка чату: відправник робить insert у class_messages, потім шле `{k:'chat', m}` у канал;
 * історія й догрузка після обриву — select із таблиці.
 */
import { lessonSlugOf } from '@/lib/live/protocol';

export const dockTopic = (studentId: string) => `dock:${studentId}`;

/** Realtime broadcast event name for every dock message */
export const DOCK_EVENT = 'd';

export type ChatKind = 'text' | 'word' | 'board' | 'system';

export type ChatRow = {
  id: string;
  student_id: string;
  sender_id: string;
  sender_role: 'teacher' | 'student';
  kind: ChatKind;
  body: string;
  meta: Record<string, unknown> | null;
  lesson_slug: string | null;
  page_idx: number | null;
  created_at: string;
  read_at: string | null;
  deleted_at: string | null;
};

/** Рядок, якого ще немає на сервері (відправляється / не вдалося) */
export type LocalChat = ChatRow & { local?: 'sending' | 'failed' };

export type DockMsg =
  | { k: 'chat'; m: ChatRow }
  | { k: 'chat-del'; id: string }
  /** одержувач прочитав усе (відправник прибирає позначку «не прочитано») */
  | { k: 'chat-read'; by: 'teacher' | 'student'; at: string };

/** Присутність у dock: лише учень — щоб чат знав, у якій він лекції */
export type DockPresence = {
  role: 'student' | 'teacher';
  name?: string;
  path?: string;
  pg?: number;
  at: number;
};

export const CHAT_MAX = 2000;
export const CHAT_WARN = 1800;
/** скільки повідомлень рендеримо (старіші — «Показати раніше») */
export const CHAT_RENDER_MAX = 200;
export const CHAT_PAGE = 50;

/** Лекція, у якій зараз учень, за присутністю */
export const lessonCtxOf = (p: DockPresence | null | undefined): { slug: string | null; pg: number | null } => ({
  slug: lessonSlugOf(p?.path),
  pg: typeof p?.pg === 'number' ? p.pg : null,
});
