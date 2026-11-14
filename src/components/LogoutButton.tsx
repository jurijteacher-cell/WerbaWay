'use client';

import { useT } from '@/i18n/client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const t = useT();
  const router = useRouter();

  const onClick = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button type="button" onClick={onClick} className="ww-btn ww-btn-secondary ww-btn-sm shrink-0">
      {t("Вийти")}
    </button>
  );
}
