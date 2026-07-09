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
