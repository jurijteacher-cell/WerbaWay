'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Role = 'student' | 'teacher';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [teacherCode, setTeacherCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          requested_role: role,
          teacher_code: role === 'teacher' ? teacherCode : undefined,
        },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h1 className="mb-2 font-display text-2xl text-paper">Перевір пошту</h1>
          <p className="text-paper-muted">Ми надіслали лист для підтвердження акаунта.</p>
          <Link href="/login" className="mt-6 inline-block text-gold hover:text-gold-bright">
            До входу
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-display text-3xl text-paper">Реєстрація</h1>
        <p className="mb-8 text-paper-muted">Створи акаунт у Werba Way</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              required
              placeholder="Ім'я"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold"
            />
            <input
              type="text"
              required
              placeholder="Прізвище"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold"
            />
          </div>

          <div>
            <p className="mb-2 text-sm text-paper-muted">Я реєструюсь як</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  role === 'student'
                    ? 'border-gold bg-gold/10 text-gold-bright'
                    : 'border-ink-line text-paper-muted hover:border-gold/40'
                }`}
              >
                Учень
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                  role === 'teacher'
                    ? 'border-gold bg-gold/10 text-gold-bright'
                    : 'border-ink-line text-paper-muted hover:border-gold/40'
                }`}
              >
                Вчитель
              </button>
            </div>
          </div>

          {role === 'teacher' && (
            <input
              type="text"
              required
              placeholder="Код запрошення вчителя"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              className="rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold"
            />
          )}

          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Пароль (мінімум 6 символів)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-ink-line bg-ink-raised px-4 py-3 text-paper placeholder:text-paper-muted outline-none focus:border-gold"
          />
          {error && <p className="text-sm text-incorrect">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gold px-5 py-3 font-medium text-ink transition-colors hover:bg-gold-bright disabled:opacity-50"
          >
            {loading ? 'Створюю…' : 'Зареєструватись'}
          </button>
        </form>

        <p className="mt-6 text-sm text-paper-muted">
          Вже маєш акаунт?{' '}
          <Link href="/login" className="text-gold hover:text-gold-bright">
            Увійти
          </Link>
        </p>
      </div>
    </main>
  );
}
