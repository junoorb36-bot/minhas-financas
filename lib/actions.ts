'use server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { sql } from '@/lib/db';
import { Budget, Card, CardPurchase, MonthRow, Transaction, TxType } from '@/lib/types';

// Toda a segurança de acesso a dados vive aqui: cada action resolve o usuário
// da sessão e escopa as queries por user_id (não há RLS como no Supabase).
async function userId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error('Não autenticado');
  return id;
}

/* ── conta ── */

export async function register(email: string, senha: string): Promise<{ ok: boolean; erro?: string }> {
  const e = email.trim().toLowerCase();
  if (!/.+@.+\..+/.test(e)) return { ok: false, erro: 'E-mail inválido' };
  if (senha.length < 6) return { ok: false, erro: 'A senha precisa de pelo menos 6 caracteres' };
  const hash = await bcrypt.hash(senha, 10);
  try {
    await sql`insert into users (email, password_hash) values (${e}, ${hash})`;
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('duplicate') || msg.includes('users_email_key')) {
      return { ok: false, erro: 'Este e-mail já tem uma conta' };
    }
    return { ok: false, erro: 'Erro ao criar a conta — tente novamente' };
  }
}

/* ── leitura ── */

export async function getMonthRow(month: string): Promise<MonthRow | null> {
  const uid = await userId();
  const rows = await sql`select id, month, meta::float as meta from months
    where user_id = ${uid} and month = ${month}`;
  return (rows[0] as MonthRow | undefined) ?? null;
}

export async function listMonths(): Promise<MonthRow[]> {
  const uid = await userId();
  return await sql`select id, month, meta::float as meta from months
    where user_id = ${uid} order by month` as MonthRow[];
}

export async function listTransactions(month: string): Promise<Transaction[]> {
  const uid = await userId();
  return await sql`select id, month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago
    from transactions where user_id = ${uid} and month = ${month} order by created_at` as Transaction[];
}

export async function listAllTransactions(): Promise<Transaction[]> {
  const uid = await userId();
  return await sql`select id, month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago
    from transactions where user_id = ${uid}` as Transaction[];
}

export async function getCard(): Promise<Card | null> {
  const uid = await userId();
  const rows = await sql`select id, nome, dia_fechamento, dia_vencimento, limite::float as limite
    from cards where user_id = ${uid} limit 1`;
  return (rows[0] as Card | undefined) ?? null;
}

export async function listPurchases(): Promise<CardPurchase[]> {
  const uid = await userId();
  return await sql`select id, card_id, descricao, valor_total::float as valor_total, parcelas,
    data_compra::text as data_compra, categoria
    from card_purchases where user_id = ${uid} order by data_compra desc, created_at desc` as CardPurchase[];
}

export async function listInvoicePayments(): Promise<{ month: string; pago: boolean }[]> {
  const uid = await userId();
  return await sql`select month, pago from card_invoice_payments where user_id = ${uid}` as { month: string; pago: boolean }[];
}

export async function listBudgets(month: string): Promise<Budget[]> {
  const uid = await userId();
  return await sql`select id, month, categoria, limite::float as limite from budgets
    where user_id = ${uid} and month = ${month}` as Budget[];
}

/* ── meses ── */

export async function iniciarMes(month: string): Promise<{ copiados: number }> {
  const uid = await userId();
  const prevRows = await sql`select month, meta::float as meta from months
    where user_id = ${uid} and month < ${month} order by month desc limit 1`;
  const prev = prevRows[0] as { month: string; meta: number } | undefined;
  await sql`insert into months (user_id, month, meta) values (${uid}, ${month}, ${prev?.meta ?? 0})
    on conflict (user_id, month) do nothing`;
  let copiados = 0;
  if (prev) {
    const fixos = await sql`select descricao, valor, categoria, dia_vencimento from transactions
      where user_id = ${uid} and month = ${prev.month} and type = 'fixo'`;
    for (const f of fixos) {
      await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento)
        values (${uid}, ${month}, 'fixo', ${f.descricao}, ${f.valor}, ${f.categoria}, ${f.dia_vencimento})`;
    }
    copiados = fixos.length;
    const buds = await sql`select categoria, limite from budgets
      where user_id = ${uid} and month = ${prev.month}`;
    for (const b of buds) {
      await sql`insert into budgets (user_id, month, categoria, limite)
        values (${uid}, ${month}, ${b.categoria}, ${b.limite})
        on conflict (user_id, month, categoria) do nothing`;
    }
  }
  return { copiados };
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
}

export async function insertTransaction(t: TxInput): Promise<void> {
  const uid = await userId();
  await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento)
    values (${uid}, ${t.month}, ${t.type}, ${t.descricao}, ${t.valor}, ${t.categoria}, ${t.dia_vencimento})`;
}

export async function updateTransaction(id: string, t: TxInput): Promise<void> {
  const uid = await userId();
  await sql`update transactions set descricao = ${t.descricao}, valor = ${t.valor},
    categoria = ${t.categoria}, dia_vencimento = ${t.dia_vencimento}
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

/* ── cartão ── */

export async function insertCard(c: { nome: string; dia_fechamento: number; dia_vencimento: number; limite: number | null }): Promise<void> {
  const uid = await userId();
  await sql`insert into cards (user_id, nome, dia_fechamento, dia_vencimento, limite)
    values (${uid}, ${c.nome}, ${c.dia_fechamento}, ${c.dia_vencimento}, ${c.limite})`;
}

export async function insertPurchase(p: { card_id: string; descricao: string; valor_total: number; parcelas: number; data_compra: string; categoria: string }): Promise<void> {
  const uid = await userId();
  await sql`insert into card_purchases (user_id, card_id, descricao, valor_total, parcelas, data_compra, categoria)
    values (${uid}, ${p.card_id}, ${p.descricao}, ${p.valor_total}, ${p.parcelas}, ${p.data_compra}, ${p.categoria})`;
}

export async function deletePurchase(id: string): Promise<void> {
  const uid = await userId();
  await sql`delete from card_purchases where id = ${id} and user_id = ${uid}`;
}

export async function setInvoicePaid(cardId: string, month: string, pago: boolean): Promise<void> {
  const uid = await userId();
  if (pago) {
    await sql`insert into card_invoice_payments (user_id, card_id, month, pago)
      values (${uid}, ${cardId}, ${month}, true)
      on conflict (user_id, card_id, month) do update set pago = true`;
  } else {
    await sql`delete from card_invoice_payments where user_id = ${uid} and card_id = ${cardId} and month = ${month}`;
  }
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
  const [months, transactions, cards, purchases, payments, budgets] = await Promise.all([
    sql`select month, meta::float as meta from months where user_id = ${uid} order by month`,
    sql`select month, type, descricao, valor::float as valor, categoria, dia_vencimento, pago from transactions where user_id = ${uid}`,
    sql`select nome, dia_fechamento, dia_vencimento, limite::float as limite from cards where user_id = ${uid}`,
    sql`select descricao, valor_total::float as valor_total, parcelas, data_compra::text as data_compra, categoria from card_purchases where user_id = ${uid}`,
    sql`select month, pago from card_invoice_payments where user_id = ${uid}`,
    sql`select month, categoria, limite::float as limite from budgets where user_id = ${uid}`,
  ]);
  return { versao: 2, months, transactions, cards, purchases, payments, budgets };
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
