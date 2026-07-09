'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider, useSession } from 'next-auth/react';
import { todayKey } from '@/lib/months';

const MonthCtx = createContext<{ month: string; setMonth: (m: string) => void }>({ month: '', setMonth: () => {} });
export const useMonth = () => useContext(MonthCtx);

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

function Inner({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [month, setMonth] = useState(todayKey());
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated' && pathname !== '/login') router.replace('/login');
    if (status === 'authenticated' && pathname === '/login') router.replace('/');
  }, [status, pathname, router]);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }

  if (status === 'loading') return null; // evita piscar a tela errada enquanto checa a sessão

  return (
    <ToastCtx.Provider value={showToast}>
      <MonthCtx.Provider value={{ month, setMonth }}>
        {children}
        <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
      </MonthCtx.Provider>
    </ToastCtx.Provider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return (
    <SessionProvider>
      <QueryClientProvider client={qc}>
        <Inner>{children}</Inner>
      </QueryClientProvider>
    </SessionProvider>
  );
}
