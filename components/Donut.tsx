export interface Fatia {
  rotulo: string;
  valor: number;
  cor: string;
}

export default function Donut({ fatias, centro, sub }: { fatias: Fatia[]; centro: string; sub: string }) {
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  const r = 70;
  const circ = 2 * Math.PI * r;
  const arcos = fatias.filter(f => f.valor > 0).reduce<{ f: Fatia; len: number; offset: number }[]>((acc, f) => {
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].len : 0;
    return [...acc, { f, len: (f.valor / total) * circ, offset }];
  }, []);

  return (
    <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 190, display: 'block', margin: '0 auto' }} role="img" aria-label={`${sub}: ${centro}`}>
      <circle cx={100} cy={100} r={r} fill="none" stroke="var(--bg)" strokeWidth={24} />
      {arcos.map(({ f, len, offset }) => (
        <circle
          key={f.rotulo}
          cx={100} cy={100} r={r}
          fill="none"
          stroke={f.cor}
          strokeWidth={24}
          strokeDasharray={`${len} ${circ - len}`}
          strokeDashoffset={-offset}
          transform="rotate(-90 100 100)"
        >
          <title>{f.rotulo}</title>
        </circle>
      ))}
      <text x={100} y={98} textAnchor="middle" fontSize={centro.length > 13 ? 13 : 16} fontWeight={700} fill="var(--text)">{centro}</text>
      <text x={100} y={118} textAnchor="middle" fontSize={11} fill="var(--text-subtle)">{sub}</text>
    </svg>
  );
}
