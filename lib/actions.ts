'use server';
import { randomUUID } from 'node:crypto';
import { auth } from '@/auth';
import { gerarParcelas } from '@/lib/cartao';
import { sql } from '@/lib/db';
import { monthName } from '@/lib/months';
import { iniciarMesParaUsuario } from '@/lib/newMonth';
import { Budget, Card, MonthRow, Transaction, TxType } from '@/lib/types';

// Toda a segurança de acesso a dados vive aqui: cada action resolve o usuário
// da sessão e escopa as queries por user_id (não há RLS como no Supabase).
async function userId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error('Não autenticado');
  return id;
}

/* ── leitura ── */

export async function getMonthRow(month: string): Promise<MonthRow | null> {
  const uid = await userId();
  const rows = await sql`select id, month, meta::float as meta, nota from months
    where user_id = ${uid} and month = ${month}`;
  return (rows[0] as MonthRow | undefined) ?? null;
}

export async function listMonths(): Promise<MonthRow[]> {
  const uid = await userId();
  return await sql`select id, month, meta::float as meta, nota from months
    where user_id = ${uid} order by month` as MonthRow[];
}

export async function listTransactions(month: string): Promise<Transaction[]> {
  const uid = await userId();
  return await sql`select id, month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago,
    cartao, parcela, parcelas, grupo
    from transactions where user_id = ${uid} and month = ${month} order by created_at` as Transaction[];
}

export async function listAllTransactions(): Promise<Transaction[]> {
  const uid = await userId();
  return await sql`select id, month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago,
    cartao, parcela, parcelas, grupo
    from transactions where user_id = ${uid}` as Transaction[];
}

export async function getCard(): Promise<Card | null> {
  const uid = await userId();
  const rows = await sql`select id, nome, dia_fechamento, dia_vencimento, limite::float as limite
    from cards where user_id = ${uid} limit 1`;
  return (rows[0] as Card | undefined) ?? null;
}

export async function listBudgets(month: string): Promise<Budget[]> {
  const uid = await userId();
  return await sql`select id, month, categoria, limite::float as limite from budgets
    where user_id = ${uid} and month = ${month}` as Budget[];
}

/* ── meses ── */

export async function iniciarMes(month: string): Promise<{ copiados: number }> {
  const uid = await userId();
  const { copiados } = await iniciarMesParaUsuario(uid, month);
  return { copiados };
}

export async function setNota(month: string, nota: string): Promise<void> {
  const uid = await userId();
  const texto = nota.trim().slice(0, 2000) || null;
  await sql`update months set nota = ${texto} where user_id = ${uid} and month = ${month}`;
}

export async function setMeta(month: string, meta: number): Promise<void> {
  const uid = await userId();
  await sql`update months set meta = ${meta} where user_id = ${uid} and month = ${month}`;
}

/* ── lançamentos ── */

export interface TxInput {
  month: string;
  type: TxType;
  descricao: string;
  valor: number;
  categoria: string | null;
  dia_vencimento: number | null;
  cartao: boolean;
}

export async function insertTransaction(t: TxInput): Promise<void> {
  const uid = await userId();
  await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento, cartao)
    values (${uid}, ${t.month}, ${t.type}, ${t.descricao}, ${t.valor}, ${t.categoria}, ${t.dia_vencimento},
      ${t.type !== 'entrada' && t.cartao})`;
}

export async function updateTransaction(id: string, t: TxInput): Promise<void> {
  const uid = await userId();
  await sql`update transactions set descricao = ${t.descricao}, valor = ${t.valor},
    categoria = ${t.categoria}, dia_vencimento = ${t.dia_vencimento}, cartao = ${t.type !== 'entrada' && t.cartao}
    where id = ${id} and user_id = ${uid}`;
}

export async function setTransactionPago(id: string, pago: boolean): Promise<void> {
  const uid = await userId();
  await sql`update transactions set pago = ${pago} where id = ${id} and user_id = ${uid}`;
}

export async function deleteTransaction(id: string): Promise<void> {
  const uid = await userId();
  await sql`delete from transactions where id = ${id} and user_id = ${uid}`;
}

/** Exclui todas as parcelas de uma compra parcelada. */
export async function deleteGrupo(grupo: string): Promise<void> {
  const uid = await userId();
  await sql`delete from transactions where grupo = ${grupo} and user_id = ${uid}`;
}

/* ── cartão ── */

export async function insertCard(c: { nome: string; dia_fechamento: number; dia_vencimento: number; limite: number | null }): Promise<void> {
  const uid = await userId();
  await sql`insert into cards (user_id, nome, dia_fechamento, dia_vencimento, limite)
    values (${uid}, ${c.nome}, ${c.dia_fechamento}, ${c.dia_vencimento}, ${c.limite})`;
}

export async function updateCard(c: { nome: string; dia_fechamento: number; dia_vencimento: number; limite: number | null }): Promise<void> {
  const uid = await userId();
  await sql`update cards set nome = ${c.nome}, dia_fechamento = ${c.dia_fechamento},
    dia_vencimento = ${c.dia_vencimento}, limite = ${c.limite} where user_id = ${uid}`;
}

/**
 * Lança uma compra no cartão. Parcelada vira uma linha por mês, ligadas pelo
 * mesmo `grupo`. Retorna uma frase dizendo em quais faturas entrou.
 */
export async function insertCompraCartao(c: {
  descricao: string; valorTotal: number; parcelas: number; categoria: string;
  type: 'fixo' | 'variavel'; dataCompra: string | null; mesBase: string;
}): Promise<string> {
  const uid = await userId();
  const cards = await sql`select dia_fechamento, dia_vencimento from cards where user_id = ${uid} limit 1`;
  const card = (cards[0] as Pick<Card, 'dia_fechamento' | 'dia_vencimento'> | undefined) ?? null;
  const n = c.type === 'fixo' ? 1 : c.parcelas;
  const parcelas = gerarParcelas({ valorTotal: c.valorTotal, parcelas: n, dataCompra: c.dataCompra, mesBase: c.mesBase, card });
  const grupo = n > 1 ? randomUUID() : null;
  for (const p of parcelas) {
    await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento, cartao, parcela, parcelas, grupo)
      values (${uid}, ${p.month}, ${c.type}, ${c.descricao}, ${p.valor}, ${c.categoria}, ${p.dia}, true,
        ${grupo ? p.parcela : null}, ${grupo ? n : null}, ${grupo})`;
  }
  const primeira = monthName(parcelas[0].month).toLowerCase();
  return n > 1
    ? `${n} parcelas lançadas, de ${primeira} a ${monthName(parcelas[n - 1].month).toLowerCase()}`
    : `Lançado na fatura de ${primeira}`;
}

