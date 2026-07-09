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
