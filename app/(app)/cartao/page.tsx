'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import Donut from '@/components/Donut';
import CardEvolution from '@/components/CardEvolution';
import { useMonth, useToast } from '@/components/Providers';
import { useAllMonths, useAllTransactions, useCard, useTransactions } from '@/hooks/useFinance';
import {
  deleteGrupo, deleteTransaction, insertCard, insertCompraCartao, setFaturaPaga, setTransactionPago, updateCard,
} from '@/lib/actions';
import { evolucaoCartao, limiteUsado, variacaoPercentual } from '@/lib/cartao';
import { CATEGORIAS } from '@/lib/categories';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { monthName, todayKey } from '@/lib/months';
import { monthTotals } from '@/lib/totals';
import { Card, Transaction } from '@/lib/types';

function CardConfig({ card }: { card: Card | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [nome, setNome] = useState(card?.nome ?? '');
  const [fech, setFech] = useState(card ? String(card.dia_fechamento) : '');
  const [venc, setVenc] = useState(card ? String(card.dia_vencimento) : '');
  const [limite, setLimite] = useState(card?.limite ? card.limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const f = Number(fech), v = Number(venc);
    const lim = limite.trim() ? parseValorBR(limite) : null;
    if (!nome.trim()) { toast('Digite o nome do cartão'); return; }
    if (!f || f < 1 || f > 28 || !v || v < 1 || v > 28) { toast('Fechamento e vencimento devem ser dias entre 1 e 28'); return; }
    if (lim !== null && (isNaN(lim) || lim <= 0)) { toast('Limite inválido'); return; }
    const dados = { nome: nome.trim(), dia_fechamento: f, dia_vencimento: v, limite: lim };
    try {
      if (card) await updateCard(dados);
      else await insertCard(dados);
    } catch {
      toast('Erro ao salvar o cartão');
      return;
    }
    qc.invalidateQueries();
    toast('Cartão salvo');
  }

  return (
    <details className="card card-config" open={!card}>
      <summary>⚙ {card ? `Configurações do cartão ${card.nome}` : 'Configure seu cartão (nome, fechamento e vencimento)'}</summary>
      <form className="add-form" onSubmit={salvar} style={{ marginTop: 0 }}>
        <input className="f-desc" placeholder="Nome (ex.: Santander)" value={nome} onChange={e => setNome(e.target.value)} />
        <input className="f-dia" type="number" min={1} max={28} placeholder="Dia fech." title="Dia do fechamento" value={fech} onChange={e => setFech(e.target.value)} />
        <input className="f-dia" type="number" min={1} max={28} placeholder="Dia venc." title="Dia do vencimento" value={venc} onChange={e => setVenc(e.target.value)} />
        <input className="f-val" placeholder="Limite (R$)" value={limite} onChange={e => setLimite(e.target.value)} />
        <button type="submit">Salvar</button>
      </form>
      <div className="card-sub" style={{ marginTop: 10 }}>
        Com o fechamento configurado, a data da compra decide em qual fatura ela entra: compras depois do fechamento vão para a fatura seguinte.
      </div>
    </details>
  );
}

export default function Cartao() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const cardQ = useCard();
  const txsQ = useTransactions(month);
  const allTxs = useAllTransactions();
  const allMonths = useAllMonths();

  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);
  const [tipo, setTipo] = useState<'variavel' | 'fixo'>('variavel');
  const [parcelas, setParcelas] = useState('1');
  const [data, setData] = useState('');
  const [enviando, setEnviando] = useState(false);

  if ([cardQ, txsQ, allTxs, allMonths].some(q => q.isLoading)) return <p className="empty-row">Carregando…</p>;

  const card = cardQ.data ?? null;
  const itens = (txsQ.data ?? [])
    .filter(t => t.cartao)
    .sort((a, b) => (a.dia_vencimento ?? 99) - (b.dia_vencimento ?? 99));
  const c = monthTotals(txsQ.data ?? []).cartao;
  const faturaPaga = itens.length > 0 && itens.every(t => t.pago);
  const usado = limiteUsado(allTxs.data ?? [], todayKey());
  const pct = (v: number) => (c.total > 0 ? Math.round((v / c.total) * 100) : 0);

  const meses = [...new Set([...(allMonths.data ?? []).map(m => m.month).filter(k => k <= month), month])].sort().slice(-12);
  const evo = evolucaoCartao(meses, allTxs.data ?? []);
  const anterior = evo.length > 1 ? evo[evo.length - 2] : null;
  const variacao = anterior ? variacaoPercentual(c.total, anterior.total) : null;

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const v = parseValorBR(valor);
    const n = tipo === 'fixo' ? 1 : Number(parcelas);
    if (!desc.trim()) { toast('Digite uma descrição'); return; }
    if (isNaN(v) || v <= 0) { toast('Valor inválido — use por ex. 150,00'); return; }
    if (!n || n < 1 || n > 48) { toast('Número de parcelas inválido'); return; }
    setEnviando(true);
    try {
      const msg = await insertCompraCartao({
        descricao: desc.trim(), valorTotal: v, parcelas: n, categoria: cat, type: tipo, dataCompra: data || null, mesBase: month,
      });
      setDesc(''); setValor(''); setParcelas('1'); setData('');
      qc.invalidateQueries();
      toast(msg);
    } catch {
      toast('Erro ao salvar — tente novamente');
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(t: Transaction) {
    if (t.grupo) {
      if (!confirm(`Excluir as ${t.parcelas} parcelas de "${t.descricao}"? (todas, inclusive as de outros meses)`)) return;
      await deleteGrupo(t.grupo);
    } else {
      if (!confirm(`Excluir "${t.descricao}"?`)) return;
      await deleteTransaction(t.id);
    }
    qc.invalidateQueries();
  }

  async function alternar(t: Transaction) {
    await setTransactionPago(t.id, !t.pago);
    qc.invalidateQueries();
  }

  async function pagarFatura() {
    await setFaturaPaga(month, !faturaPaga);
    qc.invalidateQueries();
    toast(faturaPaga ? 'Fatura marcada como pendente' : 'Fatura marcada como paga ✓');
  }

  const composicao = [
    { rotulo: 'Fixos no cartão', valor: c.fixos, cor: 'var(--green)' },
    { rotulo: 'Variáveis no cartão', valor: c.variaveis, cor: 'var(--ink)' },
  ];

  return (
    <>
      <PageHead title={card?.nome ?? 'Cartão de crédito'} sub="Tudo o que passou no cartão neste mês." />

      <div className="summary">
        <div className="card highlight">
          <div className="label">Fatura de {monthName(month).toLowerCase()}</div>
          <div className="value">{fmtBRL(c.total)}</div>
          <div className="sub">
            {card ? `vence dia ${card.dia_vencimento} · fecha dia ${card.dia_fechamento}` : 'configure o vencimento abaixo'}
          </div>
          {itens.length > 0 && (
            <button className={`status-btn ${faturaPaga ? 'pago' : 'pendente'}`} style={{ marginTop: 10 }} onClick={pagarFatura}>
              {faturaPaga ? 'Paga ✓' : 'Marcar fatura como paga'}
            </button>
          )}
        </div>
        <div className="card">
          <div className="label">Fixos no cartão</div>
          <div className="value">{fmtBRL(c.fixos)}</div>
          <div className="sub">{pct(c.fixos)}% da fatura · assinaturas e contas recorrentes</div>
        </div>
        <div className="card">
          <div className="label">Variáveis no cartão</div>
          <div className="value">{fmtBRL(c.variaveis)}</div>
          <div className="sub">{pct(c.variaveis)}% da fatura · compras do mês e parcelas</div>
        </div>
        <div className="card">
          <div className="label">{card?.limite ? 'Limite utilizado' : 'Comprometido no cartão'}</div>
          <div className="value">{fmtBRL(usado)}</div>
          <div className="sub">
            {card?.limite
              ? `de ${fmtBRL(card.limite)} (${Math.round((usado / card.limite) * 100)}%)`
              : 'faturas e parcelas ainda não pagas'}
          </div>
        </div>
      </div>

      <div className="charts">
        <div className="card chart-card">
          <h3>Evolução do cartão</h3>
          <div className="card-sub">
            fixos + variáveis no cartão, mês a mês
            {variacao !== null && (
              <> · <span className={`card-variacao ${variacao > 0 ? 'sobe' : variacao < 0 ? 'desce' : ''}`}>
                {variacao > 0 ? '▲' : variacao < 0 ? '▼' : '='} {Math.abs(variacao)}% vs {monthName(anterior!.key).toLowerCase().split(' ')[0]}
              </span></>
            )}
          </div>
          <CardEvolution data={evo} atual={month} />
          <div className="legend">
            <span><i className="dot" style={{ background: 'var(--green)' }} />Fixos</span>
            <span><i className="dot" style={{ background: 'var(--ink)' }} />Variáveis</span>
          </div>
        </div>
        <div className="card chart-card">
          <h3>Fixos vs Variáveis no cartão</h3>
          <div className="card-sub">
            {c.total === 0
              ? 'composição da fatura do mês'
              : c.fixos >= c.variaveis
                ? 'a maior parte da fatura são contas fixas'
                : 'a maior parte da fatura são compras variáveis'}
          </div>
          {c.total === 0 ? (
            <div className="empty-row" style={{ padding: '8px 0' }}>Nada no cartão neste mês.</div>
          ) : (
            <>
              <div style={{ margin: '4px 0 18px' }}>
                <Donut fatias={composicao} centro={fmtBRL(c.total)} sub="fatura do mês" />
              </div>
              {composicao.map(f => (
                <div className="cat-row" key={f.rotulo}>
                  <span className="cat-name" style={{ width: 150, display: 'flex', alignItems: 'center', gap: 7 }}>
                    <i className="dot" style={{ background: f.cor }} />{f.rotulo}
                  </span>
                  <div className="cat-bar-wrap">
                    <div className="cat-bar" style={{ width: `${(f.valor / Math.max(1, c.fixos, c.variaveis)) * 100}%`, background: f.cor }} />
                  </div>
                  <span className="cat-val" style={{ width: 150 }}>{fmtBRL(f.valor)} ({pct(f.valor)}%)</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Lançamentos no cartão</h2>
          <span className="total" style={{ color: 'var(--red)' }}>{fmtBRL(c.total)}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="hide-mobile">Tipo</th>
                <th className="hide-mobile">Categoria</th>
                <th className="center hide-mobile">Dia</th>
                <th className="num">Valor</th>
                <th className="center">Status</th>
                <th className="center" style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 && (
                <tr><td colSpan={7} className="empty-row">
                  Nada no cartão neste mês. Adicione abaixo, ou marque &quot;💳 Cartão&quot; num lançamento da aba Lançamentos.
                </td></tr>
              )}
              {itens.map(t => (
                <tr key={t.id} className={t.pago ? 'paid' : ''}>
                  <td>
                    {t.descricao}
                    {t.parcelas && t.parcelas > 1 && <span className="parcela-tag">{t.parcela}/{t.parcelas}</span>}
                  </td>
                  <td className="hide-mobile"><span className="badge">{t.type === 'fixo' ? 'Fixo' : 'Variável'}</span></td>
                  <td className="hide-mobile"><span className="badge">{t.categoria || 'Outros'}</span></td>
                  <td className="center hide-mobile">{t.dia_vencimento ? `dia ${t.dia_vencimento}` : '—'}</td>
                  <td className="num">{fmtBRL(Number(t.valor))}</td>
                  <td className="center">
                    <button className={`status-btn ${t.pago ? 'pago' : 'pendente'}`} onClick={() => alternar(t)}>
                      {t.pago ? 'Pago' : 'Pendente'}
                    </button>
                  </td>
                  <td className="center">
                    <button className="icon-btn danger" title={t.grupo ? 'Excluir todas as parcelas' : 'Excluir'} onClick={() => excluir(t)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="add-form" onSubmit={adicionar}>
          <input className="f-desc" placeholder="Descrição (ex.: sofá, uber, assinatura...)" value={desc} onChange={e => setDesc(e.target.value)} autoComplete="off" />
          <select className="f-cat" value={cat} onChange={e => setCat(e.target.value)} aria-label="Categoria">
            {CATEGORIAS.map(x => <option key={x}>{x}</option>)}
          </select>
          <select className="f-cat" style={{ width: 120 }} value={tipo} onChange={e => setTipo(e.target.value as 'variavel' | 'fixo')} aria-label="Tipo">
            <option value="variavel">Variável</option>
            <option value="fixo">Fixo</option>
          </select>
          <input className="f-val" placeholder="Valor total (R$)" value={valor} onChange={e => setValor(e.target.value)} autoComplete="off" />
          <input className="f-dia" type="number" min={1} max={48} placeholder="Parcelas" title="Número de parcelas"
            value={tipo === 'fixo' ? '1' : parcelas} disabled={tipo === 'fixo'} onChange={e => setParcelas(e.target.value)} />
          <input className="f-dia" style={{ width: 150 }} type="date" value={data} onChange={e => setData(e.target.value)}
            aria-label="Data da compra (opcional)" title="Data da compra (opcional)" />
          <button type="submit" disabled={enviando}>{enviando ? 'Salvando…' : 'Adicionar'}</button>
        </form>
        <div className="card-sub" style={{ marginTop: 8 }}>
          Sem data, a compra entra na fatura de {monthName(month).toLowerCase()}. Parcelada vira um lançamento em cada mês (1/10, 2/10…).
          Fixos marcados aqui são copiados para os próximos meses, como os outros fixos.
        </div>
      </div>

      <CardConfig key={card?.id ?? 'novo'} card={card} />
    </>
  );
}
