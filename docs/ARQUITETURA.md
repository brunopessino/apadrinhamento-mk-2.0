# Arquitetura técnica

## Decisões
| Tema | Decisão | Justificativa |
|---|---|---|
| Front-end | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + Lucide | Componentização, tipagem e build rápido; sem servidor próprio. |
| Back-end | Firebase (Firestore + Auth) com **Security Rules** como camada de validação no servidor | Funciona no plano gratuito (Spark). Cloud Functions exigiria o plano Blaze (pago); as regras + transação dão a mesma garantia de atomicidade para este fluxo. |
| Concorrência | `runTransaction` + regra `create` em `sponsorships/{participantId}` + `getAfter/existsAfter` | O ID do apadrinhamento é o ID do participante: só pode existir um. A segunda escrita é recusada pelo servidor, mesmo que o navegador seja manipulado. Transações não ficam pendentes offline (falham), então a animação nunca aparece sem confirmação. |
| Fotos | Padrão `inline` (miniatura WebP ≈ 20–60 KB no documento) ou `storage` (Firebase Storage) | Firebase Storage exige plano Blaze (FAQ oficial de set/2024). O modo `storage` está pronto para quando houver autorização. |
| Animação | CSS + SVG próprios (sem bibliotecas) | Leve, compatível com Safari, limpa temporizadores, respeita movimento reduzido. |
| Planilhas | `exceljs` (carregado só no painel) + `papaparse` | Leitura de .xlsx/.csv no navegador; exportação com proteção contra fórmulas. |
| Demo | `DataService` com duas implementações (Firebase e demonstração) | Testes e homologação com dados sintéticos sem tocar na base real. |

## Estrutura
```
src/
  config/campaign.ts      textos, links, Pix (fonte única), créditos
  types/                  modelo de domínio
  lib/                    telefone, texto, protocolo, filtros, CSV seguro, permissões
  services/data/          types.ts (contrato), firebaseService.ts, demoService.ts, demoSeed.ts, shared.ts
  services/               importer.ts, exporter.ts, photos.ts
  hooks/                  DataContext (1 listener compartilhado), reduced motion, clipboard
  components/             ParticipantCard, PixBox, SponsorDialog, ChristmasCelebration, Layout, decor/
  pages/                  Home, Privacy, NotFound, admin/*
firestore.rules  storage.rules  firestore.indexes.json  firebase.json  netlify.toml
scripts/  backup-firestore, migrate-2025, bootstrap-2026, shots, capture-celebration
tests/rules  tests/e2e   (unitários ao lado do código: *.test.ts[x])
```

## Modelo de dados (Firestore)
```
config/app                         { activeCampaignId }                          leitura pública
administrators/{uid}               { role: admin|operator, active, displayName } equipe
auditLogs/{id}                     { campaignId, actorUid, action, targetId, summary, createdAt }  append-only
afilhados/{id}                     LEGADO 2025 — somente leitura admin, nunca alterado
campaigns/{cid}                    { year, name, status: draft|active|closed|archived, textos, guidelines,
                                     deliveryInfo, pix{key,beneficiary}, contato, datas }
  publicParticipants/{pid}         PÚBLICO: displayName, category, age, group, clothingSize, shoeSize,
                                     giftSuggestion, photoData|photoUrl, published, sponsored, sponsoredAt
  participants/{pid}               PRIVADO: fullName, displayName, ..., publicationAuthorized, published,
                                     archived, photoSource, dedupeKey, importJobId, sourceRow, notes
  sponsorships/{pid}               PRIVADO, ativo (1 por participante): sponsorName, sponsorPhone (55DDD...),
                                     protocol MKyy-XXXXXXXX, status confirmed|contacted|received|delivered,
                                     consent, createdAt, contactedAt, receivedAt, deliveredAt, adminNotes
  sponsorshipHistory/{id}          cancelados/liberados (cópia + cancelReason, cancelledBy)
  contributions/{id}               registros manuais de Pix (sem vínculo com participante)
  importJobs/{id}                  histórico de importações
```
- "sponsors" (padrinhos) é derivado de `sponsorships` agrupando por telefone: evita uma segunda escrita na transação pública e mantém a minimização de dados. Uma pessoa pode apadrinhar vários participantes.
- Timestamps: `serverTimestamp()` validado nas regras (`== request.time`).
- Índice composto: `auditLogs (campaignId ASC, createdAt DESC)`.
- Consistência público/privado: somente admins escrevem o documento público (projeção `toPublicFields`, em transação), exceto a transição `sponsored` validada pelas regras. As regras exigem `sponsored == existsAfter(sponsorships/{pid})` em toda escrita administrativa.

## Fluxo de apadrinhamento
1. Formulário valida nome, WhatsApp (máscara + DDD + celular com 9) e ciência LGPD; bloqueia cliques repetidos.
2. Transação: lê campanha (precisa estar `active`) e participante (publicado e disponível).
3. Cria `sponsorships/{pid}` e marca `sponsored: true` atomicamente; regras revalidam tudo.
4. Resposta OK → painel de sucesso → `ChristmasCelebration` (somente aqui). Recusa → "Este participante acabou de ser apadrinhado…" sem animação. Erro de rede → mensagem e nova tentativa, sem animação.
5. Listener em tempo real atualiza cards e indicadores de todos os visitantes.

## Segurança e privacidade
Separação público/privado por coleção; regras negam por padrão; papéis validados no servidor; logs imutáveis; XSS mitigado pelo React (sem `dangerouslySetInnerHTML`); CSP, HSTS, `X-Frame-Options` e `noindex` em `/admin` (`netlify.toml`); exportações com neutralização de fórmulas; fotos recodificadas (sem EXIF/GPS); App Check opcional (nunca substitui as regras).

**Limitação conhecida:** sem Cloud Functions não há rate limiting por IP. Mitigações: App Check (reCAPTCHA v3), regras estritas, cancelamento administrativo em 1 clique com histórico. Com o plano Blaze autorizado, é possível mover o apadrinhamento para uma Function com limite por telefone/IP.
