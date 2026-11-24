# AUDIO_SITE — озвучення лекцій через сайт (21.11.2026)

Замінює ручний маршрут «згенерувати mp3 → завантажити в Notion». Усе аудіо будується сайтом.

## Потік
сценарій `src/content/audio/{lesson_id}.json` → `GET /audio/{file}.mp3` (rewrite у `/api/audio/…`, якщо файлу немає в `public/audio`) → ElevenLabs TTS (`eleven_v3`, ≤3 паралельно) → склейка MP3-кадрів із паузами (без ffmpeg) → Supabase Storage, бакет `audio` (public), ключ `tts/<name>-<hash>.mp3` → 302.
Хеш залежить від тексту: змінив репліку — новий файл при наступному запиті.

## Формат сценарію
```json
{"lesson_id":"…","model":"eleven_v3","voices":{"W1":"<voiceId>","W2":"<voiceId>"},
 "files":{"<lesson_id>-czytanie.mp3":{"gap":0.8,"lines":[{"who":"W1","text":"…","say":"опційно: що озвучити замість text","gap":0.4}]}}}
```
Голоси бери з ElevenLabs (`creative_list_voices`), не вигадуй id. Польський текст: цифри й скорочення — словами в `say`.

## Робота після push
1. Дочекатися деплою (`/embed/{id}/grammar?blocks=g1` = 200).
2. У Chrome-вкладці на `werba-way.vercel.app` (shell без мережі) відкрити кожен `/audio/*.mp3` — це запускає генерацію (≈1 кредит/символ).
3. `/api/audio/_status?lesson={id}` → усі `ready: true`.
4. У маніфесті `audio[]` — шляхи `/audio/*.mp3`; у TEACHER — транскрипти й ключі, посилання на сайт замість файлу.

## Правило: вправа слухання — лише з готовим аудіо (v3.20, 24.11.2026)
Поки `/api/audio/_status?lesson={id}` не показує `ready: true` для файлу вправи, самої вправи в лекції нема: ні блоку в `-exam.json`, ні embed `?blocks=eN` на сторінці, ні `exam_eN` у маніфесті. Блок лежить у `content-queue/audio-pending/{lesson_id}-eN-block.json`, сценарій `src/content/audio/{lesson_id}.json` пушиться одразу. Після генерації — другий коміт повертає вправу. Деталі й чекліст — `LESSON_PROTOCOL.md` v3.20.

## Пастка
Кілька `/audio/*.mp3` одночасно → 503 (ліміт паралельності ElevenLabs). Запускати **по одному**, з повтором після паузи ~4 с; перший запит після деплою може дати 404, поки не доїде нова збірка — чекати `_status` (`files` не порожній).

## Станом на 21.11.2026
Озвучено через сайт: A2 73–79 (`-e2-dialog.mp3`) і A2 80 (`-czytanie`, `-e2-dialog`). Notion для нових лекцій не ведемо — лише сайт.

## Env у Vercel
`Eleven_Labs` (ключ ElevenLabs), `Unsplash` (Access Key). Пошук ключів — `elevenKey()` у `src/lib/audio/generate.ts`. Станом на 21.11.2026 `api.unsplash.com` повертав 401 для ключа Unsplash — фото обираються через unsplash.com.
