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

  return (
    <div className="month-note">
      <div className="month-note-head">
        <h4>📝 Observações do mês</h4>
        {!editando && nota && <button className="hint-link" onClick={() => setEditando(true)}>editar</button>}
      </div>
      {editando ? (
        <textarea
          autoFocus
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onBlur={salvar}
          maxLength={2000}
          placeholder="O que aconteceu neste mês? Ex.: mês de viagem — muitos gastos com Uber."
        />
      ) : nota ? (
        <p className="month-note-body" onClick={() => setEditando(true)} title="Clique para editar">{nota}</p>
      ) : (
        <button className="month-note-empty" onClick={() => setEditando(true)}>
          + Adicionar observação sobre {monthName(month).toLowerCase()}
          <span>ex.: viagem, gasto extra, uma categoria acima do normal</span>
        </button>
      )}
    </div>
  );
}
