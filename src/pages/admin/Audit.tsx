import { useAdmin } from './AdminContext';
import { PageHead, TableWrap, Empty, fmtDate } from './ui';

export default function Audit() {
  const { audit } = useAdmin();
  return (
    <>
      <PageHead title="Histórico de alterações" desc="Registro imutável das ações administrativas desta campanha (logs não podem ser editados nem excluídos pelas regras de segurança)." />
      {audit.length === 0 ? <Empty>Nenhuma ação registrada.</Empty> : (
        <TableWrap label="Histórico de alterações">
          <thead><tr><th>Data</th><th>Usuário</th><th>Ação</th><th>Descrição</th></tr></thead>
          <tbody>{audit.map((a) => <tr key={a.id}><td className="whitespace-nowrap text-xs">{fmtDate(a.createdAt)}</td><td className="text-xs">{a.actorEmail}<br /><span className="text-muted">{a.role}</span></td><td className="font-mono text-xs">{a.action}</td><td>{a.summary}</td></tr>)}</tbody>
        </TableWrap>
      )}
    </>
  );
}
