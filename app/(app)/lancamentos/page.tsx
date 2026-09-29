'use client';
import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import PageHead from '@/components/PageHead';
import TxSection from '@/components/TxSection';
import { useMonth } from '@/components/Providers';
import { useMonthRow, useTransactions } from '@/hooks/useFinance';
import { fmtBRL } from '@/lib/money';
import { monthName } from '@/lib/months';
import { gastosPorCategoria, monthTotals } from '@/lib/totals';
import { Transaction } from '@/lib/types';

const porDia = (a: Transaction, b: Transaction) => (a.dia_vencimento ?? 99) - (b.dia_vencimento ?? 99);

function Lancamentos() {
  const { month } = useMonth();
  const monthRow = useMonthRow(month);
  const txsQ = useTransactions(month);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const cat = params.get('cat');

  // no celular as pílulas rolam de lado: traz a categoria escolhida para a vista
  useEffect(() => {
    document.querySelector('.pill.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [cat, txsQ.isLoading]);

  if (monthRow.isLoading || txsQ.isLoading) return <p className="empty-row">Carregando…</p>;

  const txs = txsQ.data ?? [];
  const gastos = Object.entries(gastosPorCategoria(txs)).sort((a, b) => b[1] - a[1]);
  const saidas = monthTotals(txs).saidas;
  const daCategoria = (t: Transaction) => t.type !== 'entrada' && (t.categoria || 'Outros') === cat;
  const filtrados = cat ? txs.filter(daCategoria).sort(porDia) : txs;
  const totalCat = cat ? gastos.find(([c]) => c === cat)?.[1] ?? 0 : 0;

  function escolher(c: string | null) {
    router.replace(c ? `${pathname}?cat=${encodeURIComponent(c)}` : pathname, { scroll: false });
  }

  return (
    <>
      <PageHead title="Lançamentos" sub="Cadastre suas entradas e gastos do mês." />
      {!monthRow.data ? (
        <div className="new-month">
          <p>O mês de <strong>{monthName(month)}</strong> ainda não foi iniciado. Inicie-o na Visão geral.</p>
        </div>
      ) : (
        <>
          {gastos.length > 0 && (
            <div className="pills" role="tablist" aria-label="Filtrar por categoria">
              <button className={`pill ${!cat ? 'active' : ''}`} onClick={() => escolher(null)}>Todas</button>
              {gastos.map(([c, v]) => (
                <button key={c} className={`pill ${cat === c ? 'active' : ''}`} onClick={() => escolher(cat === c ? null : c)}>
                  {c}<span className="v">{fmtBRL(v)}</span>
                </button>
              ))}
            </div>
          )}

          {cat && (
            <div className="filtro-resumo">
              <span>
                <strong>{cat}</strong>: {fmtBRL(totalCat)} em {filtrados.length} lançamento{filtrados.length === 1 ? '' : 's'}
                {saidas > 0 && <> · {Math.round((totalCat / saidas) * 100)}% das saídas do mês</>}
              </span>
              <button className="hint-link" onClick={() => escolher(null)}>ver todos</button>
            </div>
          )}

          {!cat && <TxSection title="Entradas" type="entrada" color="green" txs={txs.filter(t => t.type === 'entrada')} />}
          <TxSection key={`fixo-${cat}`} title="Custos fixos" type="fixo" color="red" categoriaPadrao={cat}
            txs={filtrados.filter(t => t.type === 'fixo')} />
          <TxSection key={`variavel-${cat}`} title="Custos variáveis" type="variavel" color="red" categoriaPadrao={cat}
            txs={filtrados.filter(t => t.type === 'variavel')} />
        </>
      )}
    </>
  );
}

export default function LancamentosPage() {
  return (
    <Suspense fallback={<p className="empty-row">Carregando…</p>}>
      <Lancamentos />
    </Suspense>
  );
}
