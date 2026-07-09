'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/', 'Visão geral'],
  ['/lancamentos', 'Lançamentos'],
  ['/cartao', 'Cartão'],
  ['/orcamento', 'Orçamento'],
  ['/config', 'Ajustes'],
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="sidebar">
      <div className="brand">
        <span className="brand-logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
        </span>
        <div>Minhas Finanças<small>controle pessoal</small></div>
      </div>
      {ITEMS.map(([href, label]) => (
        <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}>{label}</Link>
      ))}
      <div className="spacer" />
    </nav>
  );
}
