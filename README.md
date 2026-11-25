# 🎄 Apadrinhamento MK 2.0 — Natal 2026

> *Compartilhe amor e veja o Natal se multiplicar em sorrisos.*

Plataforma da campanha de Apadrinhamento de Natal do **Meu Kantinho Centro de Cultura**: catálogo de participantes em tempo real, apadrinhamento sem cadastro com garantia de unicidade no servidor, celebração natalina na confirmação, painel administrativo completo, importação do Google Forms, relatórios e suporte a várias campanhas.

![Sequência da animação de confirmação](evidence/animacao/sequencia.png)

## Destaques
- **Catálogo** com busca, filtros (categoria, turma, faixa etária, disponibilidade), ordenação e indicadores reais em tempo real.
- **Mensagem Pix integral em todos os cards**, com botão "Copiar chave Pix" — valores em uma única configuração (`src/config/campaign.ts` / campanha no painel).
- **Apadrinhamento atômico:** transação Firestore + Security Rules; duas confirmações simultâneas nunca são aceitas.
- **Christmas Celebration:** caixa de presente em SVG/CSS que se abre com brilho dourado, estrelas, notas musicais, flocos e confetes; só após confirmação do servidor; versão estática para movimento reduzido.
- **Privacidade:** dados públicos e privados em coleções separadas; telefones de padrinhos nunca são públicos; publicação de participantes só com autorização.
- **Painel `/admin`:** papéis admin/operador, participantes, fotos, apadrinhamentos, padrinhos, contribuições Pix, campanhas, importação XLSX/CSV, relatórios Excel/CSV/impressão e histórico de alterações.
- **Responsivo** de 320 px a 1920 px (1 a 4 colunas), acessível (WCAG 2.2 AA como meta).

## Começando
```bash
npm ci
npm run dev:demo        # demonstração com dados sintéticos (sem Firebase)
#   admin: admin@demo.mk / demo-admin   ·   operador: operador@demo.mk / demo-operador
cp .env.example .env.local   # preencher VITE_FIREBASE_* para usar o Firebase
npm run dev
```

| Script | O que faz |
|---|---|
| `npm run build` / `build:demo` | Build de produção (Firebase) / demonstração (`dist-demo`) |
| `npm test` | Testes unitários e de componentes (Vitest) |
| `npm run test:e2e` | Ponta a ponta (Playwright) contra o build de demonstração |
| `npm run test:rules` | Security Rules no Firebase Emulator (Java 11+) |
| `npm run backup:legacy` | Backup somente leitura do Firestore para `backups/` |
| `npm run migrate:2025` | Migração não destrutiva do legado 2025 (simulação; `-- --apply` grava) |

## Documentação
- [Auditoria da versão 2025](docs/AUDITORIA.md) — riscos encontrados e correções
- [Arquitetura e modelo de dados](docs/ARQUITETURA.md)
- [Implantação, migração, backup e rollback](docs/IMPLANTACAO.md)
- [Manual administrativo](docs/MANUAL-ADMIN.md)
- [Relatório de alterações e pendências](docs/RELATORIO-ALTERACOES.md)
- [Evidências de testes](evidence/TESTES.md)

## Estrutura
`src/` aplicação · `firestore.rules`, `storage.rules`, `firestore.indexes.json` · `netlify.toml` · `scripts/` · `tests/` · `docs/` · `evidence/`.
A versão 2025 permanece no repositório original: [brunopessino/apadrinhamento-mk](https://github.com/brunopessino/apadrinhamento-mk).

## Créditos
Apadrinhamento MK 2.0 (2026) e projeto original (2025) por **Bruno Pessino** — [GitHub](https://github.com/brunopessino) · [LinkedIn](https://linkedin.com/in/brunopessino).
Meu Kantinho Centro de Cultura — fundado em 1998 por Cloves do Violão · [site](https://www.meukantinho.com.br/) · [Instagram](https://www.instagram.com/meukantinho_oficial/).
O projeto de 2025 está em [brunopessino/apadrinhamento-mk](https://github.com/brunopessino/apadrinhamento-mk).