/** Marca (ou desmarca) como pagos todos os itens do cartão do mês. */
export async function setFaturaPaga(month: string, pago: boolean): Promise<void> {
  const uid = await userId();
  await sql`update transactions set pago = ${pago} where user_id = ${uid} and month = ${month} and cartao`;
}

/* ── orçamento ── */

export async function setBudget(month: string, categoria: string, limite: number | null): Promise<void> {
  const uid = await userId();
  if (limite == null || isNaN(limite) || limite <= 0) {
    await sql`delete from budgets where user_id = ${uid} and month = ${month} and categoria = ${categoria}`;
  } else {
    await sql`insert into budgets (user_id, month, categoria, limite)
      values (${uid}, ${month}, ${categoria}, ${limite})
      on conflict (user_id, month, categoria) do update set limite = ${limite}`;
  }
}

/* ── backup / importação ── */

export async function exportAll(): Promise<Record<string, unknown>> {
  const uid = await userId();
  const [months, transactions, cards, budgets] = await Promise.all([
    sql`select month, meta::float as meta, nota from months where user_id = ${uid} order by month`,
    sql`select month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago, cartao, parcela, parcelas, grupo
      from transactions where user_id = ${uid}`,
    sql`select nome, dia_fechamento, dia_vencimento, limite::float as limite from cards where user_id = ${uid}`,
    sql`select month, categoria, limite::float as limite from budgets where user_id = ${uid}`,
  ]);
  return { versao: 3, months, transactions, cards, budgets };
}

interface LegacyItem { desc?: string; valor?: number; recebido?: boolean; pago?: boolean; cat?: string; dia?: number | null }
interface LegacyMonth { meta?: number; entradas?: LegacyItem[]; fixos?: LegacyItem[]; variaveis?: LegacyItem[] }

export async function importLegacy(data: { months?: Record<string, LegacyMonth> }): Promise<{ ok: boolean; nMeses: number; nTx: number; erro?: string }> {
  const uid = await userId();
  if (!data || typeof data !== 'object' || !data.months || typeof data.months !== 'object') {
    return { ok: false, nMeses: 0, nTx: 0, erro: 'Arquivo inválido' };
  }
  try {
    const existentes = new Set(
      (await sql`select month from months where user_id = ${uid}`).map(r => r.month as string),
    );
    let nMeses = 0, nTx = 0;
    for (const [key, m] of Object.entries(data.months)) {
      if (!/^\d{4}-\d{2}$/.test(key) || existentes.has(key)) continue;
      await sql`insert into months (user_id, month, meta) values (${uid}, ${key}, ${m.meta || 0})`;
      const rows: { type: TxType; item: LegacyItem }[] = [
        ...(m.entradas ?? []).map(i => ({ type: 'entrada' as TxType, item: i })),
        ...(m.fixos ?? []).map(i => ({ type: 'fixo' as TxType, item: i })),
        ...(m.variaveis ?? []).map(i => ({ type: 'variavel' as TxType, item: i })),
      ];
      for (const { type, item } of rows) {
        if (!item.desc || !item.valor || item.valor <= 0) continue;
        const isEntrada = type === 'entrada';
        await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento, pago)
          values (${uid}, ${key}, ${type}, ${item.desc}, ${item.valor},
            ${isEntrada ? null : item.cat || 'Outros'}, ${isEntrada ? null : item.dia || null},
            ${isEntrada ? !!item.recebido : !!item.pago})`;
        nTx++;
      }
      nMeses++;
    }
    return { ok: true, nMeses, nTx };
  } catch {
    return { ok: false, nMeses: 0, nTx: 0, erro: 'Erro durante a importação — tente novamente' };
  }
}
