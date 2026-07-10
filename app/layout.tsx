import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from '@/components/Providers';

export const metadata: Metadata = { title: 'Minhas Finanças' };
export const viewport: Viewport = { themeColor: '#217a54' };

// aplica o tema salvo antes da primeira pintura, para não piscar a cor errada
const TEMA_SCRIPT = `try{var t=localStorage.getItem('tema');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
