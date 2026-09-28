-- Cartão de crédito como forma de pagamento dos lançamentos (set/2026).
-- Para instalações criadas antes de set/2026. Seguro rodar mais de uma vez.
alter table transactions add column if not exists cartao boolean not null default false;
alter table transactions add column if not exists parcela int;
alter table transactions add column if not exists parcelas int;
alter table transactions add column if not exists grupo uuid;
create index if not exists idx_transactions_grupo on transactions (grupo);
alter table telegram_pending add column if not exists cartao boolean not null default false;

-- Converte as compras do modelo antigo (tabela card_purchases) em lançamentos do
-- cartão: uma linha por parcela, no mês da fatura. Compras já convertidas são puladas.
insert into transactions (user_id, month, type, descricao, valor, categoria, dia_vencimento, pago, cartao, parcela, parcelas, grupo)
select x.user_id, x.month, 'variavel', x.descricao, x.valor, x.categoria, x.dia,
  exists (select 1 from card_invoice_payments ip where ip.card_id = x.card_id and ip.month = x.month and ip.pago),
  true, x.i, x.parcelas, x.id
from (
  select p.id, p.user_id, p.card_id, p.descricao, p.categoria, p.parcelas, g.i,
    extract(day from p.data_compra)::int as dia,
    to_char(date_trunc('month', p.data_compra)
      + ((case when extract(day from p.data_compra) > c.dia_fechamento then 1 else 0 end)
       + (case when c.dia_vencimento <= c.dia_fechamento then 1 else 0 end)
       + g.i - 1) * interval '1 month', 'YYYY-MM') as month,
    case when g.i = p.parcelas
      then round(p.valor_total - floor(p.valor_total * 100 / p.parcelas) / 100 * (p.parcelas - 1), 2)
      else floor(p.valor_total * 100 / p.parcelas) / 100 end as valor
  from card_purchases p
  join cards c on c.id = p.card_id
  cross join lateral generate_series(1, p.parcelas) as g(i)
  where not exists (select 1 from transactions t where t.grupo = p.id)
) x;
