import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  // під час серверного рендеру (useMemo в клієнтських компонентах) — звичайний клієнт без кешу:
  // спільний на рівні модуля він був би один на всі запити
  if (typeof window === 'undefined') return createBrowserClient(url, key);
  client ??= createBrowserClient(url, key, {
    realtime: {
      // Клас тримається на Realtime. У фоновій вкладці (чи коли вікно браузера закрите Zoom-ом) Chrome
      // придушує таймери, серцебиття не доходить, і з'єднання тихо вмирає: учень «не в мережі», команди
      // викладача губляться. Серцебиття у Web Worker браузер не душить.
      worker: true,
      // запасний шлях: якщо серцебиття все ж зірвалось — одразу перепідключаємось, а не чекаємо хвилину
      heartbeatCallback: (status) => {
        if (status === 'disconnected' || status === 'timeout') client?.realtime.connect();
      },
    },
  });
  return client;
}
