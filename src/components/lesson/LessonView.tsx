import Link from 'next/link';
import { buildPages, type ParsedPage } from '@/lib/pages/pages';
import { HomeworkDone } from './HomeworkDone';
import { Blocks } from './LessonBlocks';
import { LessonPager } from './LessonPager';
import { PageList } from './PageList';
import { ShareButton } from './ShareButton';
import './lesson.css';
import { t } from '@/i18n/server';
import { imgProps } from '@/lib/img';

type Props = {
  page: ParsedPage;
  mode: 'lecture' | 'homework';
  /** lecture mode: номер сторінки (з 0) */
  pageIndex?: number;
  /** показати викладачеві посилання на його нотатки */
  teacherNotes?: boolean;
  /** homework mode: стан із lesson_progress */
  hw?: { assigned: boolean; done: boolean } | null;
  /** публічне посилання: адреса лекції /s/<токен>, без меню сайту */
  publicBase?: string;
  /** викладач: кнопка «Поділитися» */
  canShare?: boolean;
};

export function LessonView({ page, mode, hw, pageIndex = 0, teacherNotes, publicBase, canShare }: Props) {
  const base = publicBase ?? `/learn/${page.meta.slug}`;
  const { meta, sections } = page;
  const book = buildPages(page);
  const lecture = sections.filter((s) => s.kind === 'lecture');
  const homework = sections.filter((s) => s.kind === 'homework');

  const exercises = lecture.reduce((n, s) => n + s.blocks.filter((b) => b.k === 'embed').length, 0);

  return (
    <main className="lp-root">
      <LessonHero meta={meta}>
        {canShare && (
          <div className="mb-4">
            <ShareButton slug={meta.slug} title={meta.title} />
          </div>
        )}
        <dl className="lp-props">
          {mode === 'homework' && (
            <div>
              <dt>{t("Сторінка")}</dt>
              <dd>
                <span className="lp-chip lp-badge-hw">{t("Домашнє завдання")}</span>
              </dd>
            </div>
          )}
          {meta.level && (
            <div>
              <dt>{t("Рівень")}</dt>
              <dd>
                <span className="lp-chip lp-chip-level">{meta.level}</span>
              </dd>
            </div>
          )}
          {meta.moduleTitle && (
            <div>
              <dt>{t("Курс")}</dt>
              <dd>
                {meta.moduleTitle}
                {meta.number != null && <span className="lp-muted">, урок {meta.number}</span>}
              </dd>
            </div>
          )}
          {mode === 'lecture' && exercises > 0 && (
            <div>
              <dt>{t("Вправи")}</dt>
              <dd>{exercises} інтерактивних вікон</dd>
            </div>
          )}
          {teacherNotes && (
            <div>
              <dt>{t("Викладачеві")}</dt>
              <dd>
                <Link href={`/teacher/lesson/${meta.slug}`}>{t("Нотатки до уроку")}</Link>
              </dd>
            </div>
          )}
          {page.hasHomework && (
            <div>
              <dt>{mode === 'homework' ? t("Лекція") : t("Домашка")}</dt>
              <dd>
                {mode === 'homework' ? (
                  <Link href={base}>{t("Повернутися до лекції")}</Link>
                ) : (
                  <Link href={`${base}/hw`}>{t("Відкрити домашнє завдання")}</Link>
                )}
              </dd>
            </div>
          )}
        </dl>
      </LessonHero>

      {mode === 'lecture' && (
        <LessonPager
          slug={meta.slug}
          pages={book}
          initial={pageIndex}
          hasHomework={page.hasHomework}
          base={base}
          doneHref={publicBase ? null : '/learn'}
        />
      )}

      {mode === 'homework' && (
        <div className="lp-layout">
          <div className="lp-col">
            <article className="lp-prose">
              {homework.map((s) => (
                <Blocks key={s.id} blocks={s.blocks} />
              ))}
            </article>
            {hw && <HomeworkDone slug={meta.slug} assigned={hw.assigned} done={hw.done} />}
          </div>
        </div>
      )}
    </main>
  );
}

/** Шапка сторінки як у Notion: обкладинка на всю ширину, іконка-наліпка, заголовок, властивості */
function LessonHero({ meta, children }: { meta: ParsedPage['meta']; children: React.ReactNode }) {
  return (
    <header className="lp-hero">
      <div className="lp-cover-wrap">
        {meta.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            {...imgProps(meta.cover, { width: 1280, height: 300, sizes: '100vw' })}
            alt=""
            className="lp-cover"
            fetchPriority="high"
            decoding="async"
          />
        ) : (
          <div className="lp-cover lp-cover-empty" />
        )}
        <div className="lp-stripe" aria-hidden="true" />
      </div>
      <div className="lp-hero-body">
        <div className="lp-icon" aria-hidden="true">
          {meta.icon ?? '📘'}
        </div>
        <h1>{meta.title}</h1>
        {children}
      </div>
    </header>
  );
}
