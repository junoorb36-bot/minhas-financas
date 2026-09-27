'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setNota } from '@/lib/actions';
import { monthName } from '@/lib/months';
import { useToast } from './Providers';

export default function MonthNote({ month, nota }: { month: string; nota: string | null }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(nota ?? '');

  async function salvar() {
    setEditando(false);
    if (texto.trim() === (nota ?? '')) return;
    try {
      await setNota(month, texto);
      qc.invalidateQueries();
      toast(texto.trim() ? 'Observação salva' : 'Observação removida');
    } catch {
      toast('Erro ao salvar a observação');
    }
  }

  if (!editando && !nota) {
    return (
      <div className="month-note empty">
        <button className="hint-link" onClick={() => setEditando(true)}>+ adicionar observação</button>
        <span>sobre {monthName(month).toLowerCase()} (ex.: viagem, gasto extra, mês atípico)</span>
      </div>
    );
  }

  return (
    <div className="month-note card">
      <div className="month-note-head">
        <h3>📝 Observações de {monthName(month).toLowerCase()}</h3>
        {!editando && <button className="hint-link" onClick={() => setEditando(true)}>editar</button>}
      </div>
      {editando ? (
        <textarea
          autoFocus
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onBlur={salvar}
          maxLength={2000}
          rows={3}
          placeholder="O que aconteceu neste mês? Ex.: mês de viagem — muitos gastos com Uber."
        />
      ) : (
        <p>{nota}</p>
      )}
    </div>
  );
}
