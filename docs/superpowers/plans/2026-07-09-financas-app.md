# Sistema de Finanças Pessoais — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evoluir o app de finanças pessoais (hoje um `index.html` com localStorage) para um web app Next.js + Supabase, sincronizado entre PC e celular, com cartão de crédito (parcelas/fatura derivada), orçamento por categoria e importação do backup antigo.

**Architecture:** Frontend Next.js 15 (App Router, client components) falando direto com o Supabase (Postgres + Auth com RLS) via `@supabase/supabase-js`; sem servidor de aplicação próprio. Lógica pura (parcelas, faturas, totais) em módulos isolados em `lib/`, testados com Vitest. Faturas do cartão são **calculadas** a partir das compras, nunca armazenadas.

**Tech Stack:** Next.js 15, React 19, TypeScript, @supabase/supabase-js, @tanstack/react-query, Vitest. Hospedagem: Vercel. Banco/Auth: Supabase (plano grátis). PWA via `app/manifest.ts`.

**Spec:** `docs/superpowers/specs/2026-07-09-financas-pessoais-design.md`

---

## Estrutura de arquivos

```
D:\FINANCE\
  package.json, tsconfig.json, next.config.ts, vitest.config.ts, .env.local
  legacy/index.html              ← cópia do app antigo (referência p/ CSS e formato do backup)
  supabase/schema.sql            ← schema + RLS (rodar no SQL Editor do Supabase)
  app/
    layout.tsx                   ← html/body + Providers
    globals.css                  ← CSS portado do app antigo + adições
    manifest.ts                  ← PWA
    login/page.tsx               ← login/cadastro (fora do shell)
    (app)/
      layout.tsx                 ← shell autenticado: Sidebar + .main
      page.tsx                   ← Visão geral
      lancamentos/page.tsx
      cartao/page.tsx
      orcamento/page.tsx
      config/page.tsx            ← backup, importação do app antigo, sair
  components/
    Providers.tsx                ← QueryClient + contexto de mês + toast + gate de auth
    Sidebar.tsx
    MonthNav.tsx
    PageHead.tsx
    TxSection.tsx                ← tabela+formulário de uma seção de lançamentos
    EvolutionChart.tsx           ← gráfico SVG portado
  hooks/
    useFinance.ts                ← queries React Query (leitura); escritas ficam nas páginas
  lib/
    types.ts, categories.ts, money.ts, months.ts, invoice.ts, totals.ts, supabase.ts
    __tests__/                   ← money.test.ts, months.test.ts, invoice.test.ts, totals.test.ts
  public/icon.svg
```

Convenções: colunas do banco em `snake_case` e valores monetários em `numeric` (converter com `Number()` ao somar). Mês sempre como texto `YYYY-MM` (ordena lexicograficamente). Todo componente com hook/handler é `'use client'`.

---

### Task 1: Scaffold do projeto Next.js + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `legacy/index.html` (cópia de `<caminho do index.html original>`)

- [ ] **Step 1: Copiar o app antigo para o repositório**

```powershell
New-Item -ItemType Directory -Force D:\FINANCE\legacy
Copy-Item "<caminho do index.html original>" D:\FINANCE\legacy\index.html
```

- [ ] **Step 2: Criar `package.json`**

```json
{
  "name": "minhas-financas",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@tanstack/react-query": "^5.51.0",
    "next": "^15.3.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.5.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 3: Criar `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Criar `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { include: ['lib/__tests__/**/*.test.ts'] },
});
```

- [ ] **Step 6: Criar `app/globals.css`**

Copie **todo** o conteúdo do bloco `<style>…</style>` de `legacy/index.html` (linhas 8–295 do arquivo, sem as tags `<style>`) para `app/globals.css`, e **acrescente no final** o bloco abaixo (estilos das telas novas):

```css
/* ── Adições (Next.js) ── */
a.nav-item { text-decoration: none; }

/* login */
.auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 32px; width: 100%; max-width: 360px; box-shadow: var(--shadow);
}
.auth-card h1 { font-size: 20px; margin-bottom: 18px; letter-spacing: -0.02em; }
.auth-card input {
  width: 100%; margin-bottom: 10px; background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 10px 12px; font-size: 14px; font-family: inherit;
}
.auth-card input:focus { outline: none; border-color: var(--green); }
.auth-card button[type=submit] {
  width: 100%; background: var(--green); color: #fff; border: none; padding: 11px;
  border-radius: 999px; font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit;
}
.auth-card button[type=submit]:hover { background: var(--green-dark); }
.auth-error { color: var(--red); font-size: 13px; margin-bottom: 10px; }

/* orçamento */
.budget-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.budget-row:last-child { border-bottom: none; }
.budget-row .b-cat { width: 110px; font-size: 14px; color: var(--text); flex-shrink: 0; }
.budget-row .b-limit {
  width: 110px; background: var(--bg); border: 1px solid var(--border); color: var(--text);
  border-radius: var(--radius-sm); padding: 7px 10px; font-size: 14px; font-family: inherit; flex-shrink: 0;
}
.budget-row .b-limit:focus { outline: none; border-color: var(--green); }
.budget-row .b-bar { flex: 1; height: 9px; background: var(--bg); border-radius: 999px; overflow: hidden; }
.budget-row .b-bar div { height: 100%; background: var(--green); border-radius: 999px; transition: width 0.3s; }
.budget-row .b-bar div.over { background: var(--red); }
.budget-row .b-bar div.warn { background: var(--amber); }
.budget-row .b-spent { width: 170px; text-align: right; font-size: 13px; color: var(--text-muted); font-variant-numeric: tabular-nums; flex-shrink: 0; }

/* cartão */
.card-info { display: flex; gap: 24px; flex-wrap: wrap; font-size: 13px; color: var(--text-muted); margin-top: 8px; }
.card-info strong { color: var(--text); font-variant-numeric: tabular-nums; }

@media (max-width: 800px) {
  .budget-row { flex-wrap: wrap; }
  .budget-row .b-spent { width: 100%; text-align: left; }
}
```

- [ ] **Step 7: Criar `app/layout.tsx` (versão mínima; a Task 7 adiciona os Providers)**

```tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Minhas Finanças' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Criar `app/page.tsx` provisória**

```tsx
export default function Home() {
  return <p style={{ padding: 40 }}>Em construção…</p>;
}
```

- [ ] **Step 9: Instalar e verificar**

```powershell
npm install
npm run dev
```

Abra http://localhost:3000 — deve mostrar "Em construção…". Pare o servidor (Ctrl+C).

- [ ] **Step 10: Commit**

```powershell
git add -A
git commit -m "feat: scaffold Next.js + Vitest com CSS portado do app antigo"
```

---

### Task 2: Tipos, categorias e utilitários de dinheiro (TDD)

**Files:**
- Create: `lib/types.ts`, `lib/categories.ts`, `lib/money.ts`
- Test: `lib/__tests__/money.test.ts`

- [ ] **Step 1: Criar `lib/types.ts`**

```ts
export type TxType = 'entrada' | 'fixo' | 'variavel';

export interface Transaction {
  id: string;
  month: string; // 'YYYY-MM'
  type: TxType;
  descricao: string;
  valor: number;
  categoria: string | null; // null para entradas
  dia_vencimento: number | null; // null para entradas
  pago: boolean; // para entradas significa "recebido"
}

export interface MonthRow {
  id: string;
  month: string;
  meta: number;
}

export interface Card {
  id: string;
  nome: string;
  dia_fechamento: number; // 1–28
  dia_vencimento: number; // 1–28
  limite: number | null;
}

export interface CardPurchase {
  id: string;
  card_id: string;
  descricao: string;
  valor_total: number;
  parcelas: number; // >= 1
  data_compra: string; // 'YYYY-MM-DD'
  categoria: string;
}

export interface Budget {
  id: string;
  month: string;
  categoria: string;
  limite: number;
}

export interface InvoiceItem {
  purchaseId: string;
  descricao: string;
  categoria: string;
  parcela: number; // 1-based
  parcelas: number;
  valor: number;
}
```

- [ ] **Step 2: Criar `lib/categories.ts`**

```ts
export const CATEGORIAS = [
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação',
  'Lazer', 'Assinaturas', 'Dívidas', 'Outros',
] as const;
```

- [ ] **Step 3: Escrever o teste que falha — `lib/__tests__/money.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { fmtBRL, parseValorBR } from '@/lib/money';

describe('parseValorBR', () => {
  it('converte formato brasileiro com milhar', () => {
    expect(parseValorBR('1.234,56')).toBe(1234.56);
  });
  it('aceita prefixo R$', () => {
    expect(parseValorBR('R$ 150,00')).toBe(150);
  });
  it('aceita inteiro simples', () => {
    expect(parseValorBR('150')).toBe(150);
  });
  it('retorna NaN para vazio e texto', () => {
    expect(parseValorBR('')).toBeNaN();
    expect(parseValorBR('abc')).toBeNaN();
  });
});

