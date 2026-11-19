/** Анімація логотипа вже грала в цьому відвідуванні (див. LogoBloom.tsx). Без 'use client' — читає й layout. */
export const BLOOM_SEEN_KEY = 'ww.bloomSeen';
export const BLOOM_SEEN_ATTR = 'data-ww-bloom';

/** Інлайн-скрипт у <head>: ставить позначку ще до першого кадру, щоб після оновлення сторінки анімація не стартувала знову. */
export const BLOOM_SEEN_SCRIPT = `try{if(sessionStorage.getItem('${BLOOM_SEEN_KEY}'))document.documentElement.setAttribute('${BLOOM_SEEN_ATTR}','seen')}catch(e){}`;
