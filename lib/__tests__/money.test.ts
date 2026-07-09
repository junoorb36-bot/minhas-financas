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
    expect(fmtBRL(1234.56).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });
});
