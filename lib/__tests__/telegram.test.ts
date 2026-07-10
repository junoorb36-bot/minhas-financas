import { describe, expect, it } from 'vitest';
import { matchCategoria, parseMensagem } from '@/lib/telegram';

describe('parseMensagem', () => {
  it('gasto simples sem categoria', () => {
    expect(parseMensagem('mercado 45,90')).toEqual({
      tipo: 'gasto', descricao: 'mercado', valor: 45.9, categoria: 'Outros',
    });
  });
  it('gasto com categoria', () => {
    expect(parseMensagem('uber 23,50 transporte')).toEqual({
      tipo: 'gasto', descricao: 'uber', valor: 23.5, categoria: 'Transporte',
    });
  });
  it('categoria sem acento é reconhecida', () => {
    expect(parseMensagem('padaria 8 alimentacao')!.categoria).toBe('Alimentação');
  });
  it('categoria desconhecida cai em Outros', () => {
    expect(parseMensagem('x 10 naoexiste')!.categoria).toBe('Outros');
  });
  it('descrição com várias palavras e números', () => {
    expect(parseMensagem('uber 2 viagens 30')).toEqual({
      tipo: 'gasto', descricao: 'uber 2 viagens', valor: 30, categoria: 'Outros',
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
      tipo: 'entrada', descricao: 'freela', valor: 2000, categoria: 'Outros',
    });
    expect(parseMensagem('+freela 2000')).toEqual({
      tipo: 'entrada', descricao: 'freela', valor: 2000, categoria: 'Outros',
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
