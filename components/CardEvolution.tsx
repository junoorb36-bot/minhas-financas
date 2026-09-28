import { MesCartao } from '@/lib/cartao';
import { fmtCompacto } from '@/lib/money';
import { shortMonth } from '@/lib/months';

/** Barras empilhadas (fixos embaixo, variáveis em cima) do gasto no cartão por mês. */
export default function CardEvolution({ data, atual }: { data: MesCartao[]; atual: string }) {
  if (!data.length) return <div className="empty-row">Sem dados ainda.</div>;

  const W = 560, H = 220, padL = 8, padR = 8, padT = 22, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const max = Math.max(1, ...data.map(d => d.total));
  const slot = innerW / data.length;
  const barW = Math.min(40, slot * 0.5);
  const base = padT + innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Evolução do gasto no cartão por mês">
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="var(--border)" />
      {data.map((d, i) => {
        const cx = padL + slot * i + slot / 2;
        const hF = (d.fixos / max) * innerH;
        const hV = (d.variaveis / max) * innerH;
        const destaque = d.key === atual;
        return (
          <g key={d.key} opacity={destaque ? 1 : 0.55}>
            <rect x={cx - barW / 2} y={base - hF} width={barW} height={Math.max(hF, d.fixos > 0 ? 1 : 0)} fill="var(--green)">
              <title>Fixos: {fmtCompacto(d.fixos)}</title>
            </rect>
            <rect x={cx - barW / 2} y={base - hF - hV} width={barW} height={Math.max(hV, d.variaveis > 0 ? 1 : 0)} fill="var(--ink)">
              <title>Variáveis: {fmtCompacto(d.variaveis)}</title>
            </rect>
            {d.total > 0 && (
              <text x={cx} y={base - hF - hV - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--text)">
                {fmtCompacto(d.total)}
              </text>
            )}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fontWeight={destaque ? 700 : 400} fill="var(--text-subtle)">
              {shortMonth(d.key)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
