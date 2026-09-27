-- Observação livre por mês (ex.: "mês de viagem, muitos gastos com Uber").
-- Para instalações criadas antes de set/2026. Seguro rodar mais de uma vez.
alter table months add column if not exists nota text;
