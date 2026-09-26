'use client';
import { useState } from 'react';
import { ResumoDiario } from '@/lib/daily';
import { fmtBRL, fmtCompacto } from '@/lib/money';
import { monthName, todayKey } from '@/lib/months';

const SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

export default function DailySpendCalendar({ resumo, month }: { resumo: ResumoDiario; month: string }) {
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [y, m] = month.split('-').map(Number);
  const offset = new Date(y, m - 1, 1).getDay();
  const hoje = todayKey() === month ? new Date().getDate() : null;
  const max = resumo.maiorDia?.total ?? 0;
  const mm = String(m).padStart(2, '0');

  const detalhe = selecionado === null
    ? null
    : selecionado === 0 ? resumo.semData : resumo.dias[selecionado - 1];

  return (
    <>
      <h3>Saídas por dia</h3>
      <div className="card-sub" style={{ marginBottom: 8 }}>
        {monthName(month).toLowerCase().replace(' de ', ' ')} · quanto saiu em cada dia
      </div>
      <div className="cal-total">
        <strong>{fmtBRL(resumo.total)}</strong>
        <span>
          em {resumo.diasComSaida} dia{resumo.diasComSaida === 1 ? '' : 's'} com saída
          {resumo.semData.total > 0 && (
            <>
              {' · '}
              <button className="hint-link" style={{ fontSize: 12 }} onClick={() => setSelecionado(0)}>
                {fmtBRL(resumo.semData.total)} sem dia definido
              </button>
            </>
          )}
        </span>
      </div>

      <div className="cal-grid">
        {SEMANA.map(d => <div key={d} className="cal-head">{d}</div>)}
        {Array.from({ length: offset }, (_, i) => <div key={`vazio-${i}`} />)}
        {resumo.dias.map(d => {
          const intensidade = d.total > 0 ? Math.round(14 + (d.total / max) * 46) : 0;
          const classes = ['cal-cell', d.total > 0 ? '' : 'empty', d.dia === hoje ? 'today' : '', d.dia === selecionado ? 'sel' : '']
            .filter(Boolean).join(' ');
          return (
            <button
              key={d.dia}
              className={classes}
              disabled={d.total === 0}
              onClick={() => setSelecionado(selecionado === d.dia ? null : d.dia)}
              style={d.total > 0 ? { background: `color-mix(in srgb, var(--red) ${intensidade}%, var(--card))` } : undefined}
              title={d.total > 0 ? `${String(d.dia).padStart(2, '0')}/${mm} · ${fmtBRL(d.total)}` : undefined}
            >
              <span className="d">{d.dia}</span>
              <span className="v">
                {d.total > 0 ? <><span className="rs">R$ </span>{fmtCompacto(d.total).replace('R$ ', '')}</> : '–'}
              </span>
            </button>
          );
        })}
      </div>

      {detalhe && (
        <div className="cal-detail">
          <div className="cal-detail-head">
            <strong>
              {detalhe.dia === 0
                ? 'Sem dia definido'
                : `${new Date(y, m - 1, detalhe.dia).toLocaleDateString('pt-BR', { weekday: 'long' })}, ${String(detalhe.dia).padStart(2, '0')}/${mm}`}
              {' · '}{fmtBRL(detalhe.total)}
            </strong>
            <button className="icon-btn" title="Fechar" onClick={() => setSelecionado(null)}>✕</button>
          </div>
          {detalhe.itens.map((i, idx) => (
            <div className="cal-detail-row" key={idx}>
              <span>{i.descricao}</span>
              <span className="badge">{i.tipo}</span>
              <span className="num">{fmtBRL(i.valor)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="cal-foot">
        <div><div className="k">Média por dia</div><div className="n">{fmtBRL(resumo.mediaPorDia)}</div></div>
        <div>
          <div className="k">Maior dia</div>
          <div className="n">
            {resumo.maiorDia ? `${String(resumo.maiorDia.dia).padStart(2, '0')}/${mm} · ${fmtCompacto(resumo.maiorDia.total)}` : '—'}
          </div>
        </div>
        <div><div className="k">Dias sem saída</div><div className="n">{resumo.dias.length - resumo.diasComSaida}</div></div>
        <div className="cal-hint">Toque num dia para ver as saídas</div>
      </div>
    </>
  );
}
