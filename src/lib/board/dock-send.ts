import type { SupabaseClient } from '@supabase/supabase-js';
import { DOCK_EVENT, dockTopic, type DockMsg } from '@/lib/dock/protocol';

/** Разове повідомлення в приватний канал dock:<uid> (запрошення/виключення з дошки): підписались → надіслали → закрили. */
export async function sendDock(supabase: SupabaseClient, uid: string, msgs: DockMsg[]): Promise<boolean> {
  const ch = supabase.channel(dockTopic(uid), { config: { private: true, broadcast: { ack: true, self: false } } });
  try {
    const ok = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 6000);
      ch.subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          clearTimeout(timer);
          resolve(true);
        } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
          clearTimeout(timer);
          resolve(false);
        }
      });
    });
    if (!ok) return false;
    for (const m of msgs) {
      if ((await ch.send({ type: 'broadcast', event: DOCK_EVENT, payload: m })) !== 'ok') return false;
    }
    return true;
  } finally {
    void supabase.removeChannel(ch);
  }
}
