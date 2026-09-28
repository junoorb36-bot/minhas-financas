'use client';
import { useQuery } from '@tanstack/react-query';
import {
  getCard, getMonthRow, listAllTransactions, listBudgets, listMonths, listTransactions,
} from '@/lib/actions';

export const useMonthRow = (month: string) =>
  useQuery({ queryKey: ['month', month], queryFn: () => getMonthRow(month) });

export const useAllMonths = () =>
  useQuery({ queryKey: ['months'], queryFn: () => listMonths() });

export const useTransactions = (month: string) =>
  useQuery({ queryKey: ['tx', month], queryFn: () => listTransactions(month) });

export const useAllTransactions = () =>
  useQuery({ queryKey: ['tx-all'], queryFn: () => listAllTransactions() });

export const useCard = () =>
  useQuery({ queryKey: ['card'], queryFn: () => getCard() });

export const useBudgets = (month: string) =>
  useQuery({ queryKey: ['budgets', month], queryFn: () => listBudgets(month) });
