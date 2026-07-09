import MonthNav from './MonthNav';

export default function PageHead({ title, sub, withMonthNav = true }: { title: string; sub: string; withMonthNav?: boolean }) {
  return (
    <div className="page-head">
      <div className="greeting">
        <h1>{title}</h1>
        <p>{sub}</p>
      </div>
      {withMonthNav && <MonthNav />}
    </div>
  );
}
