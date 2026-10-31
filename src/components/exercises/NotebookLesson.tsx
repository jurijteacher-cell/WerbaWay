'use client';

import { Fragment, type ReactNode } from 'react';
import { NotebookShell } from './NotebookShell';
import { GoalsChecklist } from './GoalsChecklist';
import { VocabCards } from './VocabCards';
import { FlipTask } from './FlipTask';
import { PictureSet } from './PictureSet';
import { ExerciseBlocks, type ExerciseBlock } from './ExerciseBlocks';
import { AudioCassette } from './AudioCassette';
import { TeacherReads } from './TeacherReads';
import { parseBlockRange } from '@/lib/block-ids';

type ImageLockSlot = {
  status: 'ok' | 'missing';
  url?: string;
  author?: string;
  author_url?: string;
};

type Props = {
  lessonId: string;
  title: string;
  levelHint?: string;
  body: string;
  images: Record<string, ImageLockSlot>;
  vocab?: {
    title: string;
    instructions?: string;
    instruction?: string;
    items: Parameters<typeof VocabCards>[0]['items'];
    groups?: string[];
  };
  pictures?: {
    title: string;
    instructions?: string;
    instruction?: string;
    phrase_bank?: string[];
    items: Array<{
      id: string | number;
      question: string;
      alt?: string;
      helper_questions?: string[];
      image_keywords?: string;
    }>;
  };
  commTasks?: {
    title: string;
    instructions?: string;
    instruction?: string;
    items: Parameters<typeof FlipTask>[0]['items'];
  };
  grammar?: { title: string; instruction?: string; blocks: ExerciseBlock[] };
  exam?: { title: string; instruction?: string; blocks: ExerciseBlock[] };
  hw?: { title: string; instruction?: string; blocks: ExerciseBlock[] };
  /** ?teacher=1 — shows texts the teacher reads aloud */
  teacherMode?: boolean;
};

const MARKER_RE = /%%MK:(IMAGE|AUDIO|SLIDES|EXERCISE):([A-Za-z0-9_-]+)%%/g;

