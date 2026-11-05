/** Student codes for embed results: name letters (transliterated) + 2 digits without 0/1. */

const TRANSLIT: Record<string, string> = {
  а: 'A', б: 'B', в: 'V', г: 'H', ґ: 'G', д: 'D', е: 'E', є: 'E', ж: 'Z', з: 'Z', и: 'Y', і: 'I',
  ї: 'I', й: 'J', к: 'K', л: 'L', м: 'M', н: 'N', о: 'O', п: 'P', р: 'R', с: 'S', т: 'T', у: 'U',
  ф: 'F', х: 'H', ц: 'C', ч: 'C', ш: 'S', щ: 'S', ь: '', ю: 'U', я: 'A', ы: 'Y', э: 'E', ё: 'E',
  ъ: '', ą: 'A', ć: 'C', ę: 'E', ł: 'L', ń: 'N', ó: 'O', ś: 'S', ź: 'Z', ż: 'Z',
};

function codeBase(name: string) {
  const ascii = name
    .toLowerCase()
    .split('')
    .map((ch) => (ch in TRANSLIT ? TRANSLIT[ch] : ch))
    .join('')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  return (ascii || 'UCZEN').slice(0, 5);
}

export function makeCode(name: string) {
  // 2 digits without 0/1 so the code isn't confused with O/I
  const digits = '23456789';
  const d = () => digits[Math.floor(Math.random() * digits.length)];
  return `${codeBase(name)}${d()}${d()}`;
}
