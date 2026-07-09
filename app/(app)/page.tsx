'use client';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useMonth, useToast } from '@/components/Providers';
import PageHead from '@/components/PageHead';
import EvolutionChart from '@/components/EvolutionChart';
import {
  useAllMonths, useAllTransactions, useBudgets, useCard,
  useMonthRow, usePaidInvoices, usePurchases, useTransactions,
} from '@/hooks/useFinance';
import { iniciarMes as iniciarMesAction, setMeta as setMetaAction } from '@/lib/actions';
import { faturaDoMes } from '@/lib/invoice';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { monthName } from '@/lib/months';
import { gastosPorCategoria, monthTotals } from '@/lib/totals';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const monthRow = useMonthRow(month);
  const txsQ = useTransactions(month);
  const allMonths = useAllMonths();
  const allTxs = useAllTransactions();
  const cardQ = useCard();
  const purchasesQ = usePurchases();
  const paidQ = usePaidInvoices();
  const budgetsQ = useBudgets(month);

  const queries = [monthRow, txsQ, allMonths, allTxs, cardQ, purchasesQ, paidQ, budgetsQ];
  if (queries.some(x => x.isLoading)) return <p className="empty-row">Carregando…</p>;
  if (queries.some(x => x.isError)) return <p className="empty-row">Erro ao carregar dados — verifique sua conexão e recarregue.</p>;

  const card = cardQ.data ?? null;
  const purchases = purchasesQ.data ?? [];
  const paidMonths = (paidQ.data ?? []).filter(p => p.pago).map(p => p.month);
  const txs = txsQ.data ?? [];
  const fatura = card ? faturaDoMes(purchases, card, month) : { items: [], total: 0 };
  const t = monthTotals(txs, fatura.total);
  const meta = Number(monthRow.data?.meta ?? 0);

  async function iniciarMes() {
    try {
      const { copiados } = await iniciarMesAction(month);
      qc.invalidateQueries();
      if (copiados) toast(`${copiados} custos fixos copiados do mês anterior`);
    } catch {
      toast('Erro ao iniciar o mês');
    }
  }

  if (!monthRow.data) {
    return (
      <>
        <PageHead title={`${greeting()}!`} sub="Acompanhe a evolução das suas finanças." />
        <div className="new-month">
          <p>O mês de <strong>{monthName(month)}</strong> ainda não foi iniciado.</p>
          <button onClick={iniciarMes}>Iniciar mês</button>
        </div>
      </>
    );
  }

  async function setMeta(value: string) {
    const v = parseValorBR(value);
    await setMetaAction(month, isNaN(v) || v < 0 ? 0 : v);
    qc.invalidateQueries();
  }

  // pendentes: lançamentos não pagos + fatura não paga
  const faturaPaga = paidMonths.includes(month);
  const pend: { desc: string; tipo: string; dia: number | null; valor: number }[] = [
    ...txs.filter(x => x.type !== 'entrada' && !x.pago)
      .map(x => ({ desc: x.descricao, tipo: x.type === 'fixo' ? 'Fixo' : 'Variável', dia: x.dia_vencimento, valor: Number(x.valor) })),
    ...(card && fatura.total > 0 && !faturaPaga
      ? [{ desc: `Fatura ${card.nome}`, tipo: 'Cartão', dia: card.dia_vencimento as number | null, valor: fatura.total }] : []),
  ].sort((a, b) => (a.dia || 99) - (b.dia || 99));

  const gastos = gastosPorCategoria(txs, fatura.items);
  const cats = Object.entries(gastos).sort((a, b) => b[1] - a[1]);
  const maxCat = cats.length ? cats[0][1] : 1;

  const evoKeys = (allMonths.data ?? []).map(m => m.month).filter(k => k <= month).slice(-12);
  const evo = evoKeys.map(k => {
    const f = card ? faturaDoMes(purchases, card, k).total : 0;
    const tt = monthTotals((allTxs.data ?? []).filter(x => x.month === k), f);
    return { key: k, entradas: tt.entradas, saidas: tt.saidas, saldo: tt.saldo };
  });

  const metaPct = meta > 0 ? Math.max(0, Math.min(100, (t.saldo / meta) * 100)) : 0;
  const metaOk = meta > 0 && t.saldo >= meta;
  const totalOrcado = (budgetsQ.data ?? []).reduce((s, b) => s + Number(b.limite), 0);
  const totalGasto = Object.values(gastos).reduce((s, v) => s + v, 0);

  return (
    <>
      <PageHead title={`${greeting()}!`} sub="Acompanhe a evolução das suas finanças." />
      <div className="summary">
        <div className="card highlight">
          <div className="label">Saldo do mês</div>
          <div className="value">{fmtBRL(t.saldo)}</div>
          <div className="sub">entradas − saídas (com fatura)</div>
        </div>
        <div className="card">
          <div className="label">Entradas</div>
          <div className="value green">{fmtBRL(t.entradas)}</div>
          <div className="sub">{txs.filter(x => x.type === 'entrada').length} lançamento(s)</div>
        </div>
        <div className="card">
          <div className="label">Saídas</div>
          <div className="value red">{fmtBRL(t.saidas)}</div>
          <div className="sub">{fatura.total > 0 ? `inclui fatura de ${fmtBRL(fatura.total)}` : `${pend.length} conta(s) pendente(s)`}</div>
        </div>
        <div className="card meta-card">
          <div className="label">Meta de economia</div>
          <input
            type="text"
            defaultValue={meta ? meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
            placeholder="ex.: 500,00"
            onBlur={e => setMeta(e.target.value)}
            aria-label="Meta de economia do mês"
          />
          <div className="meta-bar"><div className={meta > 0 && !metaOk ? 'fail' : ''} style={{ width: `${meta > 0 ? metaPct : 0}%` }} /></div>
          <div className="sub">{meta > 0 ? (metaOk ? 'Meta atingida ✓' : `${fmtBRL(Math.max(0, meta - t.saldo))} faltando`) : 'defina uma meta mensal'}</div>
        </div>
      </div>

      <div className="charts">
        <div className="card chart-card">
          <h3>Evolução mês a mês</h3>
          <div className="card-sub">entradas, saídas e saldo dos últimos meses</div>
          <EvolutionChart data={evo} />
          <div className="legend">
            <span><i className="dot" style={{ background: 'var(--green)' }} />Entradas</span>
            <span><i className="dot" style={{ background: 'var(--ink)' }} />Saídas</span>
            <span><i className="dot" style={{ background: 'var(--red)' }} />Saldo</span>
          </div>
        </div>
        <div className="card chart-card">
          <h3>Gastos por categoria</h3>
          <div className="card-sub">lançamentos + parcelas do cartão</div>
          {cats.length === 0 && <div className="empty-row">Cadastre gastos para ver a divisão por categoria.</div>}
          {cats.map(([cat, val]) => (
            <div className="cat-row" key={cat}>
              <span className="cat-name">{cat}</span>
              <div className="cat-bar-wrap"><div className="cat-bar" style={{ width: `${(val / maxCat) * 100}%` }} /></div>
              <span className="cat-val">{fmtBRL(val)}</span>
            </div>
          ))}
          {totalOrcado > 0 && (
            <div className="cat-row" style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span className="cat-name" style={{ color: 'var(--text)', fontWeight: 600 }}>Orçamento</span>
              <div style={{ flex: 1 }} />
              <span className="cat-val" style={{ width: 'auto' }}>{fmtBRL(totalGasto)} de {fmtBRL(totalOrcado)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card pending-card">
        <h3>Contas pendentes do mês</h3>
        <div className="card-sub">ordenadas pelo dia de vencimento</div>
        {pend.length === 0 ? (
          <div className="empty-row" style={{ padding: '8px 0' }}>Nenhuma conta pendente — tudo pago ✓</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ background: 'none', paddingLeft: 0 }}>Descrição</th>
                <th className="hide-mobile" style={{ background: 'none' }}>Tipo</th>
                <th className="center" style={{ background: 'none' }}>Vencimento</th>
                <th className="num" style={{ background: 'none', paddingRight: 0 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {pend.map((p, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: 0 }}>{p.tipo === 'Cartão' ? <Link href="/cartao" className="hint-link" style={{ textDecoration: 'none' }}>{p.desc}</Link> : p.desc}</td>
                  <td className="hide-mobile"><span className="badge">{p.tipo}</span></td>
                  <td className="center">{p.dia ? `dia ${p.dia}` : '—'}</td>
                  <td className="num" style={{ paddingRight: 0 }}>{fmtBRL(p.valor)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 600, paddingLeft: 0 }}>Total pendente</td>
                <td className="hide-mobile" /><td />
                <td className="num" style={{ fontWeight: 700, paddingRight: 0, color: 'var(--amber)' }}>
                  {fmtBRL(pend.reduce((s, p) => s + p.valor, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
