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
