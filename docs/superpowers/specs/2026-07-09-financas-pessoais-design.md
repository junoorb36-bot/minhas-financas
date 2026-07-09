# Sistema de Finanças Pessoais — Design

**Data:** 2026-07-09
**Status:** Aprovado

## Contexto

O usuário (Heberton) possui hoje um app de finanças pessoais em um único arquivo
`index.html` (JS puro, localStorage), com controle mensal de entradas, custos fixos,
custos variáveis, meta de economia, status pago/pendente, gráficos SVG e
backup/importação em JSON. O objetivo é evoluí-lo para um sistema completo,
acessível do PC e do celular com dados sincronizados.

## Escopo

**Mantém do app atual:** navegação por mês, entradas/custos fixos/variáveis com
status pago/pendente, meta de economia mensal, cópia de custos fixos ao iniciar
mês novo, gráficos de evolução e por categoria, identidade visual (verde, cards,
sidebar).

**Adiciona:**

1. **Cartão de crédito** — 1 cartão, com dia de fechamento e dia de vencimento.
   Compras à vista ou parceladas. Parcelas projetadas automaticamente nos meses
   seguintes. A fatura do mês entra no fechamento como **uma saída única**, com
   detalhamento acessível.
2. **Orçamento por categoria** — limite mensal de gasto por categoria, com barras
   de progresso do consumido (lançamentos + parcelas do cartão da categoria).
   Limites copiados automaticamente do mês anterior.
3. **Sincronização multi-dispositivo** — login por e-mail/senha; mesmos dados no
   PC e no celular.
4. **Migração** — importação do backup JSON do app antigo.

**Fora de escopo (por decisão):** investimentos, contas bancárias/patrimônio,
múltiplos cartões, múltiplos usuários/compartilhamento.

## Arquitetura

> **Revisão 2026-07-09:** o backend mudou de Supabase para **Neon + NextAuth**
> (o usuário atingiu o limite de projetos gratuitos do Supabase).

- **Frontend:** Next.js 15 (App Router) + TypeScript + React. CSS global
  portando o visual atual (sem biblioteca de UI). PWA (manifest + ícones) para
  instalação no celular.
- **Banco:** Neon (Postgres serverless, plano gratuito), acessado via
  `@neondatabase/serverless` dentro de **Server Actions** do Next.js.
- **Autenticação:** NextAuth (Auth.js v5) com provider Credentials
  (e-mail/senha, hash bcrypt em tabela `users` própria).
- **Segurança de dados:** sem RLS; toda action resolve o usuário da sessão e
  escopa as queries por `user_id`.
- **Hospedagem:** Vercel (plano gratuito).
- **Estado/cache:** TanStack Query (React Query) para fetch, cache e estados de
  carregamento/erro.

## Modelo de dados (Postgres/Supabase)

Todas as tabelas têm `user_id` (FK para `auth.users`) e Row Level Security
restringindo cada linha ao dono.

| Tabela | Colunas principais |
|---|---|
| `months` | `month` (text `YYYY-MM`), `meta` (numeric) — único por (user, month) |
| `transactions` | `month`, `type` (`entrada` \| `fixo` \| `variavel`), `descricao`, `valor`, `categoria` (null p/ entradas), `dia_vencimento` (null p/ entradas), `pago` (bool; para entradas = recebido) |
| `cards` | `nome`, `dia_fechamento` (1–28), `dia_vencimento` (1–28), `limite` (numeric, opcional) |
| `card_purchases` | `card_id`, `descricao`, `valor_total`, `parcelas` (int ≥ 1), `data_compra` (date), `categoria` |
| `card_invoice_payments` | `card_id`, `month`, `pago` (bool) — status de pagamento da fatura |
| `budgets` | `month`, `categoria`, `limite` (numeric) — único por (user, month, categoria) |

**Faturas e parcelas são derivadas, não armazenadas:** a fatura do mês M de um
cartão é a soma das parcelas que caem em M, calculadas a partir de
(`data_compra`, `dia_fechamento`, `parcelas`, `valor_total`).

