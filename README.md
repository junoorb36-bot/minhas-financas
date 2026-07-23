# 💰 Minhas Finanças

Sistema **gratuito e auto-hospedado** de finanças pessoais. Cada pessoa roda a
própria cópia, com banco de dados próprio — seus dados são só seus.

## Funcionalidades

- **Visão geral do mês**: saldo, entradas, saídas, meta de economia, gráfico de
  evolução, gastos por categoria e comparativo fixos × variáveis
- **Lançamentos**: entradas, custos fixos e variáveis com status pago/pendente
  e dia de vencimento
- **Cartão de crédito**: compras à vista ou parceladas, fatura de cada mês
  calculada automaticamente (com dia de fechamento e vencimento), limite
  utilizado e pagamento de fatura
- **Orçamento por categoria**: defina limites mensais e acompanhe barras de
  progresso, com alerta de estouro
- **Mês automático**: todo dia 1º o mês novo é criado sozinho, copiando custos
  fixos, orçamento e meta do mês anterior
- **Bot do Telegram (opcional)**: mande `mercado 45,90` para o seu bot e o
  gasto é registrado na hora — se você não informar a categoria, ele pergunta
  com botões
- **PWA**: instale na tela inicial do celular como um app
- **Modo escuro**: claro, escuro ou automático
- Vários usuários por instalação (cada login tem seus próprios dados)

**Stack:** Next.js 15 + TypeScript · Postgres ([Neon](https://neon.tech), grátis)
· NextAuth · hospedagem na [Vercel](https://vercel.com) (grátis)

---

## 🚀 Instalação (~10 minutos, tudo grátis)

> 🧑‍🏫 **Nunca programou?** Siga o **[guia para iniciantes](INSTALACAO.md)** —
> o Claude Code instala tudo para você, sem usar terminal.

### 1. Crie o banco de dados (Neon)

1. Crie uma conta em [neon.tech](https://neon.tech) e um projeto novo
2. Abra o **SQL Editor**, cole todo o conteúdo de [`db/schema.sql`](db/schema.sql)
   e execute
3. Clique em **Connect** e copie a *connection string*
   (`postgresql://...`) — você vai usá-la já já

### 2. Faça o deploy (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjunoorb36-bot%2Fminhas-financas&env=DATABASE_URL,AUTH_SECRET&envDescription=DATABASE_URL%20%3D%20connection%20string%20do%20Neon%20%C2%B7%20AUTH_SECRET%20%3D%20valor%20aleat%C3%B3rio%20longo&project-name=minhas-financas&repository-name=minhas-financas)

O botão acima clona este repositório para o **seu** GitHub e faz o deploy na
**sua** conta Vercel. Durante o processo, preencha:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a connection string do Neon (passo 1) |
| `AUTH_SECRET` | um segredo aleatório — gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` ou digite 40+ caracteres aleatórios |

### 3. Pronto!

Abra a URL que a Vercel gerou, **digite um login** (ex.: `maria.2026x`) e comece
a usar. No celular, use "Adicionar à tela de início" para instalar como app.

> ⚠️ **Sobre o login sem senha:** por simplicidade, o acesso é feito só com um
> identificador — quem souber o seu login e a sua URL acessa os seus dados.
> Escolha um login que funcione como senha (algo difícil de adivinhar) e não
> compartilhe a URL. No primeiro acesso com um login novo, a conta é criada
> automaticamente.

---

## 🤖 Bot do Telegram (opcional)

Registre gastos sem abrir o app: mande uma mensagem e pronto.

| Você manda | O que acontece |
|---|---|
| `mercado 45,90 alimentação` | registra direto na categoria |
| `comida 45,90` | o bot pergunta a categoria com botões |
| `+2000 freela` | registra uma entrada |

O gasto entra no mês atual, marcado como pago, com o dia da mensagem como
vencimento.

**Configuração:**

1. No Telegram, fale com o [@BotFather](https://t.me/BotFather) → `/newbot` →
   guarde o **token**
2. Na Vercel (*Settings → Environment Variables*), adicione:
   - `TELEGRAM_BOT_TOKEN` — o token do BotFather
   - `TELEGRAM_WEBHOOK_SECRET` — um valor aleatório qualquer (gere como o
     `AUTH_SECRET`)
   - `TELEGRAM_USER_LOGIN` — o login (do app) que recebe os lançamentos
   - `CRON_SECRET` — outro valor aleatório (usado pelo mês automático)
3. Faça um *Redeploy* na Vercel
4. Registre o webhook (troque os `<...>`):

   ```bash
   curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d "url=https://<SEU-APP>.vercel.app/api/telegram" \
     -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```

5. Mande um `oi` para o seu bot — ele responde *"Não autorizado (chat id:
   123456)"*. Adicione esse número como `TELEGRAM_CHAT_ID` na Vercel e faça um
   último *Redeploy*. A partir daí, só o seu chat consegue lançar gastos.

---

## 📆 Mês automático

Com a variável `CRON_SECRET` configurada, a Vercel executa uma verificação
diária (definida em [`vercel.json`](vercel.json)): no dia em que o mês vira, o
mês novo é criado copiando custos fixos, orçamento e meta — e, se o Telegram
estiver configurado, o bot avisa.

---

## 💻 Desenvolvimento local

```bash
git clone https://github.com/junoorb36-bot/minhas-financas.git
cd minhas-financas
npm install
cp .env.example .env.local   # preencha DATABASE_URL e AUTH_SECRET
npm run dev                  # http://localhost:3000
npm test                     # testes (Vitest)
```

## 📄 Licença

[MIT](LICENSE) — use, modifique e distribua à vontade.
