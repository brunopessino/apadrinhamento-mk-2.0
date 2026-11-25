import type { ReactNode } from 'react';

export function PageHead({ title, desc, actions }: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold text-burgundy sm:text-3xl">{title}</h1>{desc && <p className="mt-1 max-w-3xl text-sm text-muted">{desc}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function TableWrap({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="card-surface overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full min-w-[720px] text-left text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:bg-cream-200 [&_th]:px-3 [&_th]:py-2.5 [&_th]:font-semibold [&_tbody_tr]:border-t [&_tbody_tr]:border-line">
        {children}
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card-surface p-8 text-center text-muted">{children}</div>;
}

export const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');

export const STATUS_LABEL: Record<string, string> = { confirmed: 'Confirmado', contacted: 'Contato realizado', received: 'Presente recebido', delivered: 'Entregue', cancelled: 'Cancelado' };
export const STATUS_CLASS: Record<string, string> = { confirmed: 'bg-yellow/25 text-graphite', contacted: 'bg-cream-200 text-burgundy', received: 'bg-pine/10 text-pine', delivered: 'bg-pine text-cream', cancelled: 'bg-red/10 text-red' };
