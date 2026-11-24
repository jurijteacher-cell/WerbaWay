/** Стискаємо знімок до JPEG: телефонне фото на 5–8 МБ — зайве для перевірки зошита. */
export async function shrink(file: File, max: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * k));
  const h = Math.max(1, Math.round(bmp.height * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', quality));
}

export const toDataUrl = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });

export type UploadedPhoto = { p: string; th: string };

/** Завантажує файл на /api/embed/photo (стиснутий JPEG) і повертає шлях + мініатюру. */
export async function uploadPhoto(file: File, token: string): Promise<UploadedPhoto> {
  const big = await shrink(file, 1600, 0.82);
  const small = await shrink(file, 160, 0.7);
  const fd = new FormData();
  fd.set('token', token);
  fd.set('file', new File([big], 'foto.jpg', { type: 'image/jpeg' }));
  const r = await fetch('/api/embed/photo', { method: 'POST', body: fd });
  if (!r.ok) throw new Error(String(r.status));
  const { path } = (await r.json()) as { path: string };
  return { p: path, th: await toDataUrl(small) };
}
