import type { Locale } from '@/i18n/config';
import type { LegalDoc } from './types';

/**
 * Політика конфіденційності. Описує те, що сайт РЕАЛЬНО робить (звірено з кодом 16.11.2026):
 * Supabase (акаунти, відповіді, прогрес), Vercel (хостинг), Resend (листи), Google (вхід — лише за вибором),
 * перегляд екрана наживо без запису, кнопка «Помилка?», картинки Unsplash, YouTube у режимі nocookie,
 * без аналітики й реклами. Змінюєш обробку даних — онови тут і LEGAL_UPDATED у types.ts.
 */
export const PRIVACY: Record<Locale, LegalDoc> = {
  uk: {
    title: 'Політика конфіденційності',
    lead: 'Як Werba Way збирає, використовує й захищає ваші дані на сайті werbaway.com. Коротко: лише те, що потрібно для навчання, без реклами й без продажу даних.',
    highlights: ['Без реклами', 'Без продажу даних', 'Без трекерів і аналітики', 'Видалення за запитом'],
    sections: [
      {
        id: 'who',
        title: 'Хто ми',
        body: [
          'Адміністратор (контролер) ваших даних — фізична особа-підприємець (Україна), власник школи польської мови Werba Way і сайту werbaway.com.',
          'З будь-яких питань про дані, а також щоб отримати копію даних чи видалити акаунт, пишіть на werbaway@gmail.com. Відповідаємо протягом 30 днів, зазвичай значно швидше.',
        ],
      },
      {
        id: 'data',
        title: 'Які дані ми обробляємо',
        body: [
          {
            list: [
              'Акаунт: адреса пошти, ім’я та прізвище. Пароль зберігається лише у вигляді хешу — ми його не бачимо.',
              'Вхід через Google: ім’я, адреса пошти, ідентифікатор акаунта й посилання на фото профілю (на сайті не показується). До ваших листів, файлів, контактів чи інших даних Google доступу в нас немає.',
              'Навчання: відповіді у вправах, домашні завдання, результати тестів і пробних іспитів, прогрес у лекціях і словах, відкриті вам курси.',
              'Налаштування: мова інтерфейсу.',
              'Повідомлення про помилку (кнопка «Помилка?»): ваш текст, адреса сторінки, тип браузера й розмір екрана.',
              'Листи від викладача: якщо викладач пише вам із сайту, зберігаються адреса й текст листа.',
              'Технічні журнали: IP-адреса, браузер і час запиту — у журналах хостингу й бази даних, для безпеки та пошуку збоїв.',
            ],
          },
        ],
      },
      {
        id: 'screen',
        title: 'Перегляд екрана викладачем',
        body: [
          'Коли викладач натискає «Дивитися», а ви саме в лекції чи домашньому завданні, він бачить вашу сторінку наживо: те, що на ній показано, і те, що ви вводите у вправи. Поля паролів приховано.',
          'Поки викладач дивиться, у вас унизу екрана є позначка «Викладач бачить твій екран». Нічого не записується й не зберігається, а поза лекціями перегляд не працює.',
        ],
      },
      {
        id: 'purpose',
        title: 'Навіщо й на якій підставі',
        body: [
          {
            list: [
              'Надати сайт і курс — акаунт, вправи, прогрес, перевірку завдань, службові листи (підтвердження пошти, новий пароль, запрошення). Підстава — виконання договору, тобто умов користування (ст. 6(1)(b) GDPR).',
              'Перегляд екрана, повідомлення про помилки й технічні журнали. Підстава — законний інтерес: якісне навчання та стабільна й безпечна робота сайту (ст. 6(1)(f) GDPR).',
            ],
          },
          'Ми не продаємо даних, не показуємо реклами, не будуємо маркетингових профілів і не ухвалюємо щодо вас автоматизованих рішень.',
        ],
      },
      {
        id: 'sharing',
        title: 'Хто ще має доступ',
        body: [
          'Ваші дані бачить лише викладач Werba Way і сервіси, які обробляють їх за нашим дорученням:',
          {
            list: [
              'Supabase — база даних і вхід (сервери в Лондоні, Велика Британія);',
              'Vercel — хостинг сайту;',
              'Resend — надсилання листів;',
              'Google — лише якщо ви обираєте «Увійти через Google».',
            ],
          },
          'Коли ви відкриваєте лекцію, браузер напряму завантажує картинки з Unsplash, а відео — з YouTube у режимі youtube-nocookie (без кук до відтворення).',
          'Частина цих сервісів працює за межами України та ЄС (Велика Британія, США). Передача відбувається з гарантіями, які вони надають: рішення ЄС про адекватність захисту або стандартні договірні умови ЄС.',
        ],
      },
      {
        id: 'retention',
        title: 'Скільки зберігаємо',
        body: [
          'Дані акаунта й навчання — поки існує акаунт. Після запиту на видалення ми видаляємо акаунт і пов’язані з ним дані протягом 30 днів.',
          'Технічні журнали зберігаються недовго — до кількох тижнів — і видаляються автоматично.',
        ],
      },
      {
        id: 'cookies',
        title: 'Куки',
        body: [
          'Сайт використовує лише потрібні для роботи куки: сесію входу й вибрану мову. Може також зберігати в браузері дрібні налаштування інтерфейсу.',
          'Рекламних, аналітичних чи сторонніх куків для відстеження немає — тому немає й банера згоди.',
        ],
      },
      {
        id: 'rights',
        title: 'Ваші права',
        body: [
          'Ви можете будь-коли:',
          {
            list: [
              'отримати копію своїх даних;',
              'виправити неточні дані;',
              'видалити акаунт і дані;',
              'обмежити обробку або заперечити проти обробки на підставі законного інтересу;',
              'отримати дані у зручному машиночитаному форматі.',
            ],
          },
          'Для цього напишіть на werbaway@gmail.com. Якщо вважаєте, що ваші права порушено, можете звернутися до Уповноваженого Верховної Ради України з прав людини або до наглядового органу своєї країни ЄС — у Польщі це Prezes Urzędu Ochrony Danych Osobowych (UODO).',
        ],
      },
      {
        id: 'security',
        title: 'Безпека',
        body: [
          'Сайт працює лише через HTTPS, паролі зберігаються як хеш, а доступ до даних обмежено правилами бази: кожен бачить лише своє, викладач — дані своїх учнів.',
          'Якщо станеться витік, що може вам зашкодити, ми повідомимо вас і відповідний орган у визначені законом строки.',
        ],
      },
      {
        id: 'age',
        title: 'Вік',
        body: ['Сайт призначений для осіб від 16 років. Якщо ми дізнаємося, що акаунт створила молодша особа, ми його видалимо.'],
      },
      {
        id: 'changes',
        title: 'Зміни',
        body: ['Дата останнього оновлення — вгорі сторінки. Про суттєві зміни ми повідомимо на сайті або листом.'],
      },
    ],
  },

  ru: {
    title: 'Политика конфиденциальности',
    lead: 'Как Werba Way собирает, использует и защищает ваши данные на сайте werbaway.com. Коротко: только то, что нужно для обучения, без рекламы и без продажи данных.',
    highlights: ['Без рекламы', 'Без продажи данных', 'Без трекеров и аналитики', 'Удаление по запросу'],
    sections: [
      {
        id: 'who',
        title: 'Кто мы',
        body: [
          'Администратор (контролёр) ваших данных — физическое лицо-предприниматель (Украина), владелец школы польского языка Werba Way и сайта werbaway.com.',
          'По любым вопросам о данных, а также чтобы получить копию данных или удалить аккаунт, пишите на werbaway@gmail.com. Отвечаем в течение 30 дней, обычно намного быстрее.',
        ],
      },
      {
        id: 'data',
        title: 'Какие данные мы обрабатываем',
        body: [
          {
            list: [
              'Аккаунт: адрес почты, имя и фамилия. Пароль хранится только в виде хеша — мы его не видим.',
              'Вход через Google: имя, адрес почты, идентификатор аккаунта и ссылка на фото профиля (на сайте не показывается). Доступа к вашим письмам, файлам, контактам и другим данным Google у нас нет.',
              'Обучение: ответы в упражнениях, домашние задания, результаты тестов и пробных экзаменов, прогресс в лекциях и словах, открытые вам курсы.',
              'Настройки: язык интерфейса.',
              'Сообщение об ошибке (кнопка «Ошибка?»): ваш текст, адрес страницы, тип браузера и размер экрана.',
              'Письма от преподавателя: если преподаватель пишет вам с сайта, сохраняются адрес и текст письма.',
              'Технические журналы: IP-адрес, браузер и время запроса — в журналах хостинга и базы данных, для безопасности и поиска сбоев.',
            ],
          },
        ],
      },
      {
        id: 'screen',
        title: 'Просмотр экрана преподавателем',
        body: [
          'Когда преподаватель нажимает «Смотреть», а вы находитесь в лекции или домашнем задании, он видит вашу страницу вживую: то, что на ней показано, и то, что вы вводите в упражнения. Поля паролей скрыты.',
          'Пока преподаватель смотрит, внизу экрана у вас есть пометка «Преподаватель видит твой экран». Ничего не записывается и не сохраняется, а вне лекций просмотр не работает.',
        ],
      },
      {
        id: 'purpose',
        title: 'Зачем и на каком основании',
        body: [
          {
            list: [
              'Предоставить сайт и курс — аккаунт, упражнения, прогресс, проверку заданий, служебные письма (подтверждение почты, новый пароль, приглашение). Основание — исполнение договора, то есть условий использования (ст. 6(1)(b) GDPR).',
              'Просмотр экрана, сообщения об ошибках и технические журналы. Основание — законный интерес: качественное обучение и стабильная, безопасная работа сайта (ст. 6(1)(f) GDPR).',
            ],
          },
          'Мы не продаём данные, не показываем рекламу, не строим маркетинговых профилей и не принимаем в отношении вас автоматизированных решений.',
        ],
      },
      {
        id: 'sharing',
        title: 'Кто ещё имеет доступ',
        body: [
          'Ваши данные видит только преподаватель Werba Way и сервисы, которые обрабатывают их по нашему поручению:',
          {
            list: [
              'Supabase — база данных и вход (серверы в Лондоне, Великобритания);',
              'Vercel — хостинг сайта;',
              'Resend — отправка писем;',
              'Google — только если вы выбираете «Войти через Google».',
            ],
          },
          'Когда вы открываете лекцию, браузер напрямую загружает картинки с Unsplash, а видео — с YouTube в режиме youtube-nocookie (без cookies до воспроизведения).',
          'Часть этих сервисов работает за пределами Украины и ЕС (Великобритания, США). Передача происходит с гарантиями, которые они предоставляют: решения ЕС об адекватности защиты или стандартные договорные условия ЕС.',
        ],
      },
      {
        id: 'retention',
        title: 'Сколько храним',
        body: [
          'Данные аккаунта и обучения — пока существует аккаунт. После запроса на удаление мы удаляем аккаунт и связанные с ним данные в течение 30 дней.',
          'Технические журналы хранятся недолго — до нескольких недель — и удаляются автоматически.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies',
        body: [
          'Сайт использует только необходимые для работы cookies: сессию входа и выбранный язык. Также может хранить в браузере мелкие настройки интерфейса.',
          'Рекламных, аналитических и сторонних cookies для отслеживания нет — поэтому нет и баннера согласия.',
        ],
      },
      {
        id: 'rights',
        title: 'Ваши права',
        body: [
          'Вы можете в любой момент:',
          {
            list: [
              'получить копию своих данных;',
              'исправить неточные данные;',
              'удалить аккаунт и данные;',
              'ограничить обработку или возразить против обработки на основании законного интереса;',
              'получить данные в удобном машиночитаемом формате.',
            ],
          },
          'Для этого напишите на werbaway@gmail.com. Если считаете, что ваши права нарушены, можете обратиться к Уполномоченному Верховной Рады Украины по правам человека или в надзорный орган своей страны ЕС — в Польше это Prezes Urzędu Ochrony Danych Osobowych (UODO).',
        ],
      },
      {
        id: 'security',
        title: 'Безопасность',
        body: [
          'Сайт работает только через HTTPS, пароли хранятся как хеш, а доступ к данным ограничен правилами базы: каждый видит только своё, преподаватель — данные своих учеников.',
          'Если произойдёт утечка, которая может вам навредить, мы сообщим вам и соответствующему органу в установленные законом сроки.',
        ],
      },
      {
        id: 'age',
        title: 'Возраст',
        body: ['Сайт предназначен для лиц от 16 лет. Если мы узнаем, что аккаунт создал человек младше, мы его удалим.'],
      },
      {
        id: 'changes',
        title: 'Изменения',
        body: ['Дата последнего обновления — вверху страницы. О существенных изменениях мы сообщим на сайте или письмом.'],
      },
    ],
  },

  pl: {
    title: 'Polityka prywatności',
    lead: 'Jak Werba Way zbiera, wykorzystuje i chroni Twoje dane w serwisie werbaway.com. W skrócie: tylko to, co potrzebne do nauki, bez reklam i bez sprzedaży danych.',
    highlights: ['Bez reklam', 'Bez sprzedaży danych', 'Bez śledzenia i analityki', 'Usunięcie na życzenie'],
    sections: [
      {
        id: 'who',
        title: 'Kim jesteśmy',
        body: [
          'Administratorem Twoich danych jest osoba fizyczna prowadząca działalność gospodarczą (Ukraina), właściciel szkoły języka polskiego Werba Way i serwisu werbaway.com.',
          'W sprawach danych, a także aby otrzymać kopię danych lub usunąć konto, napisz na werbaway@gmail.com. Odpowiadamy w ciągu 30 dni, zwykle znacznie szybciej.',
        ],
      },
      {
        id: 'data',
        title: 'Jakie dane przetwarzamy',
        body: [
          {
            list: [
              'Konto: adres e-mail, imię i nazwisko. Hasło przechowujemy wyłącznie jako hash — nie widzimy go.',
              'Logowanie przez Google: imię, adres e-mail, identyfikator konta i link do zdjęcia profilowego (nie jest wyświetlane w serwisie). Nie mamy dostępu do Twojej poczty, plików, kontaktów ani innych danych Google.',
              'Nauka: odpowiedzi w ćwiczeniach, prace domowe, wyniki testów i egzaminów próbnych, postępy w lekcjach i słówkach, udostępnione Ci kursy.',
              'Ustawienia: język interfejsu.',
              'Zgłoszenie błędu (przycisk „Błąd?”): Twój tekst, adres strony, typ przeglądarki i rozmiar ekranu.',
              'Wiadomości od nauczyciela: jeśli nauczyciel pisze do Ciebie z serwisu, zapisujemy adres i treść wiadomości.',
              'Logi techniczne: adres IP, przeglądarka i czas żądania — w logach hostingu i bazy danych, dla bezpieczeństwa i wykrywania błędów.',
            ],
          },
        ],
      },
      {
        id: 'screen',
        title: 'Podgląd ekranu przez nauczyciela',
        body: [
          'Gdy nauczyciel kliknie „Podgląd”, a Ty jesteś w lekcji lub pracy domowej, widzi Twoją stronę na żywo: to, co jest na niej wyświetlane, i to, co wpisujesz w ćwiczeniach. Pola haseł są ukryte.',
          'Dopóki nauczyciel patrzy, na dole ekranu widzisz oznaczenie „Nauczyciel widzi Twój ekran”. Nic nie jest nagrywane ani zapisywane, a poza lekcjami podgląd nie działa.',
        ],
      },
      {
        id: 'purpose',
        title: 'Cele i podstawy prawne',
        body: [
          {
            list: [
              'Udostępnienie serwisu i kursu — konto, ćwiczenia, postępy, sprawdzanie zadań, wiadomości systemowe (potwierdzenie adresu, nowe hasło, zaproszenie). Podstawa: wykonanie umowy, czyli regulaminu (art. 6 ust. 1 lit. b RODO).',
              'Podgląd ekranu, zgłoszenia błędów i logi techniczne. Podstawa: prawnie uzasadniony interes — skuteczna nauka oraz stabilne i bezpieczne działanie serwisu (art. 6 ust. 1 lit. f RODO).',
            ],
          },
          'Nie sprzedajemy danych, nie wyświetlamy reklam, nie tworzymy profili marketingowych i nie podejmujemy wobec Ciebie zautomatyzowanych decyzji.',
        ],
      },
      {
        id: 'sharing',
        title: 'Kto jeszcze ma dostęp',
        body: [
          'Twoje dane widzi tylko nauczyciel Werba Way oraz usługodawcy, którzy przetwarzają je w naszym imieniu:',
          {
            list: [
              'Supabase — baza danych i logowanie (serwery w Londynie, Wielka Brytania);',
              'Vercel — hosting serwisu;',
              'Resend — wysyłka e-maili;',
              'Google — tylko jeśli wybierzesz „Zaloguj się przez Google”.',
            ],
          },
          'Gdy otwierasz lekcję, przeglądarka pobiera bezpośrednio zdjęcia z Unsplash, a filmy z YouTube w trybie youtube-nocookie (bez plików cookie do momentu odtworzenia).',
          'Część tych usług działa poza Ukrainą i UE (Wielka Brytania, USA). Przekazanie odbywa się z zabezpieczeniami, które zapewniają: decyzje UE stwierdzające odpowiedni stopień ochrony lub standardowe klauzule umowne UE.',
        ],
      },
      {
        id: 'retention',
        title: 'Jak długo przechowujemy',
        body: [
          'Dane konta i nauki — dopóki istnieje konto. Po żądaniu usunięcia usuwamy konto i powiązane z nim dane w ciągu 30 dni.',
          'Logi techniczne przechowujemy krótko — do kilku tygodni — i usuwamy automatycznie.',
        ],
      },
      {
        id: 'cookies',
        title: 'Pliki cookie',
        body: [
          'Serwis używa tylko niezbędnych plików cookie: sesji logowania i wybranego języka. Może też zapisywać w przeglądarce drobne ustawienia interfejsu.',
          'Nie ma reklamowych, analitycznych ani zewnętrznych plików cookie do śledzenia — dlatego nie ma też banera zgody.',
        ],
      },
      {
        id: 'rights',
        title: 'Twoje prawa',
        body: [
          'W każdej chwili możesz:',
          {
            list: [
              'otrzymać kopię swoich danych;',
              'poprawić nieprawidłowe dane;',
              'usunąć konto i dane;',
              'ograniczyć przetwarzanie lub wnieść sprzeciw wobec przetwarzania opartego na prawnie uzasadnionym interesie;',
              'otrzymać dane w ustrukturyzowanym formacie nadającym się do odczytu maszynowego.',
            ],
          },
          'W tym celu napisz na werbaway@gmail.com. Jeśli uważasz, że Twoje prawa zostały naruszone, możesz złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych (UODO) lub do Rzecznika Praw Człowieka Rady Najwyższej Ukrainy.',
        ],
      },
      {
        id: 'security',
        title: 'Bezpieczeństwo',
        body: [
          'Serwis działa wyłącznie przez HTTPS, hasła przechowujemy jako hash, a dostęp do danych ograniczają reguły bazy: każdy widzi tylko swoje dane, nauczyciel — dane swoich uczniów.',
          'Jeśli dojdzie do naruszenia, które może Ci zaszkodzić, powiadomimy Ciebie i właściwy organ w terminach określonych przez prawo.',
        ],
      },
      {
        id: 'age',
        title: 'Wiek',
        body: ['Serwis jest przeznaczony dla osób od 16. roku życia. Jeśli dowiemy się, że konto założyła osoba młodsza, usuniemy je.'],
      },
      {
        id: 'changes',
        title: 'Zmiany',
        body: ['Data ostatniej aktualizacji znajduje się na górze strony. O istotnych zmianach poinformujemy w serwisie lub e-mailem.'],
      },
    ],
  },

  en: {
    title: 'Privacy policy',
    lead: 'How Werba Way collects, uses and protects your data on werbaway.com. In short: only what learning needs — no ads and no selling of data.',
    highlights: ['No ads', 'No selling of data', 'No trackers or analytics', 'Deletion on request'],
    sections: [
      {
        id: 'who',
        title: 'Who we are',
        body: [
          'The controller of your data is a sole proprietor (Ukraine) who owns the Werba Way Polish language school and the website werbaway.com.',
          'For any question about your data, to get a copy of it or to delete your account, write to werbaway@gmail.com. We reply within 30 days, usually much sooner.',
        ],
      },
      {
        id: 'data',
        title: 'What data we process',
        body: [
          {
            list: [
              'Account: email address, first and last name. Your password is stored only as a hash — we never see it.',
              'Sign in with Google: name, email address, account ID and a link to your profile photo (not shown on the site). We have no access to your mail, files, contacts or other Google data.',
              'Learning: exercise answers, homework, test and mock exam results, progress in lessons and vocabulary, the courses opened to you.',
              'Settings: interface language.',
              'Bug reports (the “Error?” button): your text, the page address, browser type and screen size.',
              'Emails from your teacher: if the teacher writes to you from the site, the address and text of the email are stored.',
              'Technical logs: IP address, browser and time of request — in hosting and database logs, for security and troubleshooting.',
            ],
          },
        ],
      },
      {
        id: 'screen',
        title: 'Teacher screen view',
        body: [
          'When the teacher clicks “Watch” while you are in a lesson or homework, they see your page live: what is shown on it and what you type into exercises. Password fields are hidden.',
          'While the teacher is watching, you see a “Your teacher can see your screen” badge at the bottom of the screen. Nothing is recorded or stored, and outside lessons screen view does not work.',
        ],
      },
      {
        id: 'purpose',
        title: 'Purposes and legal bases',
        body: [
          {
            list: [
              'Providing the site and the course — account, exercises, progress, checking work, service emails (email confirmation, new password, invitation). Legal basis: performance of a contract, i.e. the terms of use (Art. 6(1)(b) GDPR).',
              'Screen view, bug reports and technical logs. Legal basis: legitimate interest — effective teaching and a stable, secure website (Art. 6(1)(f) GDPR).',
            ],
          },
          'We do not sell data, show ads, build marketing profiles or make automated decisions about you.',
        ],
      },
      {
        id: 'sharing',
        title: 'Who else has access',
        body: [
          'Your data is seen only by the Werba Way teacher and by service providers who process it on our behalf:',
          {
            list: [
              'Supabase — database and sign-in (servers in London, UK);',
              'Vercel — website hosting;',
              'Resend — sending emails;',
              'Google — only if you choose “Sign in with Google”.',
            ],
          },
          'When you open a lesson, your browser loads images directly from Unsplash and videos from YouTube in youtube-nocookie mode (no cookies until playback).',
          'Some of these services operate outside Ukraine and the EU (UK, USA). Transfers rely on the safeguards they provide: EU adequacy decisions or EU Standard Contractual Clauses.',
        ],
      },
      {
        id: 'retention',
        title: 'How long we keep data',
        body: [
          'Account and learning data — for as long as the account exists. After a deletion request we delete the account and related data within 30 days.',
          'Technical logs are kept briefly — up to a few weeks — and are deleted automatically.',
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies',
        body: [
          'The site uses only cookies it needs to work: your sign-in session and chosen language. It may also store small interface preferences in your browser.',
          'There are no advertising, analytics or third-party tracking cookies — which is why there is no consent banner.',
        ],
      },
      {
        id: 'rights',
        title: 'Your rights',
        body: [
          'At any time you can:',
          {
            list: [
              'get a copy of your data;',
              'correct inaccurate data;',
              'delete your account and data;',
              'restrict processing or object to processing based on legitimate interest;',
              'receive your data in a structured, machine-readable format.',
            ],
          },
          'To do so, write to werbaway@gmail.com. If you believe your rights have been infringed, you can complain to the Ukrainian Parliament Commissioner for Human Rights or to the supervisory authority of your EU country — in Poland, the President of the Personal Data Protection Office (UODO).',
        ],
      },
      {
        id: 'security',
        title: 'Security',
        body: [
          'The site works only over HTTPS, passwords are stored as hashes, and database rules limit access: everyone sees only their own data, the teacher sees their students’ data.',
          'If a breach occurs that could harm you, we will notify you and the relevant authority within the time limits set by law.',
        ],
      },
      {
        id: 'age',
        title: 'Age',
        body: ['The site is intended for people aged 16 and over. If we learn that an account was created by someone younger, we will delete it.'],
      },
      {
        id: 'changes',
        title: 'Changes',
        body: ['The date of the last update is shown at the top of the page. We will announce material changes on the site or by email.'],
      },
    ],
  },
};
