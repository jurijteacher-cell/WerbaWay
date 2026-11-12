import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

/** Смужка бренду для гостя; учень з акаунтом бачить звичайне меню сайту (TopNav) */
export async function PublicBar() {
  const {
    data: { user },
  } = await createClient().auth.getUser();
  if (user) return null;
  return (
    <header className="border-b border-ink-line bg-ink-raised/85">
      <div className="h-1" style={{ background: 'linear-gradient(90deg,#e4d9ff 0,#9adcc3 25%,#d3e9fb 50%,#f4b7c5 75%,#ded1ff 100%)' }} />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
        <span className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/werba-mark.png" alt="" width={34} height={34} className="rounded-full" />
          <span className="text-[15px] font-semibold tracking-[0.16em]">
            <span style={{ color: '#151c3c' }}>WERBA</span> <span style={{ color: '#a98bea' }}>WAY</span>
          </span>
        </span>
        <Link href="/login" className="ww-btn ww-btn-ghost ww-btn-sm">
          Увійти
        </Link>
      </div>
    </header>
  );
}
