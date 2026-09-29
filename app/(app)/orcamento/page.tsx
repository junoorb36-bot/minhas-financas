'use client';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import { useMonth, useToast } from '@/components/Providers';
import { useBudgets, useTransactions } from '@/hooks/useFinance';
import { setBudget } from '@/lib/actions';
import { statusOrcamento } from '@/lib/budget';
import { CATEGORIAS } from '@/lib/categories';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { gastosPorCategoria } from '@/lib/totals';

export default function Orcamento() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const budgetsQ = useBudgets(month);
  const txsQ = useTransactions(month);

  if (budgetsQ.isLoading || txsQ.isLoading) {
    return <p className="empty-row">Carregando…</p>;
  }

  const budgets = budgetsQ.data ?? [];
  const gastos = gastosPorCategoria(txsQ.data ?? []);

  async function setLimite(categoria: string, value: string) {
    const v = parseValorBR(value);
    const existing = budgets.find(b => b.categoria === categoria);
    const novoLimite = !value.trim() || isNaN(v) || v <= 0 ? null : v;
    if (novoLimite === null && !existing) return;
    try {
      await setBudget(month, categoria, novoLimite);
    } catch {
      toast('Erro ao salvar o limite');
      return;
    }
    qc.invalidateQueries();
  }

  const totalOrcado = budgets.reduce((s, b) => s + Number(b.limite), 0);
  const totalGasto = CATEGORIAS.reduce((s, c) => s + (gastos[c] || 0), 0);

  return (
    <>
      <PageHead title="Orçamento" sub="Defina limites por categoria e acompanhe o consumo do mês." />
      <div className="card">
        {CATEGORIAS.map(categoria => {
          const b = budgets.find(x => x.categoria === categoria);
          const limite = b ? Number(b.limite) : 0;
          const gasto = gastos[categoria] || 0;
          const pct = limite > 0 ? Math.min(100, (gasto / limite) * 100) : 0;
          const status = limite > 0 ? statusOrcamento(gasto, limite) : 'ok';
          const cls = status === 'estourou' ? 'over' : status === 'alerta' ? 'warn' : '';
          return (
            <div className="budget-row" key={categoria}>
              <span className="b-cat">{categoria}</span>
              <input
                className="b-limit"
                placeholder="sem limite"
                defaultValue={limite ? limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                onBlur={e => setLimite(categoria, e.target.value)}
                aria-label={`Limite de ${categoria}`}
              />
              <div className="b-bar"><div className={cls} style={{ width: `${pct}%` }} /></div>
              <span className="b-spent">
                {limite > 0
                  ? `${fmtBRL(gasto)} de ${fmtBRL(limite)}${gasto > limite ? ' — estourou!' : ''}`
                  : gasto > 0 ? `${fmtBRL(gasto)} gastos` : '—'}
              </span>
            </div>
          );
        })}
        <div className="budget-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span className="b-cat" style={{ fontWeight: 600 }}>Total</span>
          <span className="b-limit" style={{ border: 'none', background: 'none' }} />
          <div className="b-bar" style={{ visibility: 'hidden' }} />
          <span className="b-spent" style={{ fontWeight: 600, color: 'var(--text)' }}>
            {fmtBRL(totalGasto)} de {fmtBRL(totalOrcado)}
          </span>
        </div>
      </div>
    </>
  );
}
