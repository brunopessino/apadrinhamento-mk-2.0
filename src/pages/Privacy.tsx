import { Link } from 'react-router-dom';
import { INSTITUTION } from '@/config/campaign';

export default function Privacy() {
  return (
    <article className="container-mk max-w-3xl py-14">
      <p className="eyebrow">Transparência</p>
      <h1 className="mt-2 text-4xl font-semibold text-burgundy">Política de privacidade da campanha</h1>
      <p className="mt-2 text-sm text-muted">Texto-base alinhado aos princípios da LGPD (Lei 13.709/2018). Sujeito à validação institucional do {INSTITUTION.name}.</p>
      <div className="mt-8 space-y-6 leading-relaxed text-graphite">
        <section><h2 className="text-2xl font-semibold text-pine">Quais dados coletamos</h2>
          <p className="mt-2"><strong>Padrinhos e madrinhas:</strong> nome e número de WhatsApp informados no formulário de apadrinhamento. Não pedimos CPF, endereço, dados bancários ou senhas.</p>
          <p className="mt-2"><strong>Participantes da campanha:</strong> nome de exibição, categoria, idade, turma, tamanhos de roupa e calçado, presente sugerido e fotografia — publicados somente com autorização registrada pela organização. O nome completo fica restrito à equipe.</p>
        </section>
        <section><h2 className="text-2xl font-semibold text-pine">Para que usamos</h2>
          <p className="mt-2">Exclusivamente para organizar a campanha de Natal: registrar o apadrinhamento, entrar em contato individualmente para combinar a entrega dos presentes e prestar contas internamente. Não há envio de mensagens em massa, venda ou compartilhamento com terceiros.</p>
        </section>
        <section><h2 className="text-2xl font-semibold text-pine">Quem tem acesso</h2>
          <p className="mt-2">Somente pessoas autorizadas da organização, com login individual. Telefones e nomes de padrinhos nunca aparecem no site público. Crianças e adolescentes têm a exposição limitada ao mínimo necessário, no seu melhor interesse.</p>
        </section>
        <section><h2 className="text-2xl font-semibold text-pine">Por quanto tempo</h2>
          <p className="mt-2">Os dados de contato são mantidos durante a campanha e pelo período necessário à prestação de contas, definido pela organização. Após o encerramento, a campanha deixa de ser pública e seus registros ficam restritos ao histórico administrativo.</p>
        </section>
        <section><h2 className="text-2xl font-semibold text-pine">Seus direitos</h2>
          <p className="mt-2">Você pode solicitar acesso, correção ou exclusão dos seus dados, e responsáveis podem pedir a despublicação de um participante, entrando em contato com o {INSTITUTION.shortName} pelos canais oficiais (<a className="font-semibold text-pine underline" href={INSTITUTION.instagram} target="_blank" rel="noopener noreferrer">Instagram</a> ou <a className="font-semibold text-pine underline" href={INSTITUTION.site} target="_blank" rel="noopener noreferrer">site</a>{INSTITUTION.contactEmail ? <> ou {INSTITUTION.contactEmail}</> : null}).</p>
        </section>
        <section><h2 className="text-2xl font-semibold text-pine">Contribuição via Pix</h2>
          <p className="mt-2">A chave Pix exibida pertence à pessoa indicada pela organização. O site não processa pagamentos, não confirma transferências e não solicita dados bancários.</p>
        </section>
      </div>
      <Link to="/" className="btn-ghost mt-10">Voltar à campanha</Link>
    </article>
  );
}
