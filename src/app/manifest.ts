import type { MetadataRoute } from 'next';

/**
 * Маніфест — щоб учень міг поставити Werba Way на домашній екран телефона
 * і відкривати картки зі слів одним дотиком, без адресного рядка.
 * Раніше `/manifest.json` віддавав 404, і кнопки «встановити» браузер не показував.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Werba Way — польська мова онлайн',
    short_name: 'Werba Way',
    description: 'Лекції, вправи й картки зі слів для вивчення польської.',
    start_url: '/learn',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f3f5fc',
    theme_color: '#ffffff',
    lang: 'uk',
    categories: ['education'],
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
