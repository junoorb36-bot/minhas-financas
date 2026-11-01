export interface VariacaoCategoria {
  categoria: string;
  atual: number;
  anterior: number;
  diferenca: number; // atual − anterior (negativo = gastou menos = melhorou)
  pct: number | null; // variação % sobre o anterior; null quando não havia gasto antes
  status: 'melhorou' | 'piorou';
}

// mudanças pequenas não são mostradas, para o card não virar ruído
const MIN_REAIS = 20;
const MIN_PCT = 10;

/**
 * Compara o gasto por categoria com o mês anterior. Retorna só as mudanças
 * relevantes: primeiro as melhoras (maior economia primeiro), depois as pioras.
 */
export function compararCategorias(atual: Record<string, number>, anterior: Record<string, number>): VariacaoCategoria[] {
  const cats = new Set([...Object.keys(atual), ...Object.keys(anterior)]);
  const out: VariacaoCategoria[] = [];
  for (const categoria of cats) {
    const a = atual[categoria] ?? 0;
    const b = anterior[categoria] ?? 0;
    const diferenca = Math.round((a - b) * 100) / 100;
    const pct = b > 0 ? Math.round((diferenca / b) * 100) : null;
    if (Math.abs(diferenca) < MIN_REAIS) continue;
    if (pct !== null && Math.abs(pct) < MIN_PCT) continue;
    out.push({ categoria, atual: a, anterior: b, diferenca, pct, status: diferenca < 0 ? 'melhorou' : 'piorou' });
  }
  const melhoras = out.filter(v => v.status === 'melhorou').sort((x, y) => x.diferenca - y.diferenca);
  const pioras = out.filter(v => v.status === 'piorou').sort((x, y) => y.diferenca - x.diferenca);
  return [...melhoras, ...pioras];
}
