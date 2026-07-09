export function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte '1.234,56' / 'R$ 150,00' / '150' em número. NaN se inválido. */
export function parseValorBR(str: string): number {
  if (typeof str !== 'string') return NaN;
  const clean = str.trim().replace(/\s/g, '').replace(/R\$?/i, '')
    .replace(/\./g, '').replace(',', '.');
  if (!clean) return NaN;
  return parseFloat(clean);
}
