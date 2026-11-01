'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PageHead from '@/components/PageHead';
import CategoryTrendChart from '@/components/CategoryTrendChart';
import { useMonth } from '@/components/Providers';
import { useAllMonths, useAllTransactions, useBudgets } from '@/hooks/useFinance';
import { fmtBRL, fmtCompacto } from '@/lib/money';
import { monthName, shortMonth, todayKey } from '@/lib/months';
import { EvolucaoCategoria, Tendencia, evolucaoPorCategoria } from '@/lib/trend';
import { Transaction } from '@/lib/types';

const MESES_NO_GRAFICO = 6;
const CHAVE_FOCO = 'comparativo-foco';

const ROTULO: Record<Tendencia, string> = {
  abaixo: 'abaixo da média',
  acima: 'acima da média',
  'na-media': 'na média',
  'sem-historico': 'sem histórico',
};

function MiniBarras({ e }: { e: EvolucaoCategoria }) {
  const max = Math.max(1, ...e.serie.map(p => p.total));
  return (
    <div className="mini-barras" aria-hidden="true">
      {e.serie.map((p, i) => (
        <span key={p.month} title={`${shortMonth(p.month)}: ${fmtBRL(p.total)}`}
          className={i === e.serie.length - 1 ? 'atual' : ''}
          style={{ height: `${Math.max(4, (p.total / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function Diferenca({ atual, base, rotulo }: { atual: number; base: number | null; rotulo: string }) {
  if (base === null) return <div className="cmp-num"><span>{rotulo}</span><strong>—</strong></div>;
  const dif = atual - base;
  const cls = Math.abs(dif) < 0.005 ? '' : dif < 0 ? 'g' : 'r';
  return (
    <div className="cmp-num">
      <span>{rotulo}</span>
      <strong className={cls}>{dif < 0 ? '▼ ' : dif > 0 ? '▲ ' : ''}{fmtBRL(Math.abs(dif))}</strong>
      <small>{dif < 0 ? 'a menos' : dif > 0 ? 'a mais' : 'igual'}{base > 0 ? ` (${Math.round(Math.abs(dif / base) * 100)}%)` : ''}</small>
    </div>
  );
}

function VsLimite({ atual, limite }: { atual: number; limite: number }) {
  const passou = atual > limite;
  return (
    <div className="cmp-num">
      <span>Limite do orçamento ({fmtCompacto(limite)})</span>
      <strong className={passou ? 'r' : 'g'}>{passou ? `passou ${fmtBRL(atual - limite)}` : `sobram ${fmtBRL(limite - atual)}`}</strong>
      <small>{Math.round((atual / limite) * 100)}% do limite usado</small>
    </div>
  );
}

function DetalheMes({ categoria, month, itens, media, onClose }: {
  categoria: string; month: string; itens: Transaction[]; media: number | null; onClose: () => void;
}) {
  const total = itens.reduce((s, t) => s + Number(t.valor), 0);
  const dif = media !== null ? total - media : null;
  const maior = itens.length ? Number(itens[0].valor) : 0;
  return (
    <div className="mes-detalhe">
      <div className="mes-detalhe-head">
        <div>
          <strong>{categoria} em {monthName(month).toLowerCase()}</strong>
          <span>
            {fmtBRL(total)} em {itens.length} lançamento{itens.length === 1 ? '' : 's'}
            {dif !== null && Math.abs(dif) >= 0.01 && (
              <> · <b className={dif > 0 ? 'r' : 'g'}>{fmtBRL(Math.abs(dif))} {dif > 0 ? 'acima' : 'abaixo'} da média</b></>
            )}
          </span>
        </div>
        <button className="icon-btn" title="Fechar" onClick={onClose}>✕</button>
      </div>
      <div className="mes-detalhe-lista">
        {itens.map(t => (
          <div className="mes-item" key={t.id}>
            <span className="mes-item-dia">{t.dia_vencimento ? `dia ${t.dia_vencimento}` : '—'}</span>
            <span className="mes-item-desc">
              {t.descricao}
              {t.parcelas && t.parcelas > 1 && <span className="parcela-tag">{t.parcela}/{t.parcelas}</span>}
              <span className="badge">{t.type === 'fixo' ? 'Fixo' : 'Variável'}</span>
              {t.cartao && <span className="badge cartao">💳</span>}
            </span>
            <span className="mes-item-barra"><i style={{ width: `${maior ? (Number(t.valor) / maior) * 100 : 0}%` }} /></span>
            <span className="mes-item-valor">{fmtBRL(Number(t.valor))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Comparativo() {
  const { month } = useMonth();
  const allTxs = useAllTransactions();
  const allMonths = useAllMonths();
  const budgetsQ = useBudgets(month);
  const [foco, setFoco] = useState<string | null>(null);
  const [mesSel, setMesSel] = useState<string | null>(null);

  const catUrl = useSearchParams().get('cat');

  // vindo de um link (?cat=Lanche), a categoria do link entra em foco e fica salva
  useEffect(() => {
    if (catUrl) {
      setFoco(catUrl);
      try { localStorage.setItem(CHAVE_FOCO, catUrl); } catch {}
    } else {
      try { setFoco(localStorage.getItem(CHAVE_FOCO)); } catch {}
    }
  }, [catUrl]);

  if ([allTxs, allMonths, budgetsQ].some(q => q.isLoading)) return <p className="empty-row">Carregando…</p>;

  const meses = [...new Set([...(allMonths.data ?? []).map(m => m.month).filter(m => m <= month), month])]
    .sort().slice(-MESES_NO_GRAFICO);
  const evolucao = evolucaoPorCategoria(allTxs.data ?? [], meses);
  const limites = Object.fromEntries((budgetsQ.data ?? []).map(b => [b.categoria, Number(b.limite)]));

  function escolher(c: string) {
    setFoco(c);
    setMesSel(null);
    try { localStorage.setItem(CHAVE_FOCO, c); } catch {}
  }

  const emFoco = evolucao.find(e => e.categoria === foco) ?? evolucao[0];
  const emAndamento = month === todayKey();
  const melhoras = evolucao.filter(e => e.tendencia === 'abaixo').length;
  const pioras = evolucao.filter(e => e.tendencia === 'acima').length;

  return (
    <>
      <PageHead title="Comparativo" sub="Veja em quais categorias você está melhorando ou piorando, mês a mês." />

      {!emFoco ? (
        <div className="card"><div className="empty-row">Ainda não há gastos para comparar.</div></div>
      ) : (
        <>
          <div className="card foco-card">
            <div className="foco-head">
              <div>
                <div className="card-sub">Em foco · {monthName(month).toLowerCase()}</div>
                <h2>{emFoco.categoria}</h2>
              </div>
              <span className={`tend-pill ${emFoco.tendencia}`}>{ROTULO[emFoco.tendencia]}</span>
            </div>

            <div className="foco-numeros">
              <div className="cmp-num">
                <span>Gasto no mês</span>
                <strong>{fmtBRL(emFoco.atual)}</strong>
                <small>
                  <Link className="hint-link" href={`/lancamentos?cat=${encodeURIComponent(emFoco.categoria)}`}>ver lançamentos</Link>
                </small>
              </div>
              <Diferenca atual={emFoco.atual} base={emFoco.anterior} rotulo="Vs mês anterior" />
              <Diferenca atual={emFoco.atual} base={emFoco.media} rotulo={`Vs sua média (${meses.length - 1} meses)`} />
              {limites[emFoco.categoria] !== undefined && (
                <VsLimite atual={emFoco.atual} limite={limites[emFoco.categoria]} />
              )}
            </div>

            {emAndamento && (
              <div className="aviso-andamento">
                {monthName(month)} ainda está em andamento: os valores vão crescer até o fim do mês. Para comparar um mês fechado, volte com a seta ‹.
              </div>
            )}
            <CategoryTrendChart
              serie={emFoco.serie}
              media={emFoco.media}
              limite={limites[emFoco.categoria] ?? null}
              selecionado={mesSel}
              onSelect={m => setMesSel(mesSel === m ? null : m)}
            />
            <div className="legend">
              <span><i className="dot" style={{ background: 'var(--green)' }} />Dentro do limite</span>
              {limites[emFoco.categoria] !== undefined && <span><i className="dot" style={{ background: 'var(--red)' }} />Acima do limite</span>}
              <span><i className="tchart-legend-line media" />Sua média</span>
              {limites[emFoco.categoria] !== undefined && <span><i className="tchart-legend-line limite" />Limite</span>}
              {!mesSel && <span className="legend-dica">Clique numa barra para ver o que foi gasto naquele mês</span>}
            </div>
            {mesSel && (
              <DetalheMes
                key={`${emFoco.categoria}-${mesSel}`}
                categoria={emFoco.categoria}
                month={mesSel}
                media={emFoco.media}
                itens={(allTxs.data ?? [])
                  .filter(t => t.month === mesSel && t.type !== 'entrada' && (t.categoria || 'Outros') === emFoco.categoria)
                  .sort((a, b) => Number(b.valor) - Number(a.valor))}
                onClose={() => setMesSel(null)}
              />
            )}
          </div>

          <div className="section-header" style={{ marginTop: 28 }}>
            <h2>Todas as categorias</h2>
            <span className="card-sub">
              {melhoras} abaixo da média · {pioras} acima · clique para colocar em foco
            </span>
          </div>
          <div className="cat-grid">
            {evolucao.map(e => (
              <button key={e.categoria} className={`cat-tile ${e.categoria === emFoco.categoria ? 'sel' : ''}`} onClick={() => escolher(e.categoria)}>
                <div className="cat-tile-head">
                  <strong>{e.categoria}</strong>
                  <span className={`tend-pill ${e.tendencia}`}>{ROTULO[e.tendencia]}</span>
                </div>
                <div className="cat-tile-valor">{fmtBRL(e.atual)}</div>
                <MiniBarras e={e} />
                <div className="cat-tile-sub">
                  {e.media !== null ? `média ${fmtCompacto(e.media)}` : 'primeiro mês'}
                  {limites[e.categoria] !== undefined && ` · limite ${fmtCompacto(limites[e.categoria])}`}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export default function ComparativoPage() {
  return (
    <Suspense fallback={<p className="empty-row">Carregando…</p>}>
      <Comparativo />
    </Suspense>
  );
}
