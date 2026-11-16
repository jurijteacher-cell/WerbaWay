import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/i18n/server';

export const metadata: Metadata = { title: 'Werba Way — Privacy' };

/**
 * Політика конфіденційності — публічна сторінка (її вимагає Google для входу через Google).
 * Текст описує те, що сайт реально робить; змінюєш обробку даних — онови й тут, і дату.
 */
const UPDATED = '16.11.2026';
const CONTACT = 'werbaway@gmail.com';

export default function PrivacyPage() {
  const sections: { h: string; p: string[] }[] = [
    {
      h: t('Хто ми'),
      p: [t('Werba Way — онлайн-школа польської мови. Сайт werbaway.com — це курс, вправи й особистий кабінет учня та викладача.')],
    },
    {
      h: t('Які дані ми збираємо'),
      p: [
        t("Акаунт: адреса пошти, ім'я та прізвище, пароль (зберігається лише у вигляді хешу)."),
        t("Вхід через Google: від Google ми отримуємо лише ім'я, адресу пошти й ідентифікатор акаунта. Доступу до ваших листів, файлів чи контактів у нас немає."),
        t('Навчання: відповіді у вправах, домашні завдання, прогрес у лекціях і словах, вибрана мова інтерфейсу.'),
        t('Перегляд екрана: коли викладач натискає «Дивитися», а учень у лекції, викладач бачить екран лекції наживо. Учень бачить про це позначку. Запис нікуди не зберігається.'),
      ],
    },
    {
      h: t('Навіщо'),
      p: [t('Щоб ви могли входити, проходити курс, бачити свій прогрес, а викладач — перевіряти завдання й допомагати. Ми не продаємо дані, не показуємо рекламу й не передаємо дані для маркетингу.')],
    },
    {
      h: t('Хто ще обробляє дані'),
      p: [
        t('Supabase — база даних і вхід (сервери в Лондоні, Велика Британія).'),
        t('Vercel — хостинг сайту.'),
        t('Resend — надсилання листів (підтвердження пошти, скидання пароля, запрошення).'),
        t('Google — лише якщо ви обираєте «Увійти через Google».'),
      ],
    },
    {
      h: t('Куки'),
      p: [t('Сайт використовує лише потрібні куки: сесію входу й вибрану мову. Рекламних і стороннього відстеження немає.')],
    },
    {
      h: t('Ваші права'),
      p: [t('Ви можете попросити показати, виправити або видалити ваші дані й акаунт — напишіть на {email}, і ми це зробимо.', { email: CONTACT })],
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 font-display text-4xl text-paper">{t('Політика конфіденційності')}</h1>
      <p className="mb-10 text-sm text-paper-muted">{t('Оновлено: {date}', { date: UPDATED })}</p>
      <div className="flex flex-col gap-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="mb-2 font-display text-xl text-paper">{s.h}</h2>
            {s.p.map((x) => (
              <p key={x} className="mb-2 leading-relaxed text-paper-muted">
                {x}
              </p>
            ))}
          </section>
        ))}
        <section>
          <h2 className="mb-2 font-display text-xl text-paper">{t('Контакт')}</h2>
          <p className="leading-relaxed text-paper-muted">
            <a href={`mailto:${CONTACT}`} className="text-gold hover:text-gold-bright">
              {CONTACT}
            </a>
          </p>
        </section>
      </div>
      <p className="mt-12 text-sm">
        <Link href="/login" className="text-paper-muted hover:text-gold">
          {t('← До входу')}
        </Link>
      </p>
    </main>
  );
}
