'use client';
import { useMonth } from './Providers';
import { monthName, shiftMonth } from '@/lib/months';

export default function MonthNav() {
  const { month, setMonth } = useMonth();
  return (
    <div className="month-nav">
      <button className="arrow" onClick={() => setMonth(shiftMonth(month, -1))} title="Mês anterior">‹</button>
      <div className="month-label">{monthName(month)}</div>
      <button className="arrow" onClick={() => setMonth(shiftMonth(month, 1))} title="Próximo mês">›</button>
    </div>
  );
}
