# Evidências de testes (executados em 25/11/2026)

| Suíte | Resultado | Arquivo |
|---|---|---|
| TypeScript (`tsc --noEmit`) | sem erros | `unit-tests.txt` |
| Unitários e componentes (Vitest) | **37/37 aprovados** | `unit-tests.txt` |
| Ponta a ponta (Playwright, Chromium, build demo) | **25/25 aprovados** (+ 51/51 em 3 repetições de admin/público, sem instabilidade) | `e2e-tests.txt` |
| Build de produção | concluído | `build-producao.txt` |
| Security Rules (emulador) | **17/17 aprovados** — executado em 26/11/2026 na máquina do desenvolvedor (Windows, Node 24, Java 25, emulador Firestore 1.22.0) | `rules-tests.txt` |

## Cobertura dos itens exigidos
Página inicial · catálogo · busca e filtros · cards · Pix integral em todos os cards (disponíveis e apadrinhados) · cópia da chave · validação do formulário · confirmação · tentativas simultâneas (camada de dados: 10 em paralelo → 1; E2E: duas abas) · prevenção de duplicidade · tempo real entre abas · animação após sucesso · ausência de animação em conflito e erro de rede · animação única por protocolo · movimento reduzido · confirmação mantida se a animação falhar · limpeza de timers/desmontagem · login, conta sem permissão · permissões admin × operador · importação (mapeamento, duplicidades, alerta 2025→2026, registros não publicados) · exportação CSV/Excel · cancelamento e liberação · dados públicos sem nome completo/telefone · campanha 2025 isolada · responsividade em 320, 375, 390, 430, 768, 1024, 1440 e 1920 px (sem rolagem horizontal, colunas 1/1/1/1/2/3/4/4, alvos de toque ≥ 36 px, modal dentro da tela).

## Capturas
- `screenshots/home-*.png`, `catalogo-*.png`, `formulario-*.png` — 8 larguras
- `screenshots/admin-*.png` — painel, participantes, apadrinhamentos
- `animacao/sequencia.png`, `animacao/sequencia.gif`, `animacao/frame-*.png`, `animacao/confirmacao-final.png`

Todas as telas usam dados e ilustrações **sintéticos**.