function decodeAttrs(b64: string): string {
  try {
    if (typeof atob === 'function') {
      const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
      const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + pad);
      return decodeURIComponent(
        Array.from(bin, (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
      );
    }
  } catch {
    /* fall through */
  }
  return b64;
}

function attr(map: string, key: string): string | undefined {
  const m = map.match(new RegExp(`${key}="([^"]*)"`));
  return m?.[1];
}

function stripEmojiGoals(lines: string[]): string[] {
  return lines.map((l) => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
}

function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function parseMarkdownTables(section: string): ReactNode {
  const lines = section.split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s-:|]+\|$/)) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].match(/^\|[\s-:|]+\|$/)) {
          rows.push(
            lines[i]
              .split('|')
              .slice(1, -1)
              .map((c) => c.trim())
          );
        }
        i++;
      }
      nodes.push(
        <table key={`t-${i}`}>
          <thead>
            <tr>
              {rows[0]?.map((c, j) => (
                <th key={j}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(1).map((r, ri) => (
              <tr key={ri}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      nodes.push(<h3 key={`h-${i}`}>{line.slice(4)}</h3>);
    } else if (line.startsWith('## ')) {
      nodes.push(<h2 key={`h-${i}`}>{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h1 key={`h-${i}`}>{line.slice(2)}</h1>);
    } else if (line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s*/, ''));
        i++;
        while (i < lines.length && lines[i].match(/^\s+\*/)) {
          items[items.length - 1] += '\n' + lines[i].trim();
          i++;
        }
        continue;
      }
      nodes.push(
        <ol key={`ol-${i}`}>
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    } else if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`}>
          {items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    } else if (line.trim() === '') {
      // skip
    } else {
      nodes.push(<p key={`p-${i}`}>{renderInline(line)}</p>);
    }
    i++;
  }
  return <>{nodes}</>;
}

export function NotebookLesson(props: Props) {
  const {
    lessonId,
    title,
    levelHint,
    body,
    images,
    vocab,
    pictures,
    commTasks,
    grammar,
    exam,
    hw,
    teacherMode = false,
  } = props;

  const audioSrc = (id: string) => `/audio/${id}.mp3`;

  // Extract goals from "## Cele lekcji" section
  const goalsMatch = body.match(
    /## Cele lekcji\s+([\s\S]*?)(?=\n## )/
  );
  const goalLines = goalsMatch
    ? goalsMatch[1]
        .split('\n')
        .filter((l) => l.trim().startsWith('-'))
        .map((l) => l.replace(/^-\s*/, '').trim())
    : [];

  const slotForImage = (keywords?: string): ImageLockSlot | undefined => {
    if (!keywords) return images.czytanie ?? images.header;
    const map: Record<string, string> = {
      'man playing drums': 'czytanie',
      'friends playing music': 'header',
      'man playing guitar home': 'p1',
      'friends running park': 'p2',
      'woman cooking kitchen': 'p3',
    };
    const key = map[keywords] ?? 'czytanie';
    return images[key];
  };

  const pictureItems =
    pictures?.items.map((it) => {
      const slotKey = String(it.id);
      const slot = images[slotKey] ?? slotForImage(it.image_keywords);
      return {
        ...it,
        image_url: slot?.status === 'ok' ? slot.url : undefined,
        image_status: (slot?.status ?? 'missing') as 'ok' | 'missing',
      };
    }) ?? [];

  const renderMarker = (kind: string, rawAttrs: string, key: string): ReactNode => {
    if (kind === 'IMAGE') {
      const keywords = attr(rawAttrs, 'keywords');
      const alt = attr(rawAttrs, 'alt') ?? '';
      const slot = slotForImage(keywords) ?? images.czytanie;
      const status = slot?.status ?? 'missing';
      return (
        <figure key={key} className="nb-polaroid" data-image-status={status}>
          {status === 'ok' && slot?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={slot.url} alt={alt} style={{ objectFit: 'contain' }} />
          ) : (
            <div className="nb-polaroid-missing">zdjęcie wkrótce</div>
          )}
          {slot?.author ? (
            <figcaption className="nb-polaroid-cap">
              Photo:{' '}
              <a
                href={`${slot.author_url ?? 'https://unsplash.com'}?utm_source=werba_way&utm_medium=referral`}
                target="_blank"
                rel="noreferrer"
              >
                {slot.author}
              </a>{' '}
              /{' '}
              <a
                href="https://unsplash.com?utm_source=werba_way&utm_medium=referral"
                target="_blank"
                rel="noreferrer"
              >
                Unsplash
              </a>
            </figcaption>
          ) : (
            <figcaption className="nb-polaroid-cap">{alt}</figcaption>
          )}
        </figure>
      );
    }

    if (kind === 'AUDIO') {
      const id = attr(rawAttrs, 'id') ?? '';
      // c1 dialog is mounted under the flip card
      if (id.includes('c1-dialog')) return <Fragment key={key} />;
      if (attr(rawAttrs, 'source') === 'teacher') {
        const plays = Number(attr(rawAttrs, 'plays') ?? '') || undefined;
        return <TeacherReads key={key} times={plays} />;
      }
      return <AudioCassette key={key} src={audioSrc(id)} defaultSpeed={0.85} />;
    }

    if (kind === 'SLIDES') {
      const part = attr(rawAttrs, 'part');
      const src = `/slides/${lessonId}${part ? `?part=${part}` : ''}`;
      return (
        <div key={key} className="nb-slides-launch">
          <a className="nb-btn" href={src} target="_blank" rel="noreferrer">
            Otwórz prezentację
          </a>
          <iframe className="nb-slides-frame" src={src} title={`Slides ${part ?? ''}`} />
        </div>
      );
    }

    if (kind === 'EXERCISE') {
      const file = attr(rawAttrs, 'file') ?? '';
      const blocksSpec = attr(rawAttrs, 'blocks');
      const blockIds = parseBlockRange(blocksSpec);

      if (/-vocab\.json/.test(file)) {
        if (!vocab) return null;
        return (
          <VocabCards
            key={key}
            title={vocab.title}
            instructions={vocab.instructions ?? vocab.instruction}
            items={vocab.items}
            groups={vocab.groups}
            lessonId={lessonId}
          />
        );
      }
      if (/-pictures\.json/.test(file)) {
        if (!pictures) return null;
        return (
          <PictureSet
            key={key}
            title={pictures.title}
            instructions={pictures.instructions ?? pictures.instruction}
            phrase_bank={pictures.phrase_bank}
            items={pictureItems}
          />
        );
      }
      if (/-comm-tasks\.json/.test(file)) {
        if (!commTasks) return null;
        return (
          <FlipTask
            key={key}
            title={commTasks.title}
            instructions={commTasks.instructions ?? commTasks.instruction}
            items={commTasks.items}
            teacherMode={teacherMode}
            underCardAudio={
              commTasks.items.some((it) => String(it.id) === 'c1' && it.audio_source === 'teacher')
                ? undefined
                : { itemId: 'c1', src: audioSrc(`${lessonId}-c1-dialog`) }
            }
          />
        );
      }
      if (/-exam\.json/.test(file)) {
        if (!exam) return null;
        return (
          <ExerciseBlocks
            key={key}
            eyebrow="jak na egzaminie"
            title={exam.title}
            instruction={exam.instruction}
            blocks={exam.blocks}
            blockIds={blockIds}
            audioSrc={audioSrc}
            teacherMode={teacherMode}
          />
        );
      }
      if (/-grammar\.json/.test(file)) {
        if (!grammar) return null;
        return (
          <ExerciseBlocks
            key={key}
            eyebrow="gramatyka"
            title={grammar.title}
            instruction={grammar.instruction}
            blocks={grammar.blocks}
            blockIds={blockIds}
            audioSrc={audioSrc}
            teacherMode={teacherMode}
          />
        );
      }
      if (/-hw\.json/.test(file)) {
        if (!hw) return null;
        return (
          <ExerciseBlocks
            key={key}
            eyebrow="praca domowa"
            title={hw.title}
            instruction={hw.instruction}
            blocks={hw.blocks}
            blockIds={blockIds}
            audioSrc={audioSrc}
            teacherMode={teacherMode}
          />
        );
      }
    }
    return null;
  };

  // Split body into text chunks and markers
  const chunks: ReactNode[] = [];
  let last = 0;
  let mi = 0;
  const re = new RegExp(MARKER_RE.source, 'g');
  let m: RegExpExecArray | null;
  const textBody = body
    .replace(/## Cele lekcji[\s\S]*?(?=\n## )/, '## Cele lekcji\n\n__GOALS__\n\n')
    .replace(/## 9\. Podsumowanie([\s\S]*?)(?=\n## 10)/, (_all, rest: string) => {
      return `## 9. Podsumowanie\n\n__GOALS_SUMMARY__\n${rest}`;
    });

  while ((m = re.exec(textBody)) !== null) {
    const before = textBody.slice(last, m.index);
    if (before.trim()) {
      const parts = before.split(/(__GOALS__|__GOALS_SUMMARY__)/g);
      for (const part of parts) {
        if (part === '__GOALS__') {
          chunks.push(
            <GoalsChecklist key={`goals-${mi}`} goals={stripEmojiGoals(goalLines)} mode="intro" />
          );
        } else if (part === '__GOALS_SUMMARY__') {
          chunks.push(
            <GoalsChecklist
              key={`goals-sum-${mi}`}
              goals={stripEmojiGoals(goalLines)}
              mode="summary"
            />
          );
        } else if (part.includes('## Słowniczek') || part.includes('### ')) {
          const isSlownik = part.includes('Słowniczek');
          chunks.push(
            <div key={`md-${mi++}`} className={`nb-lesson-md${isSlownik ? ' nb-slownik' : ''}`}>
              {parseMarkdownTables(part)}
            </div>
          );
        } else {
          chunks.push(
            <div key={`md-${mi++}`} className="nb-lesson-md">
              {parseMarkdownTables(part)}
            </div>
          );
        }
      }
    }
    chunks.push(renderMarker(m[1], decodeAttrs(m[2]), `mk-${mi++}`));
    last = m.index + m[0].length;
  }
  const rest = textBody.slice(last);
  if (rest.trim()) {
    const parts = rest.split(/(__GOALS__|__GOALS_SUMMARY__)/g);
    for (const part of parts) {
      if (part === '__GOALS__') {
        chunks.push(
          <GoalsChecklist key={`goals-end`} goals={stripEmojiGoals(goalLines)} mode="intro" />
        );
      } else if (part === '__GOALS_SUMMARY__') {
        chunks.push(
          <GoalsChecklist
            key="goals-sum-end"
            goals={stripEmojiGoals(goalLines)}
            mode="summary"
          />
        );
      } else {
        chunks.push(
          <div key={`md-end`} className={`nb-lesson-md${part.includes('Słowniczek') ? ' nb-slownik' : ''}`}>
            {parseMarkdownTables(part)}
          </div>
        );
      }
    }
  }

  return (
    <NotebookShell brandLabel="Werba Way" levelHint={levelHint ?? title}>
      <div className="nb-lesson">
        <header className="nb-head">
          <p className="nb-eyebrow">lekcja</p>
          <h1>{title}</h1>
        </header>
        {chunks}
      </div>
    </NotebookShell>
  );
}
