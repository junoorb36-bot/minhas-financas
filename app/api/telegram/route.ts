import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { dataBrasil, parseMensagem } from '@/lib/telegram';
import { fmtBRL } from '@/lib/money';
import { monthName } from '@/lib/months';

const AJUDA = [
  'Me envie um gasto assim:',
  'descrição valor [categoria]',
  '',
  'Exemplos:',
  '• mercado 45,90 alimentação',
  '• lanche 12,50 lanche',
  '• uber 23,50 transporte',
  '• cinema 40  (sem categoria → Outros)',
  '',
  'Entrada de dinheiro: comece com +',
  '• +2000 freela',
].join('\n');

async function reply(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const chatId: number | undefined = msg?.chat?.id;
  const text: string | undefined = msg?.text;
  if (!chatId || !text) return NextResponse.json({ ok: true });

  if (String(chatId) !== process.env.TELEGRAM_CHAT_ID) {
    await reply(chatId, `Não autorizado. (chat id: ${chatId})`);
    return NextResponse.json({ ok: true });
  }

  if (text === '/start' || text === '/ajuda' || text === '/help') {
    await reply(chatId, AJUDA);
    return NextResponse.json({ ok: true });
  }

  const p = parseMensagem(text);
  if (!p) {
    await reply(chatId, 'Não entendi 🤔\n\n' + AJUDA);
    return NextResponse.json({ ok: true });
  }

  try {
    const users = await sql`select id from users where login = ${process.env.TELEGRAM_USER_LOGIN}`;
    if (!users[0]) {
      await reply(chatId, 'Conta não encontrada no sistema.');
      return NextResponse.json({ ok: true });
    }
    const uid = users[0].id as string;
    // usa a data de envio da mensagem (fuso de São Paulo) como mês e dia do lançamento
    const { dia, month } = dataBrasil(msg.date ?? Date.now() / 1000);
    await sql`insert into months (user_id, month) values (${uid}, ${month})
      on conflict (user_id, month) do nothing`;

    if (p.tipo === 'entrada') {
      await sql`insert into transactions (user_id, month, type, descricao, valor, pago)
        values (${uid}, ${month}, 'entrada', ${p.descricao}, ${p.valor}, true)`;
      await reply(chatId, `✅ Entrada: ${p.descricao} — ${fmtBRL(p.valor)}\n📅 ${monthName(month)}`);
    } else {
      await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento, pago)
        values (${uid}, ${month}, 'variavel', ${p.descricao}, ${p.valor}, ${p.categoria}, ${dia}, true)`;
      await reply(chatId, `✅ Gasto: ${p.descricao} — ${fmtBRL(p.valor)} · ${p.categoria} · dia ${dia}\n📅 ${monthName(month)}`);
    }
  } catch {
    await reply(chatId, 'Erro ao salvar 😕 Tente novamente em instantes.');
  }
  return NextResponse.json({ ok: true });
}
