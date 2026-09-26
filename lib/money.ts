export function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Formato curto para espaços pequenos: 'R$ 590', 'R$ 32,2mil', 'R$ 1,5mi'. */
export function fmtCompacto(v: number): string {
  const abs = Math.abs(v);
  const sinal = v < 0 ? '-' : '';
  const umaCasa = (x: number) => x.toFixed(1).replace('.', ',');
  if (Math.round(abs) < 1000) return `${sinal}R$ ${Math.round(abs)}`;
  const mil = abs / 1000;
  if (Number(mil.toFixed(1)) < 1000) return `${sinal}R$ ${umaCasa(mil)}mil`;
  return `${sinal}R$ ${umaCasa(abs / 1_000_000)}mi`;
}

/** Converte '1.234,56' / 'R$ 150,00' / '150' em número. NaN se inválido. */
export function parseValorBR(str: string): number {
  if (typeof str !== 'string') return NaN;
  const clean = str.trim().replace(/\s/g, '').replace(/R\$?/i, '')
    .replace(/\./g, '').replace(',', '.');
  if (!clean) return NaN;
  return parseFloat(clean);
}
