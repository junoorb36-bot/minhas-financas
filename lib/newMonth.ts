import { sql } from './db';

/**
 * Cria o mês para o usuário se ainda não existir, copiando custos fixos,
 * orçamento e meta do mês anterior mais recente. Idempotente.
 */
export async function iniciarMesParaUsuario(uid: string, month: string): Promise<{ criado: boolean; copiados: number }> {
  const existe = await sql`select 1 from months where user_id = ${uid} and month = ${month}`;
  if (existe[0]) return { criado: false, copiados: 0 };

  const prevRows = await sql`select month, meta from months
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
  return { criado: true, copiados };
}
