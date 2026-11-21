/**
 * Мінімальна робота з MP3 без ffmpeg (Vercel-функція): розбити на кадри, викинути ID3 і
 * службовий кадр Xing/Info/VBRI (інакше браузер бере тривалість лише першої репліки),
 * склеїти репліки й вставити між ними тишу цілими кадрами.
 * Кадри тиші закодовано з -reservoir 0 (main_data_begin = 0), тож їх можна повторювати.
 */

const SILENT_FRAME = {
  // MPEG-1 Layer III, 44,1 кГц, 128 кбіт/с, 417 байт ≈ 26,12 мс
  mono: Buffer.from('//uQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'base64'),
  stereo: Buffer.from('//uQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'base64'),
};
const FRAME_SEC = 1152 / 44100;

const BITRATES: Record<string, number[]> = {
  // MPEG-1 Layer III / MPEG-2(2.5) Layer III
  v1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  v2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const RATES: Record<number, number[]> = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

export type Mp3Info = { sampleRate: number; mono: boolean; frames: number; seconds: number };

function skipId3(b: Buffer): number {
  if (b.length > 10 && b.toString('latin1', 0, 3) === 'ID3') {
    const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
    return 10 + size + (b[5] & 0x10 ? 10 : 0);
  }
  return 0;
}

/** Кадри аудіо без ID3, без Xing/Info/VBRI і без хвостового ID3v1. */
export function frames(b: Buffer): { list: Buffer[]; info: Mp3Info } {
  let i = skipId3(b);
  const list: Buffer[] = [];
  let sampleRate = 44100;
  let mono = true;
  let samples = 1152;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) {
      i++; // шукаємо наступну синхронізацію (сміття / тег у кінці)
      continue;
    }
    const ver = (b[i + 1] >> 3) & 3; // 3 = MPEG-1, 2 = MPEG-2, 0 = MPEG-2.5
    const layer = (b[i + 1] >> 1) & 3; // 1 = Layer III
    const bri = b[i + 2] >> 4;
    const sri = (b[i + 2] >> 2) & 3;
    if (ver === 1 || layer !== 1 || bri === 0 || bri === 15 || sri === 3) {
      i++;
      continue;
    }
    const br = (ver === 3 ? BITRATES.v1 : BITRATES.v2)[bri] * 1000;
    const sr = RATES[ver][sri];
    const pad = (b[i + 2] >> 1) & 1;
    const len = Math.floor(((ver === 3 ? 144 : 72) * br) / sr) + pad;
    if (len < 24 || i + len > b.length) break;
    const frame = b.subarray(i, i + len);
    const head = frame.toString('latin1', 0, Math.min(64, len));
    const isTag = /Xing|Info|VBRI/.test(head) && list.length === 0;
    if (!isTag) list.push(frame);
    sampleRate = sr;
    mono = (b[i + 3] >> 6) === 3;
    samples = ver === 3 ? 1152 : 576;
    i += len;
  }
  return { list, info: { sampleRate, mono, frames: list.length, seconds: (list.length * samples) / sampleRate } };
}

/** Склеює репліки (mp3 одного формату) з паузами між ними. */
export function joinWithGaps(clips: Buffer[], gaps: number[]): { mp3: Buffer; seconds: number } {
  const parts: Buffer[] = [];
  let seconds = 0;
  clips.forEach((clip, k) => {
    const { list, info } = frames(clip);
    if (k > 0) {
      const g = gaps[k - 1] ?? 0;
      const n = Math.round(g / FRAME_SEC);
      // кадр тиші є лише для 44,1 кГц; інша частота — пауза без кадрів (не ламаємо потік)
      if (n > 0 && info.sampleRate === 44100) {
        const f = info.mono ? SILENT_FRAME.mono : SILENT_FRAME.stereo;
        for (let j = 0; j < n; j++) parts.push(f);
        seconds += n * FRAME_SEC;
      }
    }
    parts.push(...list);
    seconds += info.seconds;
  });
  return { mp3: Buffer.concat(parts), seconds };
}
