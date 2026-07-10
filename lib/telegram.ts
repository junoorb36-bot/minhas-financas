import { CATEGORIAS } from './categories';

/** Converte um timestamp Unix (segundos) para dia e mês no fuso de São Paulo. */
export function dataBrasil(unixSeconds: number): { dia: number; month: string } {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(unixSeconds * 1000)); // ex.: '2026-07-09'
  const [y, m, d] = s.split('-');
  return { dia: Number(d), month: `${y}-${m}` };
}

export interface ParsedMsg {
  tipo: 'gasto' | 'entrada';
  descricao: string;
  valor: number;
  /** null = usuário não informou (o bot deve perguntar com botões) */
  categoria: string | null;
}

/** Aceita 45 | 45,90 | 1.234,56 | 45.90 | R$45,90. Retorna null se não for valor. */
function parseToken(tok: string): number | null {
  if (!/^r?\$?\d[\d.,]*$/i.test(tok)) return null;
  const clean = tok.replace(/^r?\$?/i, '');
  let v: number;
  if (clean.includes(',')) {
    v = parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  } else if (clean.includes('.')) {
    const partes = clean.split('.');
    // ponto como decimal ("45.90"); mais de um ponto ou 3 dígitos após = milhar ("1.234")
    v = partes.length === 2 && partes[1].length <= 2
      ? parseFloat(clean)
      : parseFloat(clean.replace(/\./g, ''));
  } else {
    v = parseInt(clean, 10);
  }
  return isNaN(v) || v <= 0 ? null : v;
}

function normaliza(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Casa "alimentacao"/"Alimentação"/"ALIMENTAÇÃO" com a categoria oficial. */
export function matchCategoria(s: string): string | null {
  const alvo = normaliza(s.trim());
  for (const c of CATEGORIAS) {
    if (normaliza(c) === alvo) return c;
  }
  return null;
}

/**
 * Formato: "descrição valor [categoria]" → gasto variável.
 * Prefixo "+" → entrada ("+2000 freela").
 * O valor é o último token numérico; o que vem depois é a categoria.
 */
export function parseMensagem(text: string): ParsedMsg | null {
  let t = text.trim();
  const tipo: ParsedMsg['tipo'] = t.startsWith('+') ? 'entrada' : 'gasto';
  if (tipo === 'entrada') t = t.slice(1).trim();
  const tokens = t.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  let idx = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (parseToken(tokens[i]) !== null) { idx = i; break; }
  }
  if (idx === -1) return null;

  const valor = parseToken(tokens[idx])!;
  let descricao: string;
  let resto = '';
  if (idx === 0) {
    // valor primeiro: "2000 freela" / "+2000 freela"
    descricao = tokens.slice(1).join(' ');
  } else {
    descricao = tokens.slice(0, idx).join(' ');
    resto = tokens.slice(idx + 1).join(' ');
  }
  if (!descricao) return null;
  const categoria = resto ? matchCategoria(resto) : null;
  return { tipo, descricao, valor, categoria };
}
