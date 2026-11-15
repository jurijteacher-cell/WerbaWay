import 'server-only';

/**
 * Пошта сайту — через Resend (домен werbaway.com, DNS-записи в Namecheap).
 * Ключ у Vercel: RESEND_API_KEY (або змінна `Resend`, як її назвали при підключенні).
 * Відповідь учня йде на адресу викладача (reply_to), тож листування живе у звичайній пошті Юри.
 */
const resendKey = () => process.env.RESEND_API_KEY ?? process.env.Resend ?? process.env.RESEND;

export const MAIL_FROM = process.env.MAIL_FROM ?? 'Werba Way <school@werbaway.com>';

export const mailConfigured = () => !!resendKey();

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Простий лист: текст викладача абзацами + підпис школи. HTML лише з екранованого тексту. */
export function letterHtml(text: string, signature: string): string {
  const paras = text
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!doctype html><html><body style="margin:0;background:#f3f5fc;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#1c2348">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dde3f3;border-radius:16px;padding:24px 24px 18px;font-size:16px;line-height:1.55">
${paras}
<p style="margin:18px 0 0;color:#5d6689;font-size:14px">${esc(signature)}<br><a href="https://www.werbaway.com" style="color:#7a4fe0">werbaway.com</a></p>
</div></body></html>`;
}

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail(msg: { to: string; subject: string; text: string; html?: string; replyTo?: string }): Promise<SendResult> {
  const key = resendKey();
  if (!key) return { ok: false, error: 'mail not configured' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });
    const data = (await r.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!r.ok || !data.id) return { ok: false, error: data.message ?? data.name ?? `HTTP ${r.status}` };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'network error' };
  }
}
