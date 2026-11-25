# Auditoria da versão 2025

Repositório analisado: `github.com/brunopessino/apadrinhamento-mk` (branch `main`, 4 commits; arquivos `index.html`, `style.css`, `script.js`, `README.md`, `.gitignore` vazio e `images/` com 70 arquivos). A versão 2025 permanece intacta no repositório original; o MK 2.0 vive neste repositório separado.

## Arquitetura encontrada
- HTML/CSS/JS puro, Firebase JS SDK 12.5 via CDN, Firestore em tempo real (`onSnapshot`) na coleção raiz `afilhados`, deploy no Netlify (`apadrinhamentomk.netlify.app`).
- Documento por participante com: `nomeCompleto`, `tipoPessoa`, `idade`, `turma`, `tamanhoRoupa`, `tamanhoCalcado`, `opcaoPresente`, `fotoUrl` (nome do arquivo em `images/`), `apadrinhado`, `padrinhoNome`, `padrinhoWhatsapp`, `dataApadrinhamento`.
- Não há área administrativa, autenticação, regras de segurança versionadas nem código de exportação (o README cita exportação para Excel ao final — feita fora do código).

## Riscos e falhas (por gravidade)

| # | Gravidade | Achado | Evidência | Tratamento no 2.0 |
|---|---|---|---|---|
| 1 | **Crítica** | **Telefones e nomes de padrinhos públicos.** A seção "Apadrinhados Confirmados" exibe `padrinhoNome` e `padrinhoWhatsapp` para qualquer visitante. Mesmo sem a tela, o documento inteiro é lido pelo navegador. | `script.js` (renderFromDocs) e capturas do site 2025 com números visíveis | Dados do padrinho ficam em `sponsorships/` (leitura só da equipe). O documento público não contém nenhum dado de padrinho. |
| 2 | **Crítica** | **Condição de corrida e sobrescrita.** `updateDoc` direto, sem transação nem validação no servidor: duas pessoas podem confirmar o mesmo participante (a última sobrescreve) e qualquer visitante pode sobrescrever um apadrinhamento já feito chamando a API (o bloqueio é só `pointer-events: none` no CSS). | `script.js` (submit) | `runTransaction` + regras que exigem `create` do documento `sponsorships/{idDoParticipante}` (único por ID) e a transição `sponsored: false → true` na mesma escrita. |
| 3 | **Alta** | **XSS armazenado.** Nome do padrinho (entrada livre) é inserido com `innerHTML` e exibido a todos os visitantes. | `script.js` (template strings em `innerHTML`) | React escapa todo conteúdo; nenhuma injeção de HTML; validação de tamanho/formato nas regras. |
| 4 | **Alta** | **Exposição de crianças e adolescentes.** Nome completo e idade publicados; 68 fotografias de participantes estão no repositório **público** e no seu histórico. | pasta `images/`, cards | Nome de exibição minimizado (ex.: "Caleb H."), publicação só com autorização registrada, fotos fora do repositório. **Fotos antigas continuam no histórico do GitHub** — ver "Correção recomendada". |
| 5 | **Alta** | **Regras do Firestore desconhecidas.** Não estão no repositório. Pelo funcionamento do site, a coleção permite leitura e escrita públicas. | comportamento do `script.js` | `firestore.rules` versionado, negar por padrão, legado `afilhados` somente leitura de admin. **Verificar no Console hoje.** |
| 6 | Média | Sem autenticação/área administrativa; acompanhamento feito pelo Console ou manualmente. | — | `/admin` com Firebase Auth + papéis (admin/operador) validados nas regras. |
| 7 | Média | Bug: `badgeContador` não existe no HTML → `TypeError` a cada atualização em tempo real. | `index.html` x `script.js` | Indicadores reimplementados. |
| 8 | Média | Animação de luzes "piscando" (`blink` 1,5 s) e banner rotativo sem respeito a `prefers-reduced-motion`. | `style.css` | Brilho lento sem flash; todas as animações respeitam movimento reduzido. |
| 9 | Baixa | Fotos associadas pelo nome do arquivo; referência a `images/banner-natal.jpg` inexistente; fontes de terceiros sem fallback. | `style.css`, `script.js` | Fotos por ID, processadas no navegador (redimensionadas e sem EXIF); fontes empacotadas localmente. |
| 10 | Info | `firebaseConfig` no código. **Não é segredo** (identifica o app web), mas sem regras fortes permite acesso direto ao banco. | `script.js` | Configuração via variáveis de ambiente; segurança garantida pelas regras; App Check opcional. Recomenda-se restringir a API key por domínio no Google Cloud Console. |

## Funcionalidades legítimas preservadas
Catálogo em tempo real, escolha de participante disponível, modal com nome e WhatsApp, bloqueio imediato de apadrinhados, ordenação por nome sem acentos, toasts de feedback, responsividade, área de confirmados (agora no painel, sem exposição pública), exportação para Excel (agora com relatórios e filtros).

## Correção recomendada (requer autorização — nada foi feito remotamente)
1. **Imediato:** no Firebase Console do projeto `natal-mk`, conferir as regras do Firestore. Se `afilhados` estiver com leitura pública, após um backup (`npm run backup:legacy`), restringir a leitura (o site 2025 deixará de exibir os cards — a campanha já terminou).
2. **Fotografias no GitHub:** remover `images/` dos próximos commits não apaga o histórico. Opções, em ordem de impacto: tornar o repositório privado; ou reescrever o histórico (`git filter-repo`) e pedir ao GitHub a limpeza de caches. Ambas exigem decisão da organização e do responsável pelo repositório. Esta branch **não** apaga nem reescreve nada.
3. **Site 2025 no Netlify:** manter publicado apenas se a organização desejar; os dados exibidos ali incluem telefones.
