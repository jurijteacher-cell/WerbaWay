import type { Locale } from '@/i18n/config';
import type { LegalDoc } from './types';

/**
 * Умови користування werbaway.com. Факти (Юра, 16.11.2026): ФОП в Україні; на сайті лише навчання
 * й вправи, жодних оплат; учні від 16 років. З'являться платні послуги — переписати розділ «price».
 */
export const TERMS: Record<Locale, LegalDoc> = {
  uk: {
    title: 'Умови користування',
    lead: 'Домовленість між вами та Werba Way щодо сайту werbaway.com. Створюючи акаунт або входячи на сайт, ви приймаєте ці умови.',
    highlights: ['Безкоштовно', 'Від 16 років', 'Матеріали — лише для навчання', 'Акаунт можна видалити будь-коли'],
    sections: [
      {
        id: 'who',
        title: 'Хто ми',
        body: ['Сайт werbaway.com належить фізичній особі-підприємцю (Україна), власнику школи польської мови Werba Way. Контакт: werbaway@gmail.com.'],
      },
      {
        id: 'service',
        title: 'Що пропонує сайт',
        body: [
          'Werba Way — навчальна платформа: лекції, вправи, домашні завдання, словникові колоди, тести й пробні іспити. Доступ до курсів і лекцій відкриває викладач.',
          'Ми постійно вдосконалюємо курс, тому можемо оновлювати, доповнювати чи змінювати матеріали, вправи й функції сайту.',
        ],
      },
      {
        id: 'price',
        title: 'Вартість',
        body: [
          'Користування сайтом зараз безкоштовне — платних послуг на сайті немає, і ми не просимо платіжних даних.',
          'Якщо колись з’являться платні послуги, ми заздалегідь опишемо ціни й правила окремо. Без вашої явної згоди нічого не буде оплачено.',
        ],
      },
      {
        id: 'account',
        title: 'Акаунт',
        body: [
          {
            list: [
              'Створювати акаунт можуть особи від 16 років.',
              'Вказуйте правдиві ім’я та пошту — за ними викладач вас знаходить.',
              'Один акаунт — для однієї людини. Не передавайте пароль іншим і бережіть доступ до пошти.',
              'Ви відповідаєте за дії зі свого акаунта. Якщо підозрюєте злам — змініть пароль і напишіть нам.',
              'Вхід через Google також регулюють умови Google.',
            ],
          },
        ],
      },
      {
        id: 'rules',
        title: 'Правила користування',
        body: [
          'Не можна:',
          {
            list: [
              'копіювати, публікувати, продавати чи передавати іншим матеріали сайту;',
              'ділитися доступом до свого акаунта;',
              'втручатися в роботу сайту, обходити захист чи автоматично збирати дані;',
              'надсилати незаконний, образливий або чужий контент у повідомленнях;',
              'видавати себе за іншу людину.',
            ],
          },
        ],
      },
      {
        id: 'content',
        title: 'Матеріали й авторські права',
        body: [
          'Лекції, вправи, тексти, аудіо й презентації створено для Werba Way і захищено авторським правом. Окремі фото й відео використано за ліцензіями їхніх авторів (наприклад, Unsplash, YouTube).',
          'Ви отримуєте особисте, невиключне й непередаване право користуватися матеріалами для власного навчання, поки маєте доступ до курсу.',
        ],
      },
      {
        id: 'answers',
        title: 'Ваші відповіді',
        body: [
          'Ваші відповіді у вправах і домашніх завданнях — ваші. Ви дозволяєте нам зберігати й обробляти їх, щоб показувати ваш прогрес, а викладачеві — перевіряти роботу й допомагати. Для інших цілей ми їх не використовуємо.',
        ],
      },
      {
        id: 'screen',
        title: 'Перегляд екрана',
        body: [
          'Під час лекції викладач може дивитися вашу сторінку наживо, щоб допомагати з вправами. Поки він дивиться, ви бачите про це позначку. Нічого не записується. Детальніше — у Політиці конфіденційності.',
        ],
      },
      {
        id: 'liability',
        title: 'Відповідальність',
        body: [
          'Ми робимо все, щоб сайт працював стабільно, а вправи були правильні, але не можемо гарантувати повної відсутності перерв чи помилок. Помітили помилку — натисніть «Помилка?» на сторінці.',
          'Результати вправ, тестів і пробних іспитів — навчальні. Вони не є офіційною оцінкою чи сертифікатом і не гарантують складання іспиту (зокрема telc чи державного іспиту B1).',
          'Ми відповідаємо в межах, визначених законом. Ці умови не обмежують ваших прав споживача, які не можна обмежити за законом.',
        ],
      },
      {
        id: 'end',
        title: 'Припинення доступу',
        body: [
          'Ви можете будь-коли припинити користуватися сайтом і попросити видалити акаунт — напишіть на werbaway@gmail.com.',
          'Ми можемо обмежити або закрити доступ, якщо ви порушуєте ці умови, і повідомимо вам причину.',
        ],
      },
      {
        id: 'changes',
        title: 'Зміни умов',
        body: [
          'Дата останнього оновлення — вгорі сторінки. Про суттєві зміни ми повідомимо на сайті або листом щонайменше за 14 днів. Якщо ви не погоджуєтеся зі змінами, можете видалити акаунт.',
        ],
      },
      {
        id: 'law',
        title: 'Право й спори',
        body: [
          'До цих умов застосовується право України. Якщо ви споживач і живете в іншій країні, за вами зберігається захист, який надають обов’язкові норми права вашої країни.',
          'Якщо щось пішло не так, напишіть нам спершу — ми постараємося розв’язати питання швидко й мирно.',
        ],
      },
    ],
  },

  ru: {
    title: 'Условия использования',
    lead: 'Договорённость между вами и Werba Way о сайте werbaway.com. Создавая аккаунт или входя на сайт, вы принимаете эти условия.',
    highlights: ['Бесплатно', 'С 16 лет', 'Материалы — только для обучения', 'Аккаунт можно удалить в любой момент'],
    sections: [
      {
        id: 'who',
        title: 'Кто мы',
        body: ['Сайт werbaway.com принадлежит физическому лицу-предпринимателю (Украина), владельцу школы польского языка Werba Way. Контакт: werbaway@gmail.com.'],
      },
      {
        id: 'service',
        title: 'Что предлагает сайт',
        body: [
          'Werba Way — учебная платформа: лекции, упражнения, домашние задания, словарные колоды, тесты и пробные экзамены. Доступ к курсам и лекциям открывает преподаватель.',
          'Мы постоянно улучшаем курс, поэтому можем обновлять, дополнять или изменять материалы, упражнения и функции сайта.',
        ],
      },
      {
        id: 'price',
        title: 'Стоимость',
        body: [
          'Пользование сайтом сейчас бесплатное — платных услуг на сайте нет, и мы не запрашиваем платёжные данные.',
          'Если когда-нибудь появятся платные услуги, мы заранее отдельно опишем цены и правила. Без вашего явного согласия ничего оплачено не будет.',
        ],
      },
      {
        id: 'account',
        title: 'Аккаунт',
        body: [
          {
            list: [
              'Создавать аккаунт могут лица от 16 лет.',
              'Указывайте настоящие имя и почту — по ним преподаватель вас находит.',
              'Один аккаунт — для одного человека. Не передавайте пароль другим и берегите доступ к почте.',
              'Вы отвечаете за действия со своего аккаунта. Если подозреваете взлом — смените пароль и напишите нам.',
              'Вход через Google также регулируется условиями Google.',
            ],
          },
        ],
      },
      {
        id: 'rules',
        title: 'Правила пользования',
        body: [
          'Нельзя:',
          {
            list: [
              'копировать, публиковать, продавать или передавать другим материалы сайта;',
              'делиться доступом к своему аккаунту;',
              'вмешиваться в работу сайта, обходить защиту или автоматически собирать данные;',
              'отправлять незаконный, оскорбительный или чужой контент в сообщениях;',
              'выдавать себя за другого человека.',
            ],
          },
        ],
      },
      {
        id: 'content',
        title: 'Материалы и авторские права',
        body: [
          'Лекции, упражнения, тексты, аудио и презентации созданы для Werba Way и защищены авторским правом. Отдельные фото и видео используются по лицензиям их авторов (например, Unsplash, YouTube).',
          'Вы получаете личное, неисключительное и непередаваемое право пользоваться материалами для собственного обучения, пока у вас есть доступ к курсу.',
        ],
      },
      {
        id: 'answers',
        title: 'Ваши ответы',
        body: [
          'Ваши ответы в упражнениях и домашних заданиях — ваши. Вы разрешаете нам хранить и обрабатывать их, чтобы показывать ваш прогресс, а преподавателю — проверять работу и помогать. Для других целей мы их не используем.',
        ],
      },
      {
        id: 'screen',
        title: 'Просмотр экрана',
        body: [
          'Во время лекции преподаватель может смотреть вашу страницу вживую, чтобы помогать с упражнениями. Пока он смотрит, вы видите об этом пометку. Ничего не записывается. Подробнее — в Политике конфиденциальности.',
        ],
      },
      {
        id: 'liability',
        title: 'Ответственность',
        body: [
          'Мы делаем всё, чтобы сайт работал стабильно, а упражнения были правильными, но не можем гарантировать полного отсутствия перерывов или ошибок. Заметили ошибку — нажмите «Ошибка?» на странице.',
          'Результаты упражнений, тестов и пробных экзаменов — учебные. Они не являются официальной оценкой или сертификатом и не гарантируют сдачу экзамена (в частности, telc или государственного экзамена B1).',
          'Мы несём ответственность в пределах, установленных законом. Эти условия не ограничивают ваших прав потребителя, которые нельзя ограничить по закону.',
        ],
      },
      {
        id: 'end',
        title: 'Прекращение доступа',
        body: [
          'Вы можете в любой момент перестать пользоваться сайтом и попросить удалить аккаунт — напишите на werbaway@gmail.com.',
          'Мы можем ограничить или закрыть доступ, если вы нарушаете эти условия, и сообщим вам причину.',
        ],
      },
      {
        id: 'changes',
        title: 'Изменения условий',
        body: [
          'Дата последнего обновления — вверху страницы. О существенных изменениях мы сообщим на сайте или письмом не менее чем за 14 дней. Если вы не согласны с изменениями, можете удалить аккаунт.',
        ],
      },
      {
        id: 'law',
        title: 'Право и споры',
        body: [
          'К этим условиям применяется право Украины. Если вы потребитель и живёте в другой стране, за вами сохраняется защита, которую дают обязательные нормы права вашей страны.',
          'Если что-то пошло не так, сначала напишите нам — мы постараемся решить вопрос быстро и мирно.',
        ],
      },
    ],
  },

  pl: {
    title: 'Regulamin',
    lead: 'Umowa między Tobą a Werba Way dotycząca serwisu werbaway.com. Zakładając konto lub logując się, akceptujesz ten regulamin.',
    highlights: ['Bezpłatnie', 'Od 16 lat', 'Materiały tylko do nauki', 'Konto można usunąć w każdej chwili'],
    sections: [
      {
        id: 'who',
        title: 'Kim jesteśmy',
        body: ['Serwis werbaway.com należy do osoby fizycznej prowadzącej działalność gospodarczą (Ukraina), właściciela szkoły języka polskiego Werba Way. Kontakt: werbaway@gmail.com.'],
      },
      {
        id: 'service',
        title: 'Co oferuje serwis',
        body: [
          'Werba Way to platforma do nauki: lekcje, ćwiczenia, prace domowe, fiszki, testy i egzaminy próbne. Dostęp do kursów i lekcji przyznaje nauczyciel.',
          'Stale ulepszamy kurs, dlatego możemy aktualizować, uzupełniać lub zmieniać materiały, ćwiczenia i funkcje serwisu.',
        ],
      },
      {
        id: 'price',
        title: 'Opłaty',
        body: [
          'Korzystanie z serwisu jest obecnie bezpłatne — w serwisie nie ma płatnych usług i nie prosimy o dane płatnicze.',
          'Jeśli kiedyś pojawią się płatne usługi, z wyprzedzeniem opiszemy osobno ceny i zasady. Bez Twojej wyraźnej zgody nic nie zostanie opłacone.',
        ],
      },
      {
        id: 'account',
        title: 'Konto',
        body: [
          {
            list: [
              'Konto mogą założyć osoby, które ukończyły 16 lat.',
              'Podawaj prawdziwe imię i adres e-mail — po nich nauczyciel Cię odnajduje.',
              'Jedno konto — dla jednej osoby. Nie udostępniaj hasła innym i dbaj o dostęp do swojej poczty.',
              'Odpowiadasz za działania na swoim koncie. Jeśli podejrzewasz włamanie — zmień hasło i napisz do nas.',
              'Logowanie przez Google podlega także warunkom Google.',
            ],
          },
        ],
      },
      {
        id: 'rules',
        title: 'Zasady korzystania',
        body: [
          'Nie wolno:',
          {
            list: [
              'kopiować, publikować, sprzedawać ani przekazywać innym materiałów serwisu;',
              'udostępniać dostępu do swojego konta;',
              'ingerować w działanie serwisu, obchodzić zabezpieczeń ani automatycznie pobierać danych;',
              'wysyłać w wiadomościach treści niezgodnych z prawem, obraźliwych lub cudzych;',
              'podszywać się pod inną osobę.',
            ],
          },
        ],
      },
      {
        id: 'content',
        title: 'Materiały i prawa autorskie',
        body: [
          'Lekcje, ćwiczenia, teksty, nagrania i prezentacje zostały stworzone dla Werba Way i są chronione prawem autorskim. Niektóre zdjęcia i filmy są wykorzystywane na licencjach ich autorów (np. Unsplash, YouTube).',
          'Otrzymujesz osobiste, niewyłączne i nieprzenoszalne prawo do korzystania z materiałów na potrzeby własnej nauki, dopóki masz dostęp do kursu.',
        ],
      },
      {
        id: 'answers',
        title: 'Twoje odpowiedzi',
        body: [
          'Twoje odpowiedzi w ćwiczeniach i pracach domowych należą do Ciebie. Pozwalasz nam je przechowywać i przetwarzać, aby pokazywać Twoje postępy, a nauczycielowi — sprawdzać pracę i pomagać. Nie wykorzystujemy ich w innych celach.',
        ],
      },
      {
        id: 'screen',
        title: 'Podgląd ekranu',
        body: [
          'Podczas lekcji nauczyciel może oglądać Twoją stronę na żywo, aby pomagać w ćwiczeniach. Dopóki patrzy, widzisz o tym oznaczenie. Nic nie jest nagrywane. Więcej — w Polityce prywatności.',
        ],
      },
      {
        id: 'liability',
        title: 'Odpowiedzialność',
        body: [
          'Dokładamy starań, aby serwis działał stabilnie, a ćwiczenia były poprawne, ale nie możemy zagwarantować całkowitego braku przerw czy błędów. Widzisz błąd — kliknij „Błąd?” na stronie.',
          'Wyniki ćwiczeń, testów i egzaminów próbnych mają charakter edukacyjny. Nie są oficjalną oceną ani certyfikatem i nie gwarantują zdania egzaminu (w tym telc czy państwowego egzaminu B1).',
          'Odpowiadamy w granicach określonych przez prawo. Regulamin nie ogranicza Twoich praw konsumenta, których nie można ograniczyć na mocy prawa.',
        ],
      },
      {
        id: 'end',
        title: 'Zakończenie korzystania',
        body: [
          'W każdej chwili możesz przestać korzystać z serwisu i poprosić o usunięcie konta — napisz na werbaway@gmail.com.',
          'Możemy ograniczyć lub zamknąć dostęp, jeśli naruszasz regulamin, i podamy Ci powód.',
        ],
      },
      {
        id: 'changes',
        title: 'Zmiany regulaminu',
        body: [
          'Data ostatniej aktualizacji znajduje się na górze strony. O istotnych zmianach poinformujemy w serwisie lub e-mailem co najmniej 14 dni wcześniej. Jeśli nie zgadzasz się ze zmianami, możesz usunąć konto.',
        ],
      },
      {
        id: 'law',
        title: 'Prawo i spory',
        body: [
          'Do regulaminu stosuje się prawo Ukrainy. Jeśli jesteś konsumentem i mieszkasz w innym kraju, zachowujesz ochronę, jaką dają Ci bezwzględnie obowiązujące przepisy prawa Twojego kraju.',
          'Jeśli coś poszło nie tak, napisz najpierw do nas — postaramy się rozwiązać sprawę szybko i polubownie.',
        ],
      },
    ],
  },

  en: {
    title: 'Terms of use',
    lead: 'The agreement between you and Werba Way about werbaway.com. By creating an account or signing in, you accept these terms.',
    highlights: ['Free of charge', 'Age 16+', 'Materials for learning only', 'Delete your account anytime'],
    sections: [
      {
        id: 'who',
        title: 'Who we are',
        body: ['werbaway.com belongs to a sole proprietor (Ukraine) who owns Werba Way. Contact: werbaway@gmail.com.'],
      },
      {
        id: 'service',
        title: 'What the site offers',
        body: [
          'Werba Way is a learning platform: lessons, exercises, homework, vocabulary decks, tests and mock exams. Your teacher opens access to courses and lessons.',
          'We keep improving the course, so we may update, extend or change materials, exercises and site features.',
        ],
      },
      {
        id: 'price',
        title: 'Price',
        body: [
          'Using the site is currently free — there are no paid services on the site, and we never ask for payment details.',
          'If paid services ever appear, we will describe prices and rules separately and in advance. Nothing will be charged without your explicit consent.',
        ],
      },
      {
        id: 'account',
        title: 'Your account',
        body: [
          {
            list: [
              'You must be at least 16 years old to create an account.',
              'Use your real name and email — that is how your teacher finds you.',
              'One account per person. Do not share your password and keep access to your email safe.',
              'You are responsible for activity on your account. If you suspect a break-in, change your password and write to us.',
              'Sign in with Google is also subject to Google’s terms.',
            ],
          },
        ],
      },
      {
        id: 'rules',
        title: 'Acceptable use',
        body: [
          'You may not:',
          {
            list: [
              'copy, publish, sell or pass on the site’s materials;',
              'share access to your account;',
              'interfere with the site, bypass its security or scrape data automatically;',
              'send unlawful, offensive or someone else’s content in messages;',
              'impersonate another person.',
            ],
          },
        ],
      },
      {
        id: 'content',
        title: 'Materials and copyright',
        body: [
          'Lessons, exercises, texts, audio and slides were created for Werba Way and are protected by copyright. Some photos and videos are used under their authors’ licences (e.g. Unsplash, YouTube).',
          'You receive a personal, non-exclusive, non-transferable right to use the materials for your own learning while you have access to the course.',
        ],
      },
      {
        id: 'answers',
        title: 'Your answers',
        body: [
          'Your answers in exercises and homework are yours. You allow us to store and process them to show your progress and to let your teacher check your work and help you. We do not use them for anything else.',
        ],
      },
      {
        id: 'screen',
        title: 'Screen view',
        body: [
          'During a lesson your teacher may view your page live to help with exercises. While they watch, you see a badge saying so. Nothing is recorded. See the Privacy policy for details.',
        ],
      },
      {
        id: 'liability',
        title: 'Liability',
        body: [
          'We do our best to keep the site stable and the exercises correct, but we cannot guarantee it will be free of interruptions or errors. Spotted a mistake? Click “Error?” on the page.',
          'Results of exercises, tests and mock exams are for learning only. They are not an official grade or certificate and do not guarantee passing an exam (including telc or the state B1 exam).',
          'Our liability is limited to the extent permitted by law. These terms do not limit any consumer rights that cannot be limited by law.',
        ],
      },
      {
        id: 'end',
        title: 'Ending access',
        body: [
          'You can stop using the site at any time and ask us to delete your account — write to werbaway@gmail.com.',
          'We may restrict or close access if you breach these terms, and we will tell you why.',
        ],
      },
      {
        id: 'changes',
        title: 'Changes to these terms',
        body: [
          'The date of the last update is shown at the top of the page. We will announce material changes on the site or by email at least 14 days in advance. If you disagree with the changes, you can delete your account.',
        ],
      },
      {
        id: 'law',
        title: 'Law and disputes',
        body: [
          'These terms are governed by the law of Ukraine. If you are a consumer living in another country, you keep the protection given by the mandatory rules of your country’s law.',
          'If something goes wrong, please write to us first — we will try to resolve it quickly and amicably.',
        ],
      },
    ],
  },
};
