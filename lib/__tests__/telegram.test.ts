import { describe, expect, it } from 'vitest';
import { dataBrasil, matchCategoria, parseMensagem } from '@/lib/telegram';

describe('dataBrasil', () => {
  it('converte para o fuso de São Paulo', () => {
    // 15/07/2026 12:00 UTC = 09:00 em SP
    expect(dataBrasil(Date.UTC(2026, 6, 15, 12, 0) / 1000)).toEqual({ dia: 15, month: '2026-07' });
  });
  it('não vira o dia antes da meia-noite de SP', () => {
    // 10/07/2026 01:00 UTC = 09/07 22:00 em SP
    expect(dataBrasil(Date.UTC(2026, 6, 10, 1, 0) / 1000)).toEqual({ dia: 9, month: '2026-07' });
  });
  it('não vira o mês na virada UTC', () => {
    // 01/08/2026 02:00 UTC = 31/07 23:00 em SP
    expect(dataBrasil(Date.UTC(2026, 7, 1, 2, 0) / 1000)).toEqual({ dia: 31, month: '2026-07' });
  });
});

describe('parseMensagem', () => {
  it('gasto sem categoria fica com categoria null (bot pergunta)', () => {
    expect(parseMensagem('mercado 45,90')).toEqual({
      tipo: 'gasto', descricao: 'mercado', valor: 45.9, categoria: null,
    });
  });
  it('gasto com categoria registra direto', () => {
    expect(parseMensagem('uber 23,50 transporte')).toEqual({
      tipo: 'gasto', descricao: 'uber', valor: 23.5, categoria: 'Transporte',
    });
  });
  it('categoria sem acento é reconhecida', () => {
    expect(parseMensagem('padaria 8 alimentacao')!.categoria).toBe('Alimentação');
  });
  it('categoria desconhecida vira null (bot pergunta)', () => {
    expect(parseMensagem('x 10 naoexiste')!.categoria).toBeNull();
  });
  it('descrição com várias palavras e números', () => {
    expect(parseMensagem('uber 2 viagens 30')).toEqual({
      tipo: 'gasto', descricao: 'uber 2 viagens', valor: 30, categoria: null,
    });
  });
  it('aceita ponto decimal e prefixo R$', () => {
    expect(parseMensagem('cafe 4.50')!.valor).toBe(4.5);
    expect(parseMensagem('cafe R$4,50')!.valor).toBe(4.5);
  });
  it('milhar brasileiro', () => {
    expect(parseMensagem('aluguel 1.234,56')!.valor).toBe(1234.56);
  });
  it('entrada com prefixo +, nas duas ordens', () => {
    expect(parseMensagem('+2000 freela')).toEqual({
      tipo: 'entrada', descricao: 'freela', valor: 2000, categoria: null,
    });
    expect(parseMensagem('+freela 2000')).toEqual({
      tipo: 'entrada', descricao: 'freela', valor: 2000, categoria: null,
    });
  });
  it('rejeita mensagens sem valor ou sem descrição', () => {
    expect(parseMensagem('mercado')).toBeNull();
    expect(parseMensagem('45,90')).toBeNull();
    expect(parseMensagem('oi tudo bem')).toBeNull();
  });
});

describe('matchCategoria', () => {
  it('casa ignorando caixa e acento', () => {
    expect(matchCategoria('LANCHE')).toBe('Lanche');
    expect(matchCategoria('dividas')).toBe('Dívidas');
  });
  it('null para desconhecida', () => {
    expect(matchCategoria('viagens')).toBeNull();
  });
});
