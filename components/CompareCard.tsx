'use client';
import { useState } from 'react';
import Link from 'next/link';
import { VariacaoCategoria } from '@/lib/compare';
import { fmtBRL } from '@/lib/money';

/** Pílulas de melhora/piora: fechado mostra uma linha; o resto abre sob demanda. */
export default function CompareCard({ variacoes, nomeAnterior }: { variacoes: VariacaoCategoria[]; nomeAnterior: string }) {
  const [aberto, setAberto] = useState(false);
  if (variacoes.length === 0) return <div className="sub">gastos estáveis em todas as categorias</div>;

  const melhoras = variacoes.filter(v => v.status === 'melhorou');
  const pioras = variacoes.filter(v => v.status === 'piorou');
  // fechado: a maior melhora e a maior piora (ou as duas primeiras, se só houver um lado)
  const resumo = melhoras.length && pioras.length ? [melhoras[0], pioras[0]] : variacoes.slice(0, 2);
  const visiveis = aberto ? [...melhoras, ...pioras] : resumo;
  const escondidas = variacoes.length - resumo.length;

  return (
    <div className={`cmp-pills ${aberto ? 'aberto' : ''}`}>
      {visiveis.map(v => (
        <Link
          key={v.categoria}
          href={`/comparativo?cat=${encodeURIComponent(v.categoria)}`}
          className={`orc-pill ${v.status === 'melhorou' ? 'ok' : 'estourou'}`}
          title={`${v.categoria}: ${fmtBRL(v.atual)} agora, ${fmtBRL(v.anterior)} em ${nomeAnterior} — gastou ${fmtBRL(Math.abs(v.diferenca))} a ${v.status === 'melhorou' ? 'menos' : 'mais'}`}
        >
          <i />{v.categoria} · <span>{v.status}</span>
        </Link>
      ))}
      {escondidas > 0 && (
        <button className="cmp-mais" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
          {aberto ? 'ver menos ▴' : `+${escondidas}`}
        </button>
      )}
    </div>
  );
}
