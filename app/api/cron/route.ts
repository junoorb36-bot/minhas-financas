import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { iniciarMesParaUsuario } from '@/lib/newMonth';
import { dataBrasil } from '@/lib/telegram';
import { monthName } from '@/lib/months';

// Chamado diariamente pelo Vercel Cron (vercel.json). Idempotente: só cria o
// mês (copiando fixos/orçamento/meta) se ele ainda não existir.
export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { month } = dataBrasil(Date.now() / 1000);
  const users = await sql`select id, login from users`;
  const criados: string[] = [];

  for (const u of users) {
    const r = await iniciarMesParaUsuario(u.id as string, month);
    if (!r.criado) continue;
    criados.push(u.login as string);
    if (u.login === process.env.TELEGRAM_USER_LOGIN && process.env.TELEGRAM_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: Number(process.env.TELEGRAM_CHAT_ID),
          text: `📅 ${monthName(month)} iniciado automaticamente!\n${r.copiados} custo(s) fixo(s), orçamento e meta copiados do mês anterior.`,
        }),
      });
    }
  }

  return NextResponse.json({ ok: true, month, criados });
}
