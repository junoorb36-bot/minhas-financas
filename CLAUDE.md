# Minhas Finanças — guia para agentes (Claude Code / Cowork)

Sistema de finanças pessoais auto-hospedado: Next.js 15 + TypeScript, Postgres
(Neon), NextAuth (login único sem senha), deploy na Vercel, bot do Telegram
opcional. Detalhes de uso no [README.md](README.md).

## Se o usuário pedir para "instalar" o sistema

Você consegue executar quase tudo; o usuário só precisa agir onde há conta
pessoal dele. Roteiro que funciona:

1. **Banco (Neon)** — peça ao usuário para criar um projeto grátis em
   https://neon.tech e colar aqui a connection string (`postgresql://...`).
   Aplique o schema você mesmo:
   `DATABASE_URL="<string>" node scripts/apply-schema.mjs`
   (idempotente não é — se as tabelas já existem, o script falha; nesse caso o
   banco já está pronto).
2. **`.env.local`** — crie a partir do `.env.example` com a `DATABASE_URL` e um
   `AUTH_SECRET` gerado por
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
3. **Vercel** — `npx vercel login` imprime uma URL de autorização
   (device flow); peça ao usuário para abrir e aprovar. Depois:
   `npx vercel link --yes --project minhas-financas`, adicione
   `DATABASE_URL` e `AUTH_SECRET` como env vars de produção e rode
   `npx vercel deploy --prod --yes`.
4. **Teste** — o fluxo de login pode ser validado por API:
   `GET /api/auth/csrf` → `POST /api/auth/callback/credentials`
   (`csrfToken` + `login=<teste>`) → `GET /api/auth/session`.
   Depois apague o usuário de teste:
   `delete from users where login = '<teste>'`.
5. **Telegram (opcional)** — siga a seção do README. Extras aprendidos na
   prática estão nas pegadinhas abaixo.
6. **Mês automático (opcional)** — gere e configure `CRON_SECRET` na Vercel;
   o agendamento já está em `vercel.json` e vale a partir do deploy seguinte.

## Pegadinhas conhecidas (aprendidas em instalações reais)

- **Windows/PowerShell corrompe env vars da Vercel**: `Write-Output $valor |
  npx vercel env add ...` anexa `\r` ao valor e quebra o build ("connection
  string is not a valid URL"). Use Git Bash com `printf '%s' "$valor" | npx
  vercel env add ...`.
- **`getUpdates` do Telegram pode retornar vazio** mesmo com mensagens
  enviadas. Para descobrir o chat id, não dependa dele: configure o webhook
  primeiro (sem `TELEGRAM_CHAT_ID`) e peça ao usuário para mandar "oi" — o
  bot responde "Não autorizado (chat id: X)". Configure o X e redeploy.
- **Env vars novas exigem redeploy** na Vercel para valerem.
- **Dev server**: se o Next.js dev servir página branca/erros de chunk após
  muitas alterações, apague `.next/` e reinicie.
- **Numeric do Postgres** chega como string via driver — os selects do código
  usam `::float`; mantenha o padrão em queries novas.

## Trabalhando no código

- Testes: `npm test` (Vitest — lógica pura em `lib/__tests__`). Typecheck:
  `npm run typecheck`. Sempre rode ambos antes de deploy.
- Lógica de negócio pura vive em `lib/` (fatura/parcelas em `lib/invoice.ts`,
  criação de mês em `lib/newMonth.ts`); acesso a dados em `lib/actions.ts`
  (server actions escopadas por `user_id` — não há RLS, a segurança é aqui).
- Webhook do Telegram: `app/api/telegram/route.ts`; cron: `app/api/cron/route.ts`.
- Idioma do produto e das mensagens: português brasileiro.
