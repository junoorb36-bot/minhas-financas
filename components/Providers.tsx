'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayKey } from '@/lib/months';

const MonthCtx = createContext<{ month: string; setMonth: (m: string) => void }>({ month: '', setMonth: () => {} });
export const useMonth = () => useContext(MonthCtx);

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  const [month, setMonth] = useState(todayKey());
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authed === false && pathname !== '/login') router.replace('/login');
    if (authed === true && pathname === '/login') router.replace('/');
  }, [authed, pathname, router]);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }

  if (authed === null) return null; // evita piscar a tela errada enquanto checa a sessão

  return (
    <QueryClientProvider client={qc}>
      <ToastCtx.Provider value={showToast}>
        <MonthCtx.Provider value={{ month, setMonth }}>
          {children}
          <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
        </MonthCtx.Provider>
      </ToastCtx.Provider>
    </QueryClientProvider>
  );
}
