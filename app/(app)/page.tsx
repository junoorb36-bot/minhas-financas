'use client';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useMonth, useToast } from '@/components/Providers';
import PageHead from '@/components/PageHead';
import EvolutionChart from '@/components/EvolutionChart';
import DailySpendCalendar from '@/components/DailySpendCalendar';
import Donut from '@/components/Donut';
import MonthNote from '@/components/MonthNote';
import {
  useAllMonths, useAllTransactions, useBudgets, useCard, useMonthRow, useTransactions,
} from '@/hooks/useFinance';
import { iniciarMes as iniciarMesAction } from '@/lib/actions';
import { ROTULO_STATUS, situacaoOrcamento } from '@/lib/budget';
import { saidasPorDia } from '@/lib/daily';
import { fmtBRL } from '@/lib/money';
import { monthName } from '@/lib/months';
import { gastosPorCategoria, monthTotals, saldoAcumulado } from '@/lib/totals';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Info({ texto }: { texto: string }) {
  return (
    <span title={texto} aria-label={texto} style={{ display: 'inline-flex', cursor: 'help' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
  );
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
  const budgetsQ = useBudgets(month);

  const queries = [monthRow, txsQ, allMonths, allTxs, cardQ, budgetsQ];
  if (queries.some(x => x.isLoading)) return <p className="empty-row">Carregando…</p>;
  if (queries.some(x => x.isError)) return <p className="empty-row">Erro ao carregar dados — verifique sua conexão e recarregue.</p>;

  const card = cardQ.data ?? null;
  const txs = txsQ.data ?? [];
  const t = monthTotals(txs);

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

  const saldoConta = saldoAcumulado((allMonths.data ?? []).map(m => m.month), allTxs.data ?? [], month);

  const diario = saidasPorDia(txs, month);

  // pendentes: lançamentos fora do cartão não pagos + uma linha com o que falta pagar da fatura
  const faturaPendente = txs.filter(x => x.cartao && !x.pago).reduce((s, x) => s + Number(x.valor), 0);
  const pend: { desc: string; tipo: string; dia: number | null; valor: number }[] = [
    ...txs.filter(x => x.type !== 'entrada' && !x.pago && !x.cartao)
      .map(x => ({ desc: x.descricao, tipo: x.type === 'fixo' ? 'Fixo' : 'Variável', dia: x.dia_vencimento, valor: Number(x.valor) })),
    ...(faturaPendente > 0
      ? [{ desc: `Fatura ${card?.nome ?? 'do cartão'}`, tipo: 'Cartão', dia: card?.dia_vencimento ?? null, valor: Math.round(faturaPendente * 100) / 100 }]
      : []),
  ].sort((a, b) => (a.dia || 99) - (b.dia || 99));

  const gastos = gastosPorCategoria(txs);
  const cats = Object.entries(gastos).sort((a, b) => b[1] - a[1]);
  const maxCat = cats.length ? cats[0][1] : 1;

  const evoMeses = (allMonths.data ?? []).filter(m => m.month <= month).slice(-12);
  const evo = evoMeses.map(m => {
    const tt = monthTotals((allTxs.data ?? []).filter(x => x.month === m.month));
    return { key: m.month, entradas: tt.entradas, saidas: tt.saidas, saldo: tt.saldo, nota: m.nota };
  });

  const orcamento = situacaoOrcamento(budgetsQ.data ?? [], gastos);

  const composicao: [string, number, string][] = [
    ['Gastos fixos', t.fixos, 'var(--green)'],
    ['Gastos variáveis', t.variaveis, 'var(--ink)'],
  ];

  return (
    <>
      <PageHead title={`${greeting()}!`} sub="Acompanhe a evolução das suas finanças." />

      <div className="summary">
        <div className="card">
          <div className="label">Resultado do período <Info texto="Receitas − despesas do mês (inclui a fatura do cartão)" /></div>
          <div className="value" style={t.saldo < 0 ? { color: 'var(--red)' } : undefined}>{fmtBRL(t.saldo)}</div>
        </div>
        <div className="card">
          <div className="label">Receitas <Info texto="Soma das entradas do mês" /></div>
          <div className="value green">{fmtBRL(t.entradas)}</div>
        </div>
        <div className="card">
          <div className="label">Despesas <Info texto="Custos fixos + variáveis + fatura do cartão do mês" /></div>
          <div className="value red">{fmtBRL(t.saidas)}</div>
        </div>
        <div className="card">
          <div className="label">Saldo em conta <Info texto="Soma dos resultados de todos os meses até este (considera tudo como pago e recebido)" /></div>
          <div className="value" style={saldoConta < 0 ? { color: 'var(--red)' } : undefined}>{fmtBRL(saldoConta)}</div>
        </div>
      </div>

      <div className="charts">
        <div className="card chart-card">
          <DailySpendCalendar key={month} resumo={diario} month={month} />
        </div>
        <div className="card chart-card cat-card">
          <h3>Gastos por categoria</h3>
          <div className="card-sub">dentro e fora do cartão · clique numa categoria para ver os lançamentos</div>
          {cats.length === 0 && <div className="empty-row">Cadastre gastos para ver a divisão por categoria.</div>}
          {cats.map(([cat, val]) => (
            <Link className="cat-row cat-link" key={cat} href={`/lancamentos?cat=${encodeURIComponent(cat)}`} title={`Ver os lançamentos de ${cat}`}>
              <span className="cat-name">{cat}</span>
              <div className="cat-bar-wrap"><div className="cat-bar" style={{ width: `${(val / maxCat) * 100}%` }} /></div>
              <span className="cat-val">{fmtBRL(val)}</span>
            </Link>
          ))}
          <div className="orc-resumo">
            <div className="orc-head">
              <h4>Orçamento do mês</h4>
              <Link href="/orcamento" className="hint-link">{orcamento.length ? 'ajustar limites' : 'definir limites'}</Link>
            </div>
            {orcamento.length === 0 ? (
              <div className="card-sub">Defina limites por categoria para acompanhar aqui se está dentro do previsto.</div>
            ) : (
              <div className="orc-pills">
                {orcamento.map(o => (
                  <Link
                    key={o.categoria}
                    href={`/lancamentos?cat=${encodeURIComponent(o.categoria)}`}
                    className={`orc-pill ${o.status}`}
                    title={`${o.categoria}: ${fmtBRL(o.gasto)} de ${fmtBRL(o.limite)}${o.status === 'estourou'
                      ? ` — passou ${fmtBRL(o.gasto - o.limite)}`
                      : ` — sobram ${fmtBRL(o.limite - o.gasto)}`}`}
                  >
                    <i />{o.categoria} · <span>{ROTULO_STATUS[o.status]}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <MonthNote key={month} month={month} nota={monthRow.data.nota} />
        </div>
      </div>

      <div className="charts">
        <div className="card chart-card">
          <h3>Evolução mês a mês</h3>
          <div className="card-sub">entradas, saídas e saldo dos últimos meses · ✎ = mês com observação</div>
          <EvolutionChart data={evo} />
          <div className="legend">
            <span><i className="dot" style={{ background: 'var(--green)' }} />Entradas</span>
            <span><i className="dot" style={{ background: 'var(--ink)' }} />Saídas</span>
            <span><i className="dot" style={{ background: 'var(--red)' }} />Saldo</span>
          </div>
        </div>
        <div className="card chart-card">
          <h3>Fixos vs Variáveis</h3>
          <div className="card-sub">
            {t.saidas === 0
              ? 'composição das saídas do mês'
              : t.fixos === t.variaveis
                ? 'fixos e variáveis empatados neste mês'
                : `seu maior gasto do mês é com custos ${t.fixos > t.variaveis ? 'fixos' : 'variáveis'}`}
          </div>
          {t.saidas === 0 ? (
            <div className="empty-row" style={{ padding: '8px 0' }}>Sem saídas neste mês.</div>
          ) : (
            <>
              <div style={{ margin: '4px 0 18px' }}>
                <Donut
                  fatias={composicao.map(([rotulo, valor, cor]) => ({ rotulo, valor, cor }))}
                  centro={fmtBRL(t.saidas)}
                  sub="total de saídas"
                />
              </div>
              {composicao.map(([nome, valor, cor]) => (
                <div className="cat-row" key={nome}>
                  <span className="cat-name" style={{ width: 130, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="dot" style={{ background: cor }} />{nome}
                  </span>
                  <div className="cat-bar-wrap">
                    <div className="cat-bar" style={{ width: `${(valor / Math.max(1, t.fixos, t.variaveis)) * 100}%`, background: cor }} />
                  </div>
                  <span className="cat-val" style={{ width: 150 }}>
                    {fmtBRL(valor)} ({Math.round((valor / t.saidas) * 100)}%)
                  </span>
                </div>
              ))}
              {t.cartao.total > 0 && (
                <div className="cat-row" style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12, flexWrap: 'wrap' }}>
                  <Link href="/cartao" className="hint-link" style={{ textDecoration: 'none' }}>💳 No cartão</Link>
                  <span style={{ color: 'var(--text-muted)' }}>
                    fixos {fmtBRL(t.cartao.fixos)} · variáveis {fmtBRL(t.cartao.variaveis)}
                  </span>
                  <span className="cat-val" style={{ width: 'auto', marginLeft: 'auto' }}>
                    {fmtBRL(t.cartao.total)} ({Math.round((t.cartao.total / t.saidas) * 100)}%)
                  </span>
                </div>
              )}
            </>
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
