'use client';

import { Component, type ReactNode } from 'react';
import { useT } from '@/i18n/client';

function Fallback({ onReset }: { onReset: () => void }) {
  const t = useT();
  return (
    <div className="ww-dock-crash" role="alert">
      <p>{t('Щось пішло не так')}</p>
      <button type="button" className="ww-btn ww-btn-secondary ww-btn-sm" onClick={onReset}>
        {t('Перезавантажити панель')}
      </button>
    </div>
  );
}

/** Падіння дока не має зачіпати лекцію під ним: показуємо заглушку й пишемо помилку в консоль. */
export class DockBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[dock] crash', error);
  }
  render() {
    if (this.state.err) return <Fallback onReset={() => this.setState({ err: false })} />;
    return this.props.children;
  }
}
