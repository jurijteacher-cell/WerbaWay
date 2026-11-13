'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ResolveButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      className="ww-btn ww-btn-success ww-btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch('/api/report/resolve', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        router.refresh();
        setBusy(false);
      }}
    >
      Розібрано
    </button>
  );
}
