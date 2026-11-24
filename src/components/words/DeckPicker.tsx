'use client';


import { useT } from '@/i18n/client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WordsPanel } from '@/components/dock/WordsPanel';

export type DeckInfo = {
  slug: string;
  title: string;
  level: string | null;
  icon: string | null;
  cover: string | null;
  total: number;
  known: number;
  groups: string[];
  addedAt: string | null;
  /** «Мої колоди» — власні слова по 20 у колоді */
  folder?: 'mine';
};

const MODES = [
  { id: 'cards', label: 'Картки', hint: 'гортай, познач «знаю»' },
  { id: 'match', label: 'Пари', hint: 'з’єднуй слово й переклад' },
  { id: 'quiz', label: 'Тест', hint: 'обери правильний переклад' },
] as const;

export function DeckPicker({ decks: lectureDecks, mine = [], userId }: { decks: DeckInfo[]; mine?: DeckInfo[]; userId?: string }) {
  const t = useT();
  const router = useRouter();
  const [manage, setManage] = useState(false);
  const decks = [...mine, ...lectureDecks];
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (s: string) => setSel((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));
  const chosen = decks.filter((d) => sel.includes(d.slug));
  const words = chosen.reduce((n, d) => n + d.total, 0);
  const known = chosen.reduce((n, d) => n + d.known, 0);

  if (!decks.length && !userId) {
    return (
      <div className="rounded-2xl border border-ink-line bg-ink-raised p-8 text-center text-paper-muted">
        {t("Тут з’являтимуться слова з кожної пройденої лекції. Поки лекцій немає.")}
      </div>
    );
  }

  const href = (mode: string) => `/words/play?decks=${sel.join(',')}&mode=${mode}`;

  return (
    <>
      <div className="mb-3 flex items-center justify-between text-sm text-paper-muted">
        <span>
          {decks.length} {decks.length === 1 ? t("колода") : t("колод")}
        </span>
        <button
          type="button"
          className="text-gold hover:text-gold-bright"
          onClick={() => setSel(sel.length === decks.length ? [] : decks.map((d) => d.slug))}
        >
          {sel.length === decks.length ? t("Зняти вибір") : t("Вибрати всі")}
        </button>
      </div>

      {userId && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-line bg-ink-raised p-4">
          <div className="min-w-0">
            <p className="font-display text-lg text-paper">{t('Мої колоди')}</p>
            <p className="text-sm text-paper-muted">{t('Свої слова: по 20 у колоді, заповнилась — створюється нова. Тут їх можна правити й видаляти.')}</p>
          </div>
          <button type="button" className="ww-btn ww-btn-primary" onClick={() => setManage(true)} data-testid="words-manage">
            {t('＋ Додати / редагувати слова')}
          </button>
        </div>
      )}
      {manage && userId && (
        <div className="ww-wmodal" role="dialog" aria-modal="true" aria-label={t('Мої слова')} onClick={(e) => e.target === e.currentTarget && (setManage(false), router.refresh())}>
          <div className="ww-wmodal-card">
            <div className="ww-wmodal-head">
              <p className="font-display text-lg text-paper">{t('Мої слова')}</p>
              <button type="button" className="ww-btn ww-btn-ghost ww-btn-sm" onClick={() => { setManage(false); router.refresh(); }}>
                {t('Закрити')}
              </button>
            </div>
            <div className="ww-wmodal-body">
              <WordsPanel ownerId={userId} />
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 pb-32 md:grid-cols-2">
        {decks.map((d) => {
          const on = sel.includes(d.slug);
          const pct = d.total ? Math.round((d.known / d.total) * 100) : 0;
          return (
            <button
              type="button"
              key={d.slug}
              onClick={() => toggle(d.slug)}
              aria-pressed={on}
              className={`overflow-hidden rounded-2xl border bg-ink-raised text-left transition-all ${
                on ? 'border-gold shadow-[0_0_0_3px_rgba(122,79,224,.7)]' : 'border-ink-line hover:border-gold/50'
              }`}
            >
              {d.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.cover} alt="" className="h-16 w-full object-cover" loading="lazy" />
              )}
              <div className="p-4">
                <div className="mb-1 flex items-center gap-2 ww-label">
                  {d.level && <span className="rounded bg-gold-fill px-1.5 py-0.5 text-paper">{d.level}</span>}
                  {d.folder === 'mine' && <span className="rounded bg-sky-fill px-1.5 py-0.5 text-paper">{t('Мої')}</span>}
                  <span>{d.total} слів</span>
                  <span className="ml-auto text-sm">{on ? '☑' : '☐'}</span>
                </div>
                <p className="font-display text-lg leading-snug text-paper">
                  {d.icon} {d.title}
                </p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-paper-muted">
                    <span>{t("запам’ятав")}</span>
                    <span className="font-mono text-paper">
                      {d.known}/{d.total}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-ink-line/70">
                    <div className="h-full rounded-full bg-gold-solid" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-10 border-t lg:bottom-0 border-ink-line bg-ink-raised/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-paper-muted">
            {sel.length === 0 ? (
              t("Обери колоду (або кілька — вони зіллються в одну)")
            ) : (
              <>
                <b className="text-paper">{sel.length === 1 ? chosen[0].title : t('{n} колоди разом', { n: sel.length })}</b> · {words} слів,{' '}
                {known} запам’ятано
              </>
            )}
          </p>
          {MODES.map((m) =>
            sel.length ? (
              <Link
                key={m.id}
                href={href(m.id)}
                title={t(m.hint)}
                className="ww-btn ww-btn-primary"
              >
                {t(m.label)}
              </Link>
            ) : (
              <span key={m.id} className="rounded-lg bg-ink-soft px-4 py-2 text-sm text-paper-muted opacity-60">
                {t(m.label)}
              </span>
            )
          )}
        </div>
      </div>
    </>
  );
}
