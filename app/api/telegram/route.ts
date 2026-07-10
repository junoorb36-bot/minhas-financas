import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CATEGORIAS } from '@/lib/categories';
import { dataBrasil, parseMensagem } from '@/lib/telegram';
import { fmtBRL } from '@/lib/money';
import { monthName } from '@/lib/months';

const AJUDA = [
  'Me envie um gasto assim:',
  'descrição valor [categoria]',
  '',
  'Exemplos:',
  '• mercado 45,90 alimentação  → registra direto',
  '• comida 45,90  → eu pergunto a categoria com botões',
  '',
  'Entrada de dinheiro: comece com +',
  '• +2000 freela',
].join('\n');

async function tg(method: string, payload: Record<string, unknown>) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

const reply = (chat_id: number, text: string) => tg('sendMessage', { chat_id, text });

async function userIdDoDono(): Promise<string | null> {
  const users = await sql`select id from users where login = ${process.env.TELEGRAM_USER_LOGIN}`;
  return (users[0]?.id as string) ?? null;
}

async function inserirGasto(uid: string, month: string, descricao: string, valor: number, categoria: string, dia: number) {
  await sql`insert into months (user_id, month) values (${uid}, ${month})
    on conflict (user_id, month) do nothing`;
  await sql`insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento, pago)
    values (${uid}, ${month}, 'variavel', ${descricao}, ${valor}, ${categoria}, ${dia}, true)`;
}

function confirmacao(descricao: string, valor: number, categoria: string, dia: number, month: string) {
  return `✅ Gasto: ${descricao} — ${fmtBRL(valor)} · ${categoria} · dia ${dia}\n📅 ${monthName(month)}`;
}

/** Usuário tocou em um botão de categoria. */
async function handleCallback(cq: {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}) {
  const chatId = cq.message?.chat?.id;
  if (!chatId || String(chatId) !== process.env.TELEGRAM_CHAT_ID) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id });
    return;
  }
  const [pendingId, categoria] = String(cq.data ?? '').split('|');
  if (!pendingId || !(CATEGORIAS as readonly string[]).includes(categoria)) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Opção inválida.' });
    return;
  }
  const rows = await sql`delete from telegram_pending where id = ${pendingId} returning descricao, valor, dia, month`;
  if (!rows[0]) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Esse lançamento já foi registrado.' });
    return;
  }
  const pend = rows[0] as { descricao: string; valor: number; dia: number; month: string };
  const uid = await userIdDoDono();
  if (!uid) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Conta não encontrada.' });
    return;
  }
  const valor = Number(pend.valor);
  await inserirGasto(uid, pend.month, pend.descricao, valor, categoria, pend.dia);
  await tg('answerCallbackQuery', { callback_query_id: cq.id });
  await tg('editMessageText', {
    chat_id: chatId,
    message_id: cq.message!.message_id,
    text: confirmacao(pend.descricao, valor, categoria, pend.dia, pend.month),
  });
}

export async function POST(req: NextRequest) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);

  try {
    if (update?.callback_query) {
      await handleCallback(update.callback_query);
      return NextResponse.json({ ok: true });
    }

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

    const uid = await userIdDoDono();
    if (!uid) {
      await reply(chatId, 'Conta não encontrada no sistema.');
      return NextResponse.json({ ok: true });
    }

    const { dia, month } = dataBrasil(msg.date ?? Date.now() / 1000);

    if (p.tipo === 'entrada') {
      await sql`insert into months (user_id, month) values (${uid}, ${month})
        on conflict (user_id, month) do nothing`;
      await sql`insert into transactions (user_id, month, type, descricao, valor, pago)
        values (${uid}, ${month}, 'entrada', ${p.descricao}, ${p.valor}, true)`;
      await reply(chatId, `✅ Entrada: ${p.descricao} — ${fmtBRL(p.valor)}\n📅 ${monthName(month)}`);
    } else if (p.categoria) {
      await inserirGasto(uid, month, p.descricao, p.valor, p.categoria, dia);
      await reply(chatId, confirmacao(p.descricao, p.valor, p.categoria, dia, month));
    } else {
      // sem categoria: guarda como pendente e pergunta com botões
      await sql`delete from telegram_pending where created_at < now() - interval '2 days'`;
      const ins = await sql`insert into telegram_pending (chat_id, tipo, descricao, valor, dia, month)
        values (${chatId}, 'gasto', ${p.descricao}, ${p.valor}, ${dia}, ${month}) returning id`;
      const pendingId = ins[0].id as string;
      const teclado = [];
      for (let i = 0; i < CATEGORIAS.length; i += 2) {
        teclado.push(CATEGORIAS.slice(i, i + 2).map(c => ({ text: c, callback_data: `${pendingId}|${c}` })));
      }
      await tg('sendMessage', {
        chat_id: chatId,
        text: `${p.descricao} — ${fmtBRL(p.valor)}\nQual categoria?`,
        reply_markup: { inline_keyboard: teclado },
      });
    }
  } catch {
    const chatId = update?.message?.chat?.id ?? update?.callback_query?.message?.chat?.id;
    if (chatId) await reply(chatId, 'Erro ao salvar 😕 Tente novamente em instantes.');
  }
  return NextResponse.json({ ok: true });
}
