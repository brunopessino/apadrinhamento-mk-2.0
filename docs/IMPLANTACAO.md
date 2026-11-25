# Implantação, migração, backup e rollback

> Nada foi publicado, nenhuma regra foi enviada e nenhum serviço externo foi alterado. Cada passo marcado com 🔐 exige autorização expressa da organização.

## 0. Custos (verificar antes)
| Serviço | Plano necessário | Observação |
|---|---|---|
| Firestore + Authentication (e-mail/senha) | Spark (gratuito) atende ao volume da campanha | Cotas diárias gratuitas de leituras/escritas; o catálogo usa **um** listener por visitante. |
| Firebase Storage | **Blaze (pago)** | Exigido para buckets padrão desde a mudança anunciada em set/2024. Por isso o padrão é `VITE_PHOTO_MODE=inline`. |
| Cloud Functions | **Blaze (pago)** | Não utilizado. |
| App Check (reCAPTCHA v3) | Opcional | Conferir cotas do reCAPTCHA antes de ativar. |
| Netlify | Plano atual do site | Conferir limites de build/banda do plano no painel do Netlify. |

## 1. Escolha do projeto Firebase
**Recomendado:** um projeto de **homologação** novo (ex.: `natal-mk-homolog`) e, para produção, **um projeto novo para 2026** (ex.: `natal-mk-2026`).
- Zero risco para os registros de 2025 (o projeto `natal-mk` continua como está até haver decisão).
- O histórico 2025 permanece no projeto antigo (mais o backup JSON). Se desejado, `migrate-2025` o organiza como campanha arquivada **dentro do próprio projeto antigo**, sem alterar `afilhados`.

Alternativa: reutilizar `natal-mk`. Funciona — as regras preservam `afilhados` como somente leitura administrativa — mas **ao publicar as regras o site 2025 deixa de ler os dados** (comportamento desejado após o fim da campanha, mas é uma mudança de produção 🔐).

## 2. Homologação (passo a passo)
1. Criar projeto Firebase de homologação (Spark). Ativar Firestore (região `southamerica-east1` sugerida) e Authentication › E-mail/senha.
2. Registrar um app Web e copiar os valores para `.env.local` (ver `.env.example`).
3. `npm ci && npm run test && npm run test:rules` — **os testes de regras precisam rodar com o emulador antes de qualquer deploy** (Java 11+).
4. `npx firebase login && npx firebase use --add` (alias `staging`).
5. `npx firebase deploy --only firestore:rules,firestore:indexes --project staging`
6. Criar o usuário administrador em Authentication, copiar o UID e executar:
   `FIREBASE_PROJECT_ID=natal-mk-homolog GOOGLE_APPLICATION_CREDENTIALS=~/fora-do-repo/sa.json ADMIN_UID=<uid> node scripts/bootstrap-2026.mjs --apply`
7. `npm run dev` → `/admin` → importar a planilha 2026, registrar autorizações, publicar, testar apadrinhamento em dois navegadores.
8. Netlify: deploy previews e branch deploys desta branch já sobem em **modo demonstração** (`netlify.toml`). Para homologar com Firebase, criar um site Netlify separado apontando para a branch, com as variáveis `VITE_FIREBASE_*` do projeto de homologação.

## 3. Produção 🔐
Pré-requisitos: autorização da organização para (a) divulgação pública da chave Pix e do nome da favorecida, (b) política de privacidade, (c) publicação dos participantes autorizados.
1. Backup do projeto antigo: `FIREBASE_PROJECT_ID=natal-mk GOOGLE_APPLICATION_CREDENTIALS=... npm run backup:legacy` (gera `backups/*.json`, ignorado pelo git; guardar em local seguro).
2. (Opcional, no projeto `natal-mk`) Organizar o histórico 2025: simular com `npm run migrate:2025`; gravar com `-- --apply`. O script só **cria** documentos (`legacy-<id>`) em `campaigns/2025`, nunca altera `afilhados`.
3. Deploy das regras/índices no projeto de produção.
4. Bootstrap (campanha 2026 em rascunho + admin). Configurar textos, entrega e Pix em `/admin/campanhas`; mudar status para **Aberta**.
5. No Netlify do site oficial: definir `VITE_DATA_MODE=firebase` e as variáveis `VITE_*`; publicar a branch (merge em `main` ou "Deploy branch") somente após aprovação.
6. Restringir a API key (Google Cloud Console › Credenciais) aos domínios do site; opcionalmente ativar App Check.

## 4. Backup contínuo
- Durante a campanha: `npm run backup:legacy` (nome genérico; exporta qualquer projeto) semanalmente, ou export gerenciado `gcloud firestore export` (exige Blaze).
- Relatórios em Excel pelo painel como cópia operacional.

## 5. Rollback
| Situação | Ação |
|---|---|
| Problema visual/funcional no site | Netlify › Deploys › "Publish deploy" no deploy anterior (instantâneo). |
| Regras com problema | Firebase Console › Firestore › Regras › histórico › restaurar versão anterior. |
| Dados | Nenhuma operação do sistema apaga dados: cancelamentos vão para `sponsorshipHistory`, participantes são arquivados, logs são imutáveis. Restauração a partir de `backups/*.json` quando necessário (manual, com admin SDK). |
| Voltar ao site 2025 | O código está no repositório original (`apadrinhamento-mk`); republicar o deploy antigo no Netlify. |

## 6. Encerramento da campanha
`/admin/campanhas` → status **Encerrada** (site continua mostrando cards, sem novos apadrinhamentos) → depois **Arquivada** (sai do ar; dados ficam como histórico). Definir prazo de retenção dos telefones com a organização (política de privacidade).