describe('fmtBRL', () => {
  it('formata como moeda brasileira', () => {
    // toLocaleString usa espaço não separável (U+00A0) entre "R$" e o número
    expect(fmtBRL(1234.56).replace(/ /g, ' ')).toBe('R$ 1.234,56');
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run lib/__tests__/money.test.ts`
Expected: FAIL — "Cannot find module '@/lib/money'" (ou similar).

- [ ] **Step 5: Implementar `lib/money.ts`**

```ts
export function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte '1.234,56' / 'R$ 150,00' / '150' em número. NaN se inválido. */
export function parseValorBR(str: string): number {
  if (typeof str !== 'string') return NaN;
  const clean = str.trim().replace(/\s/g, '').replace(/R\$?/i, '')
    .replace(/\./g, '').replace(',', '.');
  if (!clean) return NaN;
  return parseFloat(clean);
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run lib/__tests__/money.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 7: Commit**

```powershell
git add lib
git commit -m "feat: tipos de domínio, categorias e utilitários de dinheiro"
```

---

### Task 3: Utilitários de mês (TDD)

**Files:**
- Create: `lib/months.ts`
- Test: `lib/__tests__/months.test.ts`

- [ ] **Step 1: Escrever o teste que falha — `lib/__tests__/months.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { monthName, shiftMonth, shortMonth, todayKey } from '@/lib/months';

describe('shiftMonth', () => {
  it('avança dentro do ano', () => expect(shiftMonth('2026-07', 1)).toBe('2026-08'));
  it('vira o ano para frente', () => expect(shiftMonth('2026-12', 1)).toBe('2027-01'));
  it('vira o ano para trás', () => expect(shiftMonth('2026-01', -1)).toBe('2025-12'));
  it('aceita deltas grandes', () => expect(shiftMonth('2026-07', 18)).toBe('2028-01'));
});

describe('todayKey', () => {
  it('formata a data como YYYY-MM', () => {
    expect(todayKey(new Date(2026, 6, 9))).toBe('2026-07');
  });
});

describe('nomes', () => {
  it('nome completo capitalizado', () => {
    expect(monthName('2026-07').toLowerCase()).toContain('julho');
    expect(monthName('2026-07')).toContain('2026');
  });
  it('nome curto sem ponto', () => {
    expect(shortMonth('2026-07').toLowerCase().startsWith('jul')).toBe(true);
    expect(shortMonth('2026-07')).not.toContain('.');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/__tests__/months.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `lib/months.ts`**

```ts
export function todayKey(d: Date = new Date()): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function shiftMonth(key: string, delta: number): string {
  let [y, m] = key.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return y + '-' + String(m).padStart(2, '0');
}

export function monthName(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortMonth(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/__tests__/months.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib
git commit -m "feat: utilitários de navegação de mês"
```

---

### Task 4: Lógica do cartão — parcelas e fatura (TDD)

Regra de negócio (do spec): a fatura é identificada pelo **mês do vencimento**. Compra até o dia de fechamento entra na primeira fatura ainda aberta; depois do fechamento, na do ciclo seguinte. Se `dia_vencimento <= dia_fechamento`, o vencimento acontece no mês **seguinte** ao fechamento. Parcelas = total dividido igualmente, com ajuste de centavos na **última**.

**Files:**
- Create: `lib/invoice.ts`
- Test: `lib/__tests__/invoice.test.ts`

- [ ] **Step 1: Escrever o teste que falha — `lib/__tests__/invoice.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { faturaDoMes, firstInvoiceMonth, limiteUtilizado, parcelaValor } from '@/lib/invoice';
import { Card, CardPurchase } from '@/lib/types';

const cardV = { id: 'c1', nome: 'Cartão', dia_fechamento: 20, dia_vencimento: 27, limite: null } as Card; // vence no mesmo mês do fechamento
const cardX = { id: 'c2', nome: 'Cartão', dia_fechamento: 28, dia_vencimento: 5, limite: null } as Card;  // vence no mês seguinte ao fechamento

function compra(p: Partial<CardPurchase>): CardPurchase {
  return { id: 'p1', card_id: 'c1', descricao: 'Compra', valor_total: 300, parcelas: 3, data_compra: '2026-07-01', categoria: 'Outros', ...p };
}

describe('firstInvoiceMonth', () => {
  it('compra antes do fechamento, vencimento no mesmo mês', () => {
    expect(firstInvoiceMonth('2026-07-10', 20, 27)).toBe('2026-07');
  });
  it('compra depois do fechamento, vencimento no mesmo mês', () => {
    expect(firstInvoiceMonth('2026-07-25', 20, 27)).toBe('2026-08');
  });
  it('compra antes do fechamento, vencimento no mês seguinte', () => {
    expect(firstInvoiceMonth('2026-07-10', 28, 5)).toBe('2026-08');
  });
  it('compra depois do fechamento, vencimento no mês seguinte', () => {
    expect(firstInvoiceMonth('2026-07-30', 28, 5)).toBe('2026-09');
  });
  it('compra exatamente no dia do fechamento entra na fatura aberta', () => {
    expect(firstInvoiceMonth('2026-07-20', 20, 27)).toBe('2026-07');
  });
});

describe('parcelaValor', () => {
  it('divide igualmente quando exato', () => {
    expect(parcelaValor(300, 3, 1)).toBe(100);
    expect(parcelaValor(300, 3, 3)).toBe(100);
  });
  it('ajusta centavos na última parcela', () => {
    expect(parcelaValor(100, 3, 1)).toBe(33.33);
    expect(parcelaValor(100, 3, 2)).toBe(33.33);
    expect(parcelaValor(100, 3, 3)).toBe(33.34);
  });
  it('a soma das parcelas fecha o total', () => {
    const soma = [1, 2, 3, 4, 5, 6, 7].reduce((s, i) => s + parcelaValor(199.99, 7, i), 0);
    expect(Math.round(soma * 100) / 100).toBe(199.99);
  });
});

describe('faturaDoMes', () => {
  it('projeta as parcelas nos meses corretos', () => {
    const compras = [compra({ data_compra: '2026-07-01', valor_total: 300, parcelas: 3 })];
    expect(faturaDoMes(compras, cardV, '2026-06').total).toBe(0);
    expect(faturaDoMes(compras, cardV, '2026-07').total).toBe(100);
    expect(faturaDoMes(compras, cardV, '2026-09').total).toBe(100);
    expect(faturaDoMes(compras, cardV, '2026-10').total).toBe(0);
  });
  it('soma compras diferentes na mesma fatura, com número da parcela', () => {
    const compras = [
      compra({ id: 'a', data_compra: '2026-07-01', valor_total: 300, parcelas: 3 }),
      compra({ id: 'b', data_compra: '2026-08-05', valor_total: 50, parcelas: 1 }),
    ];
    const f = faturaDoMes(compras, cardV, '2026-08');
    expect(f.total).toBe(150);
    expect(f.items).toHaveLength(2);
    const itemA = f.items.find(i => i.purchaseId === 'a')!;
    expect(itemA.parcela).toBe(2);
    expect(itemA.parcelas).toBe(3);
  });
});

describe('limiteUtilizado', () => {
  it('soma parcelas de faturas não pagas a partir do mês dado', () => {
    const compras = [compra({ data_compra: '2026-07-01', valor_total: 300, parcelas: 3 })]; // faturas 07, 08, 09
    expect(limiteUtilizado(compras, cardV, [], '2026-07')).toBe(300);
    expect(limiteUtilizado(compras, cardV, ['2026-07'], '2026-07')).toBe(200);
    expect(limiteUtilizado(compras, cardV, [], '2026-09')).toBe(100);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/__tests__/invoice.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `lib/invoice.ts`**

```ts
import { Card, CardPurchase, InvoiceItem } from './types';
import { shiftMonth } from './months';

/** Mês (YYYY-MM) da fatura que recebe a 1ª parcela de uma compra. */
export function firstInvoiceMonth(dataCompra: string, diaFechamento: number, diaVencimento: number): string {
  const [y, m, d] = dataCompra.split('-').map(Number);
  let key = y + '-' + String(m).padStart(2, '0');
  if (d > diaFechamento) key = shiftMonth(key, 1); // já fechou: vai para o ciclo seguinte
  if (diaVencimento <= diaFechamento) key = shiftMonth(key, 1); // vencimento cai no mês após o fechamento
  return key;
}

/** Valor da parcela `indice` (1-based); centavos restantes vão para a última. */
export function parcelaValor(valorTotal: number, parcelas: number, indice: number): number {
  const cents = Math.round(valorTotal * 100);
  const base = Math.floor(cents / parcelas);
  const resto = cents - base * parcelas;
  return (indice === parcelas ? base + resto : base) / 100;
}

/** Itens e total da fatura de um mês, derivados das compras. */
export function faturaDoMes(purchases: CardPurchase[], card: Card, month: string): { items: InvoiceItem[]; total: number } {
  const items: InvoiceItem[] = [];
  for (const p of purchases) {
    const first = firstInvoiceMonth(p.data_compra, card.dia_fechamento, card.dia_vencimento);
    for (let i = 1; i <= p.parcelas; i++) {
      if (shiftMonth(first, i - 1) === month) {
        items.push({
          purchaseId: p.id, descricao: p.descricao, categoria: p.categoria,
          parcela: i, parcelas: p.parcelas, valor: parcelaValor(Number(p.valor_total), p.parcelas, i),
        });
      }
    }
  }
  const total = items.reduce((s, i) => s + i.valor, 0);
  return { items, total: Math.round(total * 100) / 100 };
}

/** Soma das parcelas em faturas ainda não pagas, do mês `fromMonth` em diante. */
export function limiteUtilizado(purchases: CardPurchase[], card: Card, paidMonths: string[], fromMonth: string): number {
  let cents = 0;
  for (const p of purchases) {
    const first = firstInvoiceMonth(p.data_compra, card.dia_fechamento, card.dia_vencimento);
    for (let i = 1; i <= p.parcelas; i++) {
      const m = shiftMonth(first, i - 1);
      if (m >= fromMonth && !paidMonths.includes(m)) {
        cents += Math.round(parcelaValor(Number(p.valor_total), p.parcelas, i) * 100);
      }
    }
  }
  return cents / 100;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run lib/__tests__/invoice.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```powershell
git add lib
git commit -m "feat: cálculo de parcelas, faturas e limite do cartão"
```

---

### Task 5: Totais do mês e gastos por categoria (TDD)

**Files:**
- Create: `lib/totals.ts`
- Test: `lib/__tests__/totals.test.ts`

- [ ] **Step 1: Escrever o teste que falha — `lib/__tests__/totals.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { gastosPorCategoria, monthTotals } from '@/lib/totals';
import { InvoiceItem, Transaction } from '@/lib/types';

function tx(p: Partial<Transaction>): Transaction {
  return { id: 'x', month: '2026-07', type: 'fixo', descricao: 'T', valor: 100, categoria: 'Moradia', dia_vencimento: null, pago: false, ...p };
}

const txs: Transaction[] = [
  tx({ type: 'entrada', valor: 3000, categoria: null }),
  tx({ type: 'fixo', valor: 800, categoria: 'Moradia' }),
  tx({ type: 'variavel', valor: 200, categoria: 'Alimentação' }),
];

describe('monthTotals', () => {
  it('inclui a fatura do cartão nas saídas', () => {
    const t = monthTotals(txs, 500);
    expect(t.entradas).toBe(3000);
    expect(t.fixos).toBe(800);
    expect(t.variaveis).toBe(200);
    expect(t.fatura).toBe(500);
    expect(t.saidas).toBe(1500);
    expect(t.saldo).toBe(1500);
  });
  it('funciona sem fatura', () => {
    expect(monthTotals(txs, 0).saidas).toBe(1000);
  });
});

describe('gastosPorCategoria', () => {
  it('soma lançamentos e parcelas do cartão por categoria; entradas ficam de fora', () => {
    const items: InvoiceItem[] = [
      { purchaseId: 'p', descricao: 'Mercado', categoria: 'Alimentação', parcela: 1, parcelas: 1, valor: 150 },
    ];
    const g = gastosPorCategoria(txs, items);
    expect(g['Moradia']).toBe(800);
    expect(g['Alimentação']).toBe(350);
    expect(Object.keys(g)).toHaveLength(2);
  });
  it('usa "Outros" quando a categoria é nula', () => {
    const g = gastosPorCategoria([tx({ type: 'variavel', categoria: null, valor: 40 })], []);
    expect(g['Outros']).toBe(40);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run lib/__tests__/totals.test.ts`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar `lib/totals.ts`**

```ts
import { InvoiceItem, Transaction, TxType } from './types';

export interface MonthTotals {
  entradas: number; fixos: number; variaveis: number;
  fatura: number; saidas: number; saldo: number;
}

export function monthTotals(txs: Transaction[], faturaTotal: number): MonthTotals {
  const sum = (type: TxType) =>
    txs.filter(t => t.type === type).reduce((s, t) => s + Number(t.valor), 0);
  const entradas = sum('entrada');
  const fixos = sum('fixo');
  const variaveis = sum('variavel');
  const saidas = fixos + variaveis + faturaTotal;
  return { entradas, fixos, variaveis, fatura: faturaTotal, saidas, saldo: entradas - saidas };
}

/** Gastos (fixos + variáveis + parcelas do cartão) somados por categoria. */
export function gastosPorCategoria(txs: Transaction[], invoiceItems: InvoiceItem[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of txs) {
    if (t.type === 'entrada') continue;
    const c = t.categoria || 'Outros';
    map[c] = (map[c] || 0) + Number(t.valor);
  }
  for (const i of invoiceItems) {
    map[i.categoria] = (map[i.categoria] || 0) + i.valor;
  }
  return map;
}
```

- [ ] **Step 4: Rodar toda a suíte e ver passar**

Run: `npm test`
Expected: PASS — money, months, invoice, totals.

- [ ] **Step 5: Commit**

```powershell
git add lib
git commit -m "feat: totais do mês (com fatura) e gastos por categoria"
```

---

### Task 6: Supabase — projeto, schema e cliente

> ⚠️ **Requer ação do usuário:** criar a conta/projeto no Supabase e copiar as credenciais. Pause e peça ao usuário quando chegar no Step 3.

**Files:**
- Create: `supabase/schema.sql`, `lib/supabase.ts`, `.env.local`

- [ ] **Step 1: Criar `supabase/schema.sql`**

```sql
-- Minhas Finanças — schema completo. Rodar no SQL Editor do Supabase.

create table public.months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null,
  meta numeric not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null,
  type text not null check (type in ('entrada', 'fixo', 'variavel')),
  descricao text not null,
  valor numeric not null check (valor > 0),
  categoria text,
  dia_vencimento int check (dia_vencimento between 1 and 31),
  pago boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  dia_fechamento int not null check (dia_fechamento between 1 and 28),
  dia_vencimento int not null check (dia_vencimento between 1 and 28),
  limite numeric
);

create table public.card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  descricao text not null,
  valor_total numeric not null check (valor_total > 0),
  parcelas int not null default 1 check (parcelas >= 1),
  data_compra date not null,
  categoria text not null,
  created_at timestamptz not null default now()
);

create table public.card_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  month text not null,
  pago boolean not null default true,
  unique (user_id, card_id, month)
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  month text not null,
  categoria text not null,
  limite numeric not null check (limite >= 0),
  unique (user_id, month, categoria)
);

-- Row Level Security: cada usuário só enxerga as próprias linhas.
alter table public.months enable row level security;
alter table public.transactions enable row level security;
alter table public.cards enable row level security;
alter table public.card_purchases enable row level security;
alter table public.card_invoice_payments enable row level security;
alter table public.budgets enable row level security;

create policy "own months" on public.months for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transactions" on public.transactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own cards" on public.cards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own card_purchases" on public.card_purchases for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own card_invoice_payments" on public.card_invoice_payments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own budgets" on public.budgets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Criar `lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

- [ ] **Step 3: ⚠️ AÇÃO DO USUÁRIO — criar o projeto Supabase**

Peça ao usuário para:
1. Criar conta/entrar em https://supabase.com e criar um projeto novo (nome ex.: `minhas-financas`, região `South America (São Paulo)`).
2. No **SQL Editor**, colar e executar o conteúdo de `supabase/schema.sql` (deve terminar com "Success").
3. Em **Authentication → Sign In / Up → Email**, **desativar** "Confirm email" (facilita o primeiro acesso; é um app pessoal).
4. Em **Project Settings → API**, copiar a **Project URL** e a **anon public key** e informar aqui.

- [ ] **Step 4: Criar `.env.local` com as credenciais informadas**

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=CHAVE-ANON-AQUI
```

(O `.gitignore` já exclui `.env*.local` — conferir que o arquivo NÃO aparece em `git status`.)

- [ ] **Step 5: Verificar typecheck e commit**

```powershell
npm run typecheck
git add supabase lib/supabase.ts
git commit -m "feat: schema Supabase com RLS e cliente"
```

---

### Task 7: Providers (auth, mês, toast) e página de login

**Files:**
- Create: `components/Providers.tsx`, `app/login/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Criar `components/Providers.tsx`**

```tsx
'use client';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayKey } from '@/lib/months';

const MonthCtx = createContext<{ month: string; setMonth: (m: string) => void }>({ month: '', setMonth: () => {} });
export const useMonth = () => useContext(MonthCtx);

const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export default function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  const [month, setMonth] = useState(todayKey());
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authed === false && pathname !== '/login') router.replace('/login');
    if (authed === true && pathname === '/login') router.replace('/');
  }, [authed, pathname, router]);

  function showToast(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  }

  if (authed === null) return null; // evita piscar a tela errada enquanto checa a sessão

  return (
    <QueryClientProvider client={qc}>
      <ToastCtx.Provider value={showToast}>
        <MonthCtx.Provider value={{ month, setMonth }}>
          {children}
          <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
        </MonthCtx.Provider>
      </ToastCtx.Provider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Atualizar `app/layout.tsx` para usar os Providers**

```tsx
import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from '@/components/Providers';

export const metadata: Metadata = { title: 'Minhas Finanças' };
export const viewport: Viewport = { themeColor: '#217a54' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Criar `app/login/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar');
  const [enviando, setEnviando] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    const { error } = modo === 'entrar'
      ? await supabase.auth.signInWithPassword({ email, password: senha })
      : await supabase.auth.signUp({ email, password: senha });
    setEnviando(false);
    if (error) setErro(modo === 'entrar' ? 'E-mail ou senha incorretos' : error.message);
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Minhas Finanças</h1>
        {erro && <p className="auth-error">{erro}</p>}
        <input type="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha (mín. 6 caracteres)" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} />
        <button type="submit" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
        <p style={{ marginTop: 12, fontSize: 13, textAlign: 'center' }}>
          <button type="button" className="hint-link" onClick={() => setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')}>
            {modo === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}
          </button>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Verificar no navegador**

Run: `npm run dev` → abrir http://localhost:3000.
Expected: redireciona para `/login`; criar uma conta (e-mail/senha) → redireciona para `/` mostrando "Em construção…". Pare o servidor.

- [ ] **Step 5: Commit**

```powershell
git add -A
git commit -m "feat: autenticação com Supabase, providers e tela de login"
```

---

### Task 8: Shell autenticado (Sidebar, MonthNav, PageHead) e hooks de dados

**Files:**
- Create: `components/Sidebar.tsx`, `components/MonthNav.tsx`, `components/PageHead.tsx`, `hooks/useFinance.ts`, `app/(app)/layout.tsx`
- Move: `app/page.tsx` → `app/(app)/page.tsx` (mantém o placeholder por enquanto)

- [ ] **Step 1: Criar `components/Sidebar.tsx`**

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  ['/', 'Visão geral'],
  ['/lancamentos', 'Lançamentos'],
  ['/cartao', 'Cartão'],
  ['/orcamento', 'Orçamento'],
  ['/config', 'Ajustes'],
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="sidebar">
      <div className="brand">
        <span className="brand-logo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
        </span>
        <div>Minhas Finanças<small>controle pessoal</small></div>
      </div>
      {ITEMS.map(([href, label]) => (
        <Link key={href} href={href} className={`nav-item ${pathname === href ? 'active' : ''}`}>{label}</Link>
      ))}
      <div className="spacer" />
    </nav>
  );
}
```

- [ ] **Step 2: Criar `components/MonthNav.tsx`**

```tsx
'use client';
import { useMonth } from './Providers';
import { monthName, shiftMonth } from '@/lib/months';

export default function MonthNav() {
  const { month, setMonth } = useMonth();
  return (
    <div className="month-nav">
      <button className="arrow" onClick={() => setMonth(shiftMonth(month, -1))} title="Mês anterior">‹</button>
      <div className="month-label">{monthName(month)}</div>
      <button className="arrow" onClick={() => setMonth(shiftMonth(month, 1))} title="Próximo mês">›</button>
    </div>
  );
}
```

- [ ] **Step 3: Criar `components/PageHead.tsx`**

```tsx
import MonthNav from './MonthNav';

export default function PageHead({ title, sub, withMonthNav = true }: { title: string; sub: string; withMonthNav?: boolean }) {
  return (
    <div className="page-head">
      <div className="greeting">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {withMonthNav && <MonthNav />}
    </div>
  );
}
```

- [ ] **Step 4: Criar `hooks/useFinance.ts`**

```ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Budget, Card, CardPurchase, MonthRow, Transaction } from '@/lib/types';

/** Desembrulha respostas do supabase-js, lançando em caso de erro. */
export async function q<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const useMonthRow = (month: string) =>
  useQuery({ queryKey: ['month', month], queryFn: () => q<MonthRow | null>(supabase.from('months').select('*').eq('month', month).maybeSingle()) });

export const useAllMonths = () =>
  useQuery({ queryKey: ['months'], queryFn: () => q<MonthRow[]>(supabase.from('months').select('*').order('month')) });

export const useTransactions = (month: string) =>
  useQuery({ queryKey: ['tx', month], queryFn: () => q<Transaction[]>(supabase.from('transactions').select('*').eq('month', month).order('created_at')) });

export const useAllTransactions = () =>
  useQuery({ queryKey: ['tx-all'], queryFn: () => q<Transaction[]>(supabase.from('transactions').select('*')) });

export const useCard = () =>
  useQuery({ queryKey: ['card'], queryFn: () => q<Card | null>(supabase.from('cards').select('*').maybeSingle()) });

export const usePurchases = () =>
  useQuery({ queryKey: ['purchases'], queryFn: () => q<CardPurchase[]>(supabase.from('card_purchases').select('*').order('data_compra', { ascending: false })) });

export const usePaidInvoices = () =>
  useQuery({ queryKey: ['invoice-payments'], queryFn: () => q<{ month: string; pago: boolean }[]>(supabase.from('card_invoice_payments').select('month, pago')) });

export const useBudgets = (month: string) =>
  useQuery({ queryKey: ['budgets', month], queryFn: () => q<Budget[]>(supabase.from('budgets').select('*').eq('month', month)) });
```

Escritas (insert/update/delete) são feitas nas páginas com `supabase.from(...)` seguido de `queryClient.invalidateQueries()` (invalida tudo — app pessoal, dados pequenos, simplicidade primeiro).

- [ ] **Step 5: Criar `app/(app)/layout.tsx` e mover a página**

`app/(app)/layout.tsx`:

```tsx
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />
      <div className="main">{children}</div>
    </>
  );
}
```

Mover: excluir `app/page.tsx` e criar `app/(app)/page.tsx` com o mesmo placeholder:

```tsx
export default function Home() {
  return <p style={{ padding: 40 }}>Em construção…</p>;
}
```

- [ ] **Step 6: Verificar no navegador**

Run: `npm run dev` → logado, deve aparecer a sidebar verde à esquerda com os 5 itens e o conteúdo à direita. Pare o servidor.

- [ ] **Step 7: Commit**

```powershell
git add -A
git commit -m "feat: shell autenticado com sidebar e hooks de leitura"
```

---

### Task 9: Página Visão geral

**Files:**
- Create: `components/EvolutionChart.tsx`
- Modify: `app/(app)/page.tsx` (substituir o placeholder)

- [ ] **Step 1: Criar `components/EvolutionChart.tsx`** (porte do SVG do app antigo)

```tsx
import { shortMonth } from '@/lib/months';

export interface EvoPoint { key: string; entradas: number; saidas: number; saldo: number; }

export default function EvolutionChart({ data }: { data: EvoPoint[] }) {
  if (!data.length) return <div className="empty-row">Sem dados ainda.</div>;

  const W = 560, H = 210, padL = 8, padR = 8, padT = 14, padB = 26;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.entradas, d.saidas, Math.abs(d.saldo))));
  const slot = innerW / data.length;
  const barW = Math.min(24, slot * 0.28);
  const base = padT + innerH;

  const pts = data.map((d, i) => {
    const cx = padL + slot * i + slot / 2;
    const sy = base - (Math.max(0, d.saldo) / maxVal) * innerH;
    return { cx, sy: d.saldo >= 0 ? sy : base + Math.min(8, (Math.abs(d.saldo) / maxVal) * innerH * 0.1) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfico de evolução mensal">
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="var(--border)" />
      {data.map((d, i) => {
        const cx = pts[i].cx;
        const hE = (d.entradas / maxVal) * innerH;
        const hS = (d.saidas / maxVal) * innerH;
        return (
          <g key={d.key}>
            <rect x={cx - barW - 2} y={base - hE} width={barW} height={Math.max(hE, 1)} rx={5} fill="var(--green)" opacity={0.9} />
            <rect x={cx + 2} y={base - hS} width={barW} height={Math.max(hS, 1)} rx={5} fill="var(--ink)" opacity={0.85} />
            <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="#6d7772">{shortMonth(d.key)}</text>
          </g>
        );
      })}
      {pts.length > 1 && (
        <polyline points={pts.map(p => `${p.cx},${p.sy}`).join(' ')} fill="none" stroke="var(--red)" strokeWidth={2} strokeLinejoin="round" />
      )}
      {pts.map((p, i) => (
        <circle key={data[i].key} cx={p.cx} cy={p.sy} r={3.5} fill="var(--red)" stroke="#fff" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Substituir `app/(app)/page.tsx` pela Visão geral completa**

```tsx
'use client';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useMonth, useToast } from '@/components/Providers';
import PageHead from '@/components/PageHead';
import EvolutionChart from '@/components/EvolutionChart';
import {
  q, useAllMonths, useAllTransactions, useBudgets, useCard,
  useMonthRow, usePaidInvoices, usePurchases, useTransactions,
} from '@/hooks/useFinance';
import { faturaDoMes } from '@/lib/invoice';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { monthName } from '@/lib/months';
import { gastosPorCategoria, monthTotals } from '@/lib/totals';
import { supabase } from '@/lib/supabase';
import { Transaction } from '@/lib/types';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function Home() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const monthRow = useMonthRow(month);
  const txsQ = useTransactions(month);
  const allMonths = useAllMonths();
  const allTxs = useAllTransactions();
  const cardQ = useCard();
  const purchasesQ = usePurchases();
  const paidQ = usePaidInvoices();
  const budgetsQ = useBudgets(month);

  const loading = [monthRow, txsQ, allMonths, allTxs, cardQ, purchasesQ, paidQ, budgetsQ].some(x => x.isLoading);
  const failed = [monthRow, txsQ, allMonths, allTxs, cardQ, purchasesQ, paidQ, budgetsQ].find(x => x.isError);

  if (loading) return <p className="empty-row">Carregando…</p>;
  if (failed) return <p className="empty-row">Erro ao carregar dados — verifique sua conexão e recarregue.</p>;

  const card = cardQ.data ?? null;
  const purchases = purchasesQ.data ?? [];
  const paidMonths = (paidQ.data ?? []).filter(p => p.pago).map(p => p.month);
  const txs = txsQ.data ?? [];
  const fatura = card ? faturaDoMes(purchases, card, month) : { items: [], total: 0 };
  const t = monthTotals(txs, fatura.total);
  const meta = Number(monthRow.data?.meta ?? 0);

  async function iniciarMes() {
    const anteriores = (allMonths.data ?? []).filter(m => m.month < month);
    const prev = anteriores.length ? anteriores[anteriores.length - 1] : null;
    const ins = await supabase.from('months').insert({ month, meta: prev ? Number(prev.meta) : 0 });
    if (ins.error) return toast('Erro ao iniciar o mês');
    let copiados = 0;
    if (prev) {
      const fixos = await q<Transaction[]>(supabase.from('transactions').select('*').eq('month', prev.month).eq('type', 'fixo'));
      if (fixos.length) {
        await supabase.from('transactions').insert(fixos.map(f => ({
          month, type: 'fixo', descricao: f.descricao, valor: f.valor,
          categoria: f.categoria, dia_vencimento: f.dia_vencimento,
        })));
        copiados = fixos.length;
      }
      const buds = await q<{ categoria: string; limite: number }[]>(supabase.from('budgets').select('categoria, limite').eq('month', prev.month));
      if (buds.length) await supabase.from('budgets').insert(buds.map(b => ({ month, categoria: b.categoria, limite: b.limite })));
    }
    qc.invalidateQueries();
    if (copiados) toast(`${copiados} custos fixos copiados do mês anterior`);
  }

  if (!monthRow.data) {
    return (
      <>
        <PageHead title={`${greeting()}!`} sub="Acompanhe a evolução das suas finanças." />
        <div className="new-month">
          <p>O mês de <strong>{monthName(month)}</strong> ainda não foi iniciado.</p>
          <button onClick={iniciarMes}>Iniciar mês</button>
        </div>
      </>
    );
  }

  async function setMeta(value: string) {
    const v = parseValorBR(value);
    await supabase.from('months').update({ meta: isNaN(v) || v < 0 ? 0 : v }).eq('id', monthRow.data!.id);
    qc.invalidateQueries();
  }

  // pendentes: lançamentos não pagos + fatura não paga
  const faturaPaga = paidMonths.includes(month);
  const pend: { desc: string; tipo: string; dia: number | null; valor: number }[] = [
    ...txs.filter(x => x.type !== 'entrada' && !x.pago)
      .map(x => ({ desc: x.descricao, tipo: x.type === 'fixo' ? 'Fixo' : 'Variável', dia: x.dia_vencimento, valor: Number(x.valor) })),
    ...(card && fatura.total > 0 && !faturaPaga
      ? [{ desc: `Fatura ${card.nome}`, tipo: 'Cartão', dia: card.dia_vencimento, valor: fatura.total }] : []),
  ].sort((a, b) => (a.dia || 99) - (b.dia || 99));

  const gastos = gastosPorCategoria(txs, fatura.items);
  const cats = Object.entries(gastos).sort((a, b) => b[1] - a[1]);
  const maxCat = cats.length ? cats[0][1] : 1;

  const evoKeys = (allMonths.data ?? []).map(m => m.month).filter(k => k <= month).slice(-12);
  const evo = evoKeys.map(k => {
    const f = card ? faturaDoMes(purchases, card, k).total : 0;
    const tt = monthTotals((allTxs.data ?? []).filter(x => x.month === k), f);
    return { key: k, entradas: tt.entradas, saidas: tt.saidas, saldo: tt.saldo };
  });

  const metaPct = meta > 0 ? Math.max(0, Math.min(100, (t.saldo / meta) * 100)) : 0;
  const metaOk = meta > 0 && t.saldo >= meta;
  const totalOrcado = (budgetsQ.data ?? []).reduce((s, b) => s + Number(b.limite), 0);
  const totalGasto = Object.values(gastos).reduce((s, v) => s + v, 0);

  return (
    <>
      <PageHead title={`${greeting()}!`} sub="Acompanhe a evolução das suas finanças." />
      <div className="summary">
        <div className="card highlight">
          <div className="label">Saldo do mês</div>
          <div className="value">{fmtBRL(t.saldo)}</div>
          <div className="sub">entradas − saídas (com fatura)</div>
        </div>
        <div className="card">
          <div className="label">Entradas</div>
          <div className="value green">{fmtBRL(t.entradas)}</div>
          <div className="sub">{txs.filter(x => x.type === 'entrada').length} lançamento(s)</div>
        </div>
        <div className="card">
          <div className="label">Saídas</div>
          <div className="value red">{fmtBRL(t.saidas)}</div>
          <div className="sub">{fatura.total > 0 ? `inclui fatura de ${fmtBRL(fatura.total)}` : `${pend.length} conta(s) pendente(s)`}</div>
        </div>
        <div className="card meta-card">
          <div className="label">Meta de economia</div>
          <input
            type="text"
            defaultValue={meta ? meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
            placeholder="ex.: 500,00"
            onBlur={e => setMeta(e.target.value)}
            aria-label="Meta de economia do mês"
          />
          <div className="meta-bar"><div className={meta > 0 && !metaOk ? 'fail' : ''} style={{ width: `${meta > 0 ? metaPct : 0}%` }} /></div>
          <div className="sub">{meta > 0 ? (metaOk ? 'Meta atingida ✓' : `${fmtBRL(Math.max(0, meta - t.saldo))} faltando`) : 'defina uma meta mensal'}</div>
        </div>
      </div>

      <div className="charts">
        <div className="card chart-card">
          <h3>Evolução mês a mês</h3>
          <div className="card-sub">entradas, saídas e saldo dos últimos meses</div>
          <EvolutionChart data={evo} />
          <div className="legend">
            <span><i className="dot" style={{ background: 'var(--green)' }} />Entradas</span>
            <span><i className="dot" style={{ background: 'var(--ink)' }} />Saídas</span>
            <span><i className="dot" style={{ background: 'var(--red)' }} />Saldo</span>
          </div>
        </div>
        <div className="card chart-card">
          <h3>Gastos por categoria</h3>
          <div className="card-sub">lançamentos + parcelas do cartão</div>
          {cats.length === 0 && <div className="empty-row">Cadastre gastos para ver a divisão por categoria.</div>}
          {cats.map(([cat, val]) => (
            <div className="cat-row" key={cat}>
              <span className="cat-name">{cat}</span>
              <div className="cat-bar-wrap"><div className="cat-bar" style={{ width: `${(val / maxCat) * 100}%` }} /></div>
              <span className="cat-val">{fmtBRL(val)}</span>
            </div>
          ))}
          {totalOrcado > 0 && (
            <div className="cat-row" style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <span className="cat-name" style={{ color: 'var(--text)', fontWeight: 600 }}>Orçamento</span>
              <div style={{ flex: 1 }} />
              <span className="cat-val">{fmtBRL(totalGasto)} de {fmtBRL(totalOrcado)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card pending-card">
        <h3>Contas pendentes do mês</h3>
        <div className="card-sub">ordenadas pelo dia de vencimento</div>
        {pend.length === 0 ? (
          <div className="empty-row" style={{ padding: '8px 0' }}>Nenhuma conta pendente — tudo pago ✓</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ background: 'none', paddingLeft: 0 }}>Descrição</th>
                <th className="hide-mobile" style={{ background: 'none' }}>Tipo</th>
                <th className="center" style={{ background: 'none' }}>Vencimento</th>
                <th className="num" style={{ background: 'none', paddingRight: 0 }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {pend.map((p, i) => (
                <tr key={i}>
                  <td style={{ paddingLeft: 0 }}>{p.tipo === 'Cartão' ? <Link href="/cartao" className="hint-link" style={{ textDecoration: 'none' }}>{p.desc}</Link> : p.desc}</td>
                  <td className="hide-mobile"><span className="badge">{p.tipo}</span></td>
                  <td className="center">{p.dia ? `dia ${p.dia}` : '—'}</td>
                  <td className="num" style={{ paddingRight: 0 }}>{fmtBRL(p.valor)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 600, paddingLeft: 0 }}>Total pendente</td>
                <td className="hide-mobile" /><td />
                <td className="num" style={{ fontWeight: 700, paddingRight: 0, color: 'var(--amber)' }}>
                  {fmtBRL(pend.reduce((s, p) => s + p.valor, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev` → na Visão geral, clicar "Iniciar mês"; cards de resumo devem aparecer zerados; definir uma meta e conferir que persiste após recarregar a página.

- [ ] **Step 4: Typecheck e commit**

```powershell
npm run typecheck
git add -A
git commit -m "feat: página Visão geral com fatura, orçamento e gráficos"
```

---

### Task 10: Página Lançamentos

**Files:**
- Create: `components/TxSection.tsx`, `app/(app)/lancamentos/page.tsx`

- [ ] **Step 1: Criar `components/TxSection.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CATEGORIAS } from '@/lib/categories';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { supabase } from '@/lib/supabase';
import { Transaction, TxType } from '@/lib/types';
import { useMonth, useToast } from './Providers';

export default function TxSection({ title, type, txs, color }: {
  title: string; type: TxType; txs: Transaction[]; color: 'green' | 'red';
}) {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const isEntrada = type === 'entrada';
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);
  const [dia, setDia] = useState('');

  const total = txs.reduce((s, t) => s + Number(t.valor), 0);

  function startEdit(t: Transaction) {
    setEditing(t);
    setDesc(t.descricao);
    setValor(Number(t.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setCat(t.categoria ?? CATEGORIAS[0]);
    setDia(t.dia_vencimento ? String(t.dia_vencimento) : '');
  }

  function reset() {
    setEditing(null); setDesc(''); setValor(''); setCat(CATEGORIAS[0]); setDia('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = parseValorBR(valor);
    if (!desc.trim()) { toast('Digite uma descrição'); return; }
    if (isNaN(v) || v <= 0) { toast('Valor inválido — use por ex. 150,00'); return; }
    const row = {
      month, type, descricao: desc.trim(), valor: v,
      categoria: isEntrada ? null : cat,
      dia_vencimento: !isEntrada && dia ? Number(dia) : null,
    };
    const res = editing
      ? await supabase.from('transactions').update(row).eq('id', editing.id)
      : await supabase.from('transactions').insert(row);
    if (res.error) { toast('Erro ao salvar — tente novamente'); return; }
    reset();
    qc.invalidateQueries();
    toast(editing ? 'Lançamento atualizado' : 'Lançamento adicionado');
  }

  async function toggle(t: Transaction) {
    await supabase.from('transactions').update({ pago: !t.pago }).eq('id', t.id);
    qc.invalidateQueries();
  }

  async function remove(t: Transaction) {
    if (!confirm(`Excluir "${t.descricao}"?`)) return;
    await supabase.from('transactions').delete().eq('id', t.id);
    if (editing?.id === t.id) reset();
    qc.invalidateQueries();
  }

  return (
    <div className="section">
      <div className="section-header">
        <h2>{title}</h2>
        <span className="total" style={{ color: `var(--${color})` }}>{fmtBRL(total)}</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              {!isEntrada && <><th className="hide-mobile">Categoria</th><th className="center hide-mobile">Vencimento</th></>}
              <th className="num">Valor</th>
              <th className="center">Status</th>
              <th className="center" style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 && <tr><td colSpan={6} className="empty-row">Nenhum lançamento ainda.</td></tr>}
            {txs.map(t => (
              <tr key={t.id} className={t.pago ? 'paid' : ''}>
                <td>{t.descricao}</td>
                {!isEntrada && <>
                  <td className="hide-mobile"><span className="badge">{t.categoria || 'Outros'}</span></td>
                  <td className="center hide-mobile">{t.dia_vencimento ? `dia ${t.dia_vencimento}` : '—'}</td>
                </>}
                <td className="num">{fmtBRL(Number(t.valor))}</td>
                <td className="center">
                  <button className={`status-btn ${t.pago ? 'pago' : 'pendente'}`} onClick={() => toggle(t)}>
                    {t.pago ? (isEntrada ? 'Recebido' : 'Pago') : (isEntrada ? 'A receber' : 'Pendente')}
                  </button>
                </td>
                <td className="center" style={{ whiteSpace: 'nowrap' }}>
                  <button className="icon-btn" title="Editar" onClick={() => startEdit(t)}>✎</button>
                  <button className="icon-btn danger" title="Excluir" onClick={() => remove(t)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="add-form" onSubmit={submit}>
        <input className="f-desc" placeholder={isEntrada ? 'Descrição (ex.: salário, freela...)' : 'Descrição (ex.: aluguel, mercado...)'} value={desc} onChange={e => setDesc(e.target.value)} autoComplete="off" />
        {!isEntrada && (
          <select className="f-cat" value={cat} onChange={e => setCat(e.target.value)} aria-label="Categoria">
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
        )}
        {!isEntrada && (
          <input className="f-dia" type="number" min={1} max={31} placeholder="Dia venc." value={dia} onChange={e => setDia(e.target.value)} aria-label="Dia do vencimento" />
        )}
        <input className="f-val" placeholder="Valor (R$)" value={valor} onChange={e => setValor(e.target.value)} autoComplete="off" />
        <button type="submit">{editing ? 'Salvar' : 'Adicionar'}</button>
        {editing && <button type="button" className="btn-ghost" onClick={reset}>Cancelar</button>}
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Criar `app/(app)/lancamentos/page.tsx`**

```tsx
'use client';
import PageHead from '@/components/PageHead';
import TxSection from '@/components/TxSection';
import { useMonth } from '@/components/Providers';
import { useMonthRow, useTransactions } from '@/hooks/useFinance';
import { monthName } from '@/lib/months';

export default function Lancamentos() {
  const { month } = useMonth();
  const monthRow = useMonthRow(month);
  const txsQ = useTransactions(month);

  if (monthRow.isLoading || txsQ.isLoading) return <p className="empty-row">Carregando…</p>;

  const txs = txsQ.data ?? [];
  return (
    <>
      <PageHead title="Lançamentos" sub="Cadastre suas entradas e gastos do mês." />
      {!monthRow.data ? (
        <div className="new-month">
          <p>O mês de <strong>{monthName(month)}</strong> ainda não foi iniciado. Inicie-o na Visão geral.</p>
        </div>
      ) : (
        <>
          <TxSection title="Entradas" type="entrada" color="green" txs={txs.filter(t => t.type === 'entrada')} />
          <TxSection title="Custos fixos" type="fixo" color="red" txs={txs.filter(t => t.type === 'fixo')} />
          <TxSection title="Custos variáveis" type="variavel" color="red" txs={txs.filter(t => t.type === 'variavel')} />
        </>
      )}
    </>
  );
}
```

- [ ] **Step 3: Verificar no navegador**

Run: `npm run dev` → em Lançamentos: adicionar uma entrada (ex.: "Salário", `3.000,00`), um fixo com categoria e dia, alternar status, editar, excluir. Voltar à Visão geral e conferir os totais.

- [ ] **Step 4: Typecheck e commit**

```powershell
npm run typecheck
git add -A
git commit -m "feat: página Lançamentos com CRUD completo"
```

---

### Task 11: Página Cartão

**Files:**
- Create: `app/(app)/cartao/page.tsx`

- [ ] **Step 1: Criar `app/(app)/cartao/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import { useMonth, useToast } from '@/components/Providers';
import { useCard, usePaidInvoices, usePurchases } from '@/hooks/useFinance';
import { CATEGORIAS } from '@/lib/categories';
import { faturaDoMes, limiteUtilizado } from '@/lib/invoice';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { monthName, todayKey } from '@/lib/months';
import { supabase } from '@/lib/supabase';

export default function Cartao() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const cardQ = useCard();
  const purchasesQ = usePurchases();
  const paidQ = usePaidInvoices();

  // formulário de configuração do cartão
  const [nome, setNome] = useState('');
  const [fech, setFech] = useState('');
  const [venc, setVenc] = useState('');
  const [limite, setLimite] = useState('');
  // formulário de compra
  const [desc, setDesc] = useState('');
  const [valor, setValor] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [cat, setCat] = useState<string>(CATEGORIAS[0]);

  if (cardQ.isLoading || purchasesQ.isLoading || paidQ.isLoading) return <p className="empty-row">Carregando…</p>;

  const card = cardQ.data;

  async function salvarCartao(e: React.FormEvent) {
    e.preventDefault();
    const f = Number(fech), v = Number(venc);
    const lim = limite ? parseValorBR(limite) : null;
    if (!nome.trim()) { toast('Digite o nome do cartão'); return; }
    if (!f || f < 1 || f > 28 || !v || v < 1 || v > 28) { toast('Fechamento e vencimento devem ser dias entre 1 e 28'); return; }
    if (limite && (isNaN(lim!) || lim! <= 0)) { toast('Limite inválido'); return; }
    const res = await supabase.from('cards').insert({ nome: nome.trim(), dia_fechamento: f, dia_vencimento: v, limite: lim });
    if (res.error) { toast('Erro ao salvar o cartão'); return; }
    qc.invalidateQueries();
    toast('Cartão configurado');
  }

  if (!card) {
    return (
      <>
        <PageHead title="Cartão" sub="Configure seu cartão de crédito." withMonthNav={false} />
        <div className="card" style={{ maxWidth: 560 }}>
          <h3 style={{ marginBottom: 12 }}>Novo cartão</h3>
          <form className="add-form" onSubmit={salvarCartao}>
            <input className="f-desc" placeholder="Nome (ex.: Nubank)" value={nome} onChange={e => setNome(e.target.value)} />
            <input className="f-dia" type="number" min={1} max={28} placeholder="Dia fech." title="Dia do fechamento" value={fech} onChange={e => setFech(e.target.value)} />
            <input className="f-dia" type="number" min={1} max={28} placeholder="Dia venc." title="Dia do vencimento" value={venc} onChange={e => setVenc(e.target.value)} />
            <input className="f-val" placeholder="Limite (R$)" value={limite} onChange={e => setLimite(e.target.value)} />
            <button type="submit">Salvar</button>
          </form>
        </div>
      </>
    );
  }

  const purchases = purchasesQ.data ?? [];
  const paidMonths = (paidQ.data ?? []).filter(p => p.pago).map(p => p.month);
  const fatura = faturaDoMes(purchases, card, month);
  const faturaPaga = paidMonths.includes(month);
  const usado = limiteUtilizado(purchases, card, paidMonths, todayKey());

  async function addCompra(e: React.FormEvent) {
    e.preventDefault();
    const v = parseValorBR(valor);
    const n = Number(parcelas);
    if (!desc.trim()) { toast('Digite uma descrição'); return; }
    if (isNaN(v) || v <= 0) { toast('Valor inválido — use por ex. 150,00'); return; }
    if (!n || n < 1 || n > 48) { toast('Número de parcelas inválido'); return; }
    if (!data) { toast('Escolha a data da compra'); return; }
    const res = await supabase.from('card_purchases').insert({
      card_id: card!.id, descricao: desc.trim(), valor_total: v, parcelas: n, data_compra: data, categoria: cat,
    });
    if (res.error) { toast('Erro ao salvar a compra'); return; }
    setDesc(''); setValor(''); setParcelas('1');
    qc.invalidateQueries();
    toast('Compra adicionada');
  }

  async function removeCompra(id: string, descricao: string) {
    if (!confirm(`Excluir a compra "${descricao}" e todas as suas parcelas?`)) return;
    await supabase.from('card_purchases').delete().eq('id', id);
    qc.invalidateQueries();
  }

  async function togglePagamento() {
    if (faturaPaga) {
      await supabase.from('card_invoice_payments').delete().eq('card_id', card!.id).eq('month', month);
    } else {
      const res = await supabase.from('card_invoice_payments').insert({ card_id: card!.id, month, pago: true });
      if (res.error) { toast('Erro ao registrar o pagamento'); return; }
    }
    qc.invalidateQueries();
  }

  return (
    <>
      <PageHead title={card.nome} sub="Compras, parcelas e fatura do mês." />
      <div className="summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card highlight">
          <div className="label">Fatura de {monthName(month)}</div>
          <div className="value">{fmtBRL(fatura.total)}</div>
          <div className="sub">vence dia {card.dia_vencimento} · fecha dia {card.dia_fechamento}</div>
        </div>
        <div className="card">
          <div className="label">Status da fatura</div>
          <div className="value" style={{ fontSize: 18, marginTop: 6 }}>
            <button className={`status-btn ${faturaPaga ? 'pago' : 'pendente'}`} onClick={togglePagamento}>
              {faturaPaga ? 'Paga ✓' : 'Marcar como paga'}
            </button>
          </div>
          <div className="sub">{fatura.items.length} item(ns) nesta fatura</div>
        </div>
        <div className="card">
          <div className="label">Limite utilizado</div>
          <div className="value">{fmtBRL(usado)}</div>
          <div className="sub">{card.limite ? `de ${fmtBRL(Number(card.limite))} (${Math.round((usado / Number(card.limite)) * 100)}%)` : 'parcelas a vencer'}</div>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Fatura de {monthName(month)}</h2>
          <span className="total" style={{ color: 'var(--red)' }}>{fmtBRL(fatura.total)}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="hide-mobile">Categoria</th>
                <th className="center">Parcela</th>
                <th className="num">Valor</th>
              </tr>
            </thead>
            <tbody>
              {fatura.items.length === 0 && <tr><td colSpan={4} className="empty-row">Nenhuma parcela nesta fatura.</td></tr>}
              {fatura.items.map((i, idx) => (
                <tr key={`${i.purchaseId}-${idx}`}>
                  <td>{i.descricao}</td>
                  <td className="hide-mobile"><span className="badge">{i.categoria}</span></td>
                  <td className="center">{i.parcelas > 1 ? `${i.parcela}/${i.parcelas}` : 'à vista'}</td>
                  <td className="num">{fmtBRL(i.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section">
        <div className="section-header">
          <h2>Compras cadastradas</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="hide-mobile">Categoria</th>
                <th className="center">Data</th>
                <th className="center">Parcelas</th>
                <th className="num">Total</th>
                <th className="center" style={{ width: 50 }} />
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 && <tr><td colSpan={6} className="empty-row">Nenhuma compra ainda.</td></tr>}
              {purchases.map(p => (
                <tr key={p.id}>
                  <td>{p.descricao}</td>
                  <td className="hide-mobile"><span className="badge">{p.categoria}</span></td>
                  <td className="center">{p.data_compra.split('-').reverse().join('/')}</td>
                  <td className="center">{p.parcelas}x</td>
                  <td className="num">{fmtBRL(Number(p.valor_total))}</td>
                  <td className="center">
                    <button className="icon-btn danger" title="Excluir" onClick={() => removeCompra(p.id, p.descricao)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form className="add-form" onSubmit={addCompra}>
          <input className="f-desc" placeholder="Descrição (ex.: geladeira, mercado...)" value={desc} onChange={e => setDesc(e.target.value)} autoComplete="off" />
          <select className="f-cat" value={cat} onChange={e => setCat(e.target.value)} aria-label="Categoria">
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input className="f-val" placeholder="Valor total (R$)" value={valor} onChange={e => setValor(e.target.value)} autoComplete="off" />
          <input className="f-dia" type="number" min={1} max={48} placeholder="Parcelas" title="Número de parcelas" value={parcelas} onChange={e => setParcelas(e.target.value)} />
          <input className="f-dia" style={{ width: 150 }} type="date" value={data} onChange={e => setData(e.target.value)} aria-label="Data da compra" />
          <button type="submit">Adicionar</button>
        </form>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar no navegador**

Run: `npm run dev` → em Cartão:
1. Configurar o cartão (ex.: Nubank, fecha dia 20, vence dia 27, limite 5.000,00).
2. Adicionar compra parcelada (ex.: "Geladeira", `3.000,00`, 10x, data de hoje).
3. Navegar meses com ‹ › e conferir a parcela `1/10`, `2/10`… nos meses corretos.
4. Marcar a fatura como paga e conferir que o limite utilizado diminui.
5. Na Visão geral, conferir que a fatura aparece nas Saídas e nas contas pendentes.

- [ ] **Step 3: Typecheck e commit**

```powershell
npm run typecheck
git add -A
git commit -m "feat: página Cartão com compras, fatura derivada e pagamento"
```

---

### Task 12: Página Orçamento

**Files:**
- Create: `app/(app)/orcamento/page.tsx`

- [ ] **Step 1: Criar `app/(app)/orcamento/page.tsx`**

```tsx
'use client';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import { useMonth, useToast } from '@/components/Providers';
import { useBudgets, useCard, usePurchases, useTransactions } from '@/hooks/useFinance';
import { CATEGORIAS } from '@/lib/categories';
import { faturaDoMes } from '@/lib/invoice';
import { fmtBRL, parseValorBR } from '@/lib/money';
import { gastosPorCategoria } from '@/lib/totals';
import { supabase } from '@/lib/supabase';

export default function Orcamento() {
  const { month } = useMonth();
  const qc = useQueryClient();
  const toast = useToast();
  const budgetsQ = useBudgets(month);
  const txsQ = useTransactions(month);
  const cardQ = useCard();
  const purchasesQ = usePurchases();

  if (budgetsQ.isLoading || txsQ.isLoading || cardQ.isLoading || purchasesQ.isLoading) {
    return <p className="empty-row">Carregando…</p>;
  }

  const budgets = budgetsQ.data ?? [];
  const fatura = cardQ.data ? faturaDoMes(purchasesQ.data ?? [], cardQ.data, month) : { items: [], total: 0 };
  const gastos = gastosPorCategoria(txsQ.data ?? [], fatura.items);

  async function setLimite(categoria: string, value: string) {
    const v = parseValorBR(value);
    const existing = budgets.find(b => b.categoria === categoria);
    if (!value.trim() || isNaN(v) || v <= 0) {
      if (existing) { await supabase.from('budgets').delete().eq('id', existing.id); qc.invalidateQueries(); }
      return;
    }
    const res = existing
      ? await supabase.from('budgets').update({ limite: v }).eq('id', existing.id)
      : await supabase.from('budgets').insert({ month, categoria, limite: v });
    if (res.error) { toast('Erro ao salvar o limite'); return; }
    qc.invalidateQueries();
  }

  const totalOrcado = budgets.reduce((s, b) => s + Number(b.limite), 0);
  const totalGasto = CATEGORIAS.reduce((s, c) => s + (gastos[c] || 0), 0);

  return (
    <>
      <PageHead title="Orçamento" sub="Defina limites por categoria e acompanhe o consumo do mês." />
      <div className="card">
        {CATEGORIAS.map(categoria => {
          const b = budgets.find(x => x.categoria === categoria);
          const limite = b ? Number(b.limite) : 0;
          const gasto = gastos[categoria] || 0;
          const pct = limite > 0 ? Math.min(100, (gasto / limite) * 100) : 0;
          const cls = limite > 0 && gasto > limite ? 'over' : pct >= 80 ? 'warn' : '';
          return (
            <div className="budget-row" key={categoria}>
              <span className="b-cat">{categoria}</span>
              <input
                className="b-limit"
                placeholder="sem limite"
                defaultValue={limite ? limite.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}
                onBlur={e => setLimite(categoria, e.target.value)}
                aria-label={`Limite de ${categoria}`}
              />
              <div className="b-bar"><div className={cls} style={{ width: `${pct}%` }} /></div>
              <span className="b-spent">
                {limite > 0
                  ? `${fmtBRL(gasto)} de ${fmtBRL(limite)}${gasto > limite ? ' — estourou!' : ''}`
                  : gasto > 0 ? `${fmtBRL(gasto)} gastos` : '—'}
              </span>
            </div>
          );
        })}
        <div className="budget-row" style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
          <span className="b-cat" style={{ fontWeight: 600 }}>Total</span>
          <span className="b-limit" style={{ border: 'none', background: 'none' }} />
          <div className="b-bar" style={{ visibility: 'hidden' }} />
          <span className="b-spent" style={{ fontWeight: 600, color: 'var(--text)' }}>
            {fmtBRL(totalGasto)} de {fmtBRL(totalOrcado)}
          </span>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar no navegador**

Run: `npm run dev` → em Orçamento: definir limite de Alimentação (ex.: `800,00`); a barra deve refletir gastos já lançados (incluindo parcelas do cartão da categoria); testar estouro com limite baixo (barra vermelha + "estourou!"). Iniciar o mês seguinte na Visão geral e conferir que os limites foram copiados.

- [ ] **Step 3: Typecheck e commit**

```powershell
npm run typecheck
git add -A
git commit -m "feat: página Orçamento com limites por categoria"
```

---

### Task 13: Página Ajustes — backup, importação do app antigo e sair

O formato do backup antigo (ver `legacy/index.html`, função `exportData`) é:
`{ months: { 'YYYY-MM': { meta, entradas: [{desc, valor, recebido}], fixos: [{desc, valor, cat, dia, pago}], variaveis: [...] } }, lastViewed }`.

**Files:**
- Create: `app/(app)/config/page.tsx`

- [ ] **Step 1: Criar `app/(app)/config/page.tsx`**

```tsx
'use client';
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHead from '@/components/PageHead';
import { useToast } from '@/components/Providers';
import { q } from '@/hooks/useFinance';
import { supabase } from '@/lib/supabase';
import { todayKey } from '@/lib/months';

interface LegacyItem { desc: string; valor: number; recebido?: boolean; pago?: boolean; cat?: string; dia?: number | null; }
interface LegacyMonth { meta?: number; entradas?: LegacyItem[]; fixos?: LegacyItem[]; variaveis?: LegacyItem[]; }

export default function Config() {
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);

  async function exportar() {
    const [months, transactions, cards, purchases, payments, budgets] = await Promise.all([
      q(supabase.from('months').select('*')),
      q(supabase.from('transactions').select('*')),
      q(supabase.from('cards').select('*')),
      q(supabase.from('card_purchases').select('*')),
      q(supabase.from('card_invoice_payments').select('*')),
      q(supabase.from('budgets').select('*')),
    ]);
    const blob = new Blob(
      [JSON.stringify({ versao: 2, months, transactions, cards, purchases, payments, budgets }, null, 2)],
      { type: 'application/json' },
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `financas-backup-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup exportado');
  }

  async function importarLegado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let data: { months?: Record<string, LegacyMonth> };
    try {
      data = JSON.parse(await file.text());
    } catch {
      toast('Arquivo inválido');
      return;
    }
    if (!data.months || typeof data.months !== 'object') { toast('Arquivo inválido'); return; }
    if (!confirm('Importar backup do app antigo? Meses que já existem aqui serão pulados.')) return;

    setImportando(true);
    try {
      const existentes = new Set((await q<{ month: string }[]>(supabase.from('months').select('month'))).map(r => r.month));
      let nMeses = 0, nTx = 0;
      for (const [key, m] of Object.entries(data.months)) {
        if (existentes.has(key)) continue;
        const ins = await supabase.from('months').insert({ month: key, meta: m.meta || 0 });
        if (ins.error) throw new Error(ins.error.message);
        const rows = [
          ...(m.entradas ?? []).map(i => ({ month: key, type: 'entrada', descricao: i.desc, valor: i.valor, pago: !!i.recebido })),
          ...(m.fixos ?? []).map(i => ({ month: key, type: 'fixo', descricao: i.desc, valor: i.valor, categoria: i.cat || 'Outros', dia_vencimento: i.dia || null, pago: !!i.pago })),
          ...(m.variaveis ?? []).map(i => ({ month: key, type: 'variavel', descricao: i.desc, valor: i.valor, categoria: i.cat || 'Outros', dia_vencimento: i.dia || null, pago: !!i.pago })),
        ];
        if (rows.length) {
          const insTx = await supabase.from('transactions').insert(rows);
          if (insTx.error) throw new Error(insTx.error.message);
        }
        nMeses++; nTx += rows.length;
      }
      qc.invalidateQueries();
      toast(`Importado: ${nMeses} mês(es), ${nTx} lançamento(s)`);
    } catch {
      toast('Erro durante a importação — verifique e tente de novo');
    } finally {
      setImportando(false);
    }
  }

  return (
    <>
      <PageHead title="Ajustes" sub="Backup, importação e conta." withMonthNav={false} />
      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 4 }}>Backup</h3>
        <div className="card-sub" style={{ marginBottom: 14 }}>Baixe uma cópia de todos os seus dados em JSON.</div>
        <button className="btn-ghost" onClick={exportar}>Exportar backup</button>
      </div>
      <div className="card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <h3 style={{ marginBottom: 4 }}>Importar do app antigo</h3>
        <div className="card-sub" style={{ marginBottom: 14 }}>
          Use o arquivo exportado pelo app antigo (financas-backup-*.json). Meses já existentes são pulados.
        </div>
        <button className="btn-ghost" disabled={importando} onClick={() => fileRef.current?.click()}>
          {importando ? 'Importando…' : 'Escolher arquivo'}
        </button>
        <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={importarLegado} />
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <h3 style={{ marginBottom: 4 }}>Conta</h3>
        <div className="card-sub" style={{ marginBottom: 14 }}>Sair desta conta neste aparelho.</div>
        <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verificar no navegador**

Run: `npm run dev` → em Ajustes:
1. Exportar backup e conferir o JSON baixado.
2. No app antigo (`legacy/index.html` aberto no navegador, se tiver dados), exportar o backup e importá-lo aqui; conferir meses e lançamentos migrados na Visão geral.
3. Clicar "Sair" → deve voltar para o login.

- [ ] **Step 3: Typecheck e commit**

```powershell
npm run typecheck
git add -A
git commit -m "feat: página Ajustes com backup, importação do legado e logout"
```

---

### Task 14: PWA (manifest + ícone)

**Files:**
- Create: `app/manifest.ts`, `public/icon.svg`

- [ ] **Step 1: Criar `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="256" fill="#217a54"/>
  <g stroke="#fff" stroke-width="36" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="256" y1="96" x2="256" y2="416"/>
    <path d="M336 152H221a56 56 0 0 0 0 112h70a56 56 0 0 1 0 112H160"/>
  </g>
</svg>
```

- [ ] **Step 2: Criar `app/manifest.ts`**

```ts
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Minhas Finanças',
    short_name: 'Finanças',
    description: 'Controle de finanças pessoais',
    start_url: '/',
    display: 'standalone',
    background_color: '#f3f5f4',
    theme_color: '#217a54',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
```

- [ ] **Step 3: Verificar**

Run: `npm run dev` → abrir http://localhost:3000/manifest.webmanifest — deve retornar o JSON do manifest. Conferir que http://localhost:3000/icon.svg renderiza o ícone.

- [ ] **Step 4: Commit**

```powershell
git add -A
git commit -m "feat: PWA manifest e ícone"
```

---

### Task 15: Build, deploy na Vercel e checklist final

> ⚠️ **Requer ação do usuário:** conta no GitHub e na Vercel.

- [ ] **Step 1: Build e testes completos**

```powershell
npm test
npm run typecheck
npm run build
```

Expected: testes PASS, typecheck sem erros, build conclui sem erros.

- [ ] **Step 2: ⚠️ AÇÃO DO USUÁRIO — publicar**

Guiar o usuário:
1. Criar um repositório **privado** no GitHub (ex.: `minhas-financas`) e fazer push: `git remote add origin <url>` + `git push -u origin master`.
2. Em https://vercel.com → **Add New → Project** → importar o repositório.
3. Em **Environment Variables**, adicionar `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (mesmos valores do `.env.local`).
4. Deploy → anotar a URL (ex.: `https://minhas-financas.vercel.app`).

- [ ] **Step 3: Checklist de smoke test (manual, na URL pública)**

- [ ] Login funciona no PC e no celular com a mesma conta.
- [ ] Iniciar mês → copiar fixos/orçamento/meta do mês anterior.
- [ ] CRUD de lançamentos + alternar pago/pendente.
- [ ] Compra parcelada aparece nos meses futuros com `n/N` correto.
- [ ] Fatura entra como saída única na Visão geral; marcar como paga a remove das pendentes.
- [ ] Orçamento: limites persistem, barras corretas, estouro em vermelho.
- [ ] Importação do backup do app antigo.
- [ ] No celular: "Adicionar à tela inicial" instala o PWA com o ícone verde.
- [ ] Lançamento criado no celular aparece no PC após recarregar.

- [ ] **Step 4: Commit final**

```powershell
git add -A
git commit -m "chore: projeto pronto para deploy"
```

---

## Cobertura do spec (self-review)

| Requisito do spec | Task |
|---|---|
| Next.js 15 + TS + CSS portado | 1 |
| Lógica pura testada (Vitest): dinheiro, meses, fatura/parcelas, totais | 2–5 |
| Schema Supabase + RLS + Auth | 6, 7 |
| Visão geral (resumo, gráficos, pendentes com fatura, meta) | 9 |
| Lançamentos (CRUD, status) | 10 |
| Cartão (config, compras, fatura derivada, pagamento, limite) | 11 |
| Orçamento por categoria (limites, progresso, cópia mensal) | 12 (cópia na Task 9 — `iniciarMes`) |
| Backup novo + importação do legado | 13 |
| PWA | 14 |
| Deploy Vercel + smoke checklist | 15 |