### Regra de fechamento

- Cada fatura é **identificada pelo mês do seu vencimento** (ex.: a fatura
  `2026-08` vence no dia de vencimento de agosto/2026 e agrupa as compras do
  ciclo encerrado no fechamento imediatamente anterior a esse vencimento).
- Compra com `data_compra` **até** o dia de fechamento → 1ª parcela na primeira
  fatura ainda aberta (a do próximo vencimento).
- Compra **após** o fechamento → 1ª parcela na fatura do ciclo seguinte.
- Parcelas seguintes caem nos meses subsequentes, uma por mês.
- Valor da parcela = `valor_total / parcelas`, com ajuste de centavos na última
  parcela para o total fechar exato.

## Telas

1. **Login / Cadastro** — Supabase Auth por e-mail/senha.
2. **Visão geral** — cards de resumo (saldo, entradas, saídas, meta), gráfico de
   evolução mês a mês, gastos por categoria, contas pendentes ordenadas por
   vencimento (incluindo a fatura do cartão como item único), resumo do
   orçamento.
3. **Lançamentos** — tabelas de entradas, custos fixos e variáveis com
   adicionar/editar/excluir/alternar status, como no app atual.
4. **Cartão** — configuração do cartão (nome, fechamento, vencimento, limite);
   formulário de compra (descrição, valor, nº parcelas, data, categoria); fatura
   do mês navegável com detalhamento das parcelas; limite utilizado; botão
   "marcar fatura como paga".
5. **Orçamento** — lista de categorias com limite editável e barra de progresso
   (gasto do mês na categoria ÷ limite), com alerta visual ao estourar.
6. **Configurações/Migração** — importar backup JSON do app antigo (cria months
   e transactions correspondentes); exportar backup JSON dos dados atuais.

## Comportamentos-chave

- **Saídas do mês** = custos fixos + custos variáveis + fatura do cartão do mês.
- **Saldo** = entradas − saídas. Meta de economia comparada ao saldo, como hoje.
- **Meses futuros** são navegáveis e mostram parcelas projetadas do cartão.
- **Iniciar mês novo** copia custos fixos e orçamento (limites) do mês anterior;
  meta também é copiada.
- **Gasto por categoria** (gráfico e orçamento) soma lançamentos fixos/variáveis
  e as parcelas do cartão do mês, por categoria.
- **Categorias:** lista fixa inicial igual à atual (Moradia, Alimentação,
  Transporte, Saúde, Educação, Lazer, Assinaturas, Dívidas, Outros).

## Tratamento de erros

- Sem conexão: React Query serve o último cache para leitura; ações de escrita
  mostram erro claro ("Sem conexão — tente novamente"). Sem fila offline na v1.
- Falhas do Supabase exibem toast de erro; nenhuma escrita otimista sem rollback.
- Validações de formulário iguais às atuais (descrição obrigatória, valor > 0,
  formato brasileiro `1.234,56`).

## Testes

- **Vitest** para a lógica pura: cálculo de fatura/parcelas (incluindo regra de
  fechamento e ajuste de centavos), totais do mês, progresso de orçamento,
  parse de valores em formato brasileiro.
- Smoke test manual guiado (checklist) para fluxos de UI: login, CRUD de
  lançamentos, compra parcelada aparecendo em meses futuros, pagamento de
  fatura, importação do backup antigo.

## Decisões registradas

| Decisão | Escolha |
|---|---|
| Plataforma | PC + celular, sincronizado |
| Sincronização | Serviço grátis com login (Vercel + Neon; era Supabase, trocado por limite de projetos) |
| Stack | Next.js/React + TypeScript (Opção B) + NextAuth |
| Cartão no fechamento | Fatura como saída única |
| Cartões | 1 cartão, com data de fechamento |
| Novas capacidades | Cartão de crédito + orçamento por categoria |
