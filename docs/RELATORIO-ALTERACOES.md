# Relatório de alterações — branch `feature/mk-2.0-2026`

## Feito
- Repositório novo e separado; o repositório 2025 não foi alterado. Logotipo institucional reaproveitado em `public/brand/`.
- Nova aplicação React + TypeScript + Vite + Tailwind; identidade natalina própria (fita com laço, ramos de pinheiro, varal de luzes discretas, notas musicais), Playfair Display + Manrope empacotadas localmente.
- Landing page, indicadores reais, "Como participar" com Pix, seção institucional, rodapé com contato configurável, créditos e política de privacidade.
- Catálogo com filtros/ordenação/estados (carregando, vazio, sem resultado, erro, offline, campanha encerrada).
- Cards com foto 4:5, placeholder institucional, selo "Apadrinhado" animado, bloco Pix obrigatório.
- Fluxo de apadrinhamento com máscara/validação de WhatsApp, ciência LGPD, transação atômica, mensagem oficial de conflito, protocolo `MK26-XXXXXXXX`, compartilhamento (WhatsApp, Facebook, copiar link) sem dados pessoais.
- `ChristmasCelebration` (≈3,2 s, uma vez por protocolo, pular, limpeza de timers, orçamento de partículas por dispositivo, boundary de erro, versão estática).
- Celebração coletiva quando 100% dos publicados forem apadrinhados (uma vez por sessão).
- Painel administrativo completo, com permissões espelhadas nas regras e trilha de auditoria.
- Importação XLSX/CSV com mapeamento, pré-visualização, validação, duplicidades (nome+idade+turma), alerta de ano, lote e histórico.
- Exportações Excel/CSV/impressão de 10 relatórios, com filtros e neutralização de fórmulas.
- Fotos processadas no navegador (orientação, redimensionamento, WebP, sem EXIF); modo `inline` (gratuito) ou `storage` (Blaze).
- Regras Firestore/Storage, índice, `firebase.json`, `netlify.toml` com cabeçalhos de segurança, `robots.txt`, `.env.example`.
- Scripts: backup somente leitura, migração 2025 não destrutiva e idempotente, bootstrap 2026 sem sobrescrita.
- Testes: 37 unitários/componentes, 25 E2E (inclui 8 larguras), suíte de regras para o emulador.

## Revisão independente de segurança (aplicada)
Uma revisão separada das regras e do serviço Firebase (sem ver o restante do trabalho) não encontrou forma de burlar as regras e apontou defeitos, todos corrigidos:
- Sincronização do documento público agora roda em transação e deriva `sponsored` do apadrinhamento existente; as regras impõem essa invariante também para administradores (impede um participante "travado").
- Edição não sobrescreve mais `createdAt`/`sponsoredAt`.
- Rotas de Importação, Campanhas e Histórico bloqueadas também por URL para operadores; importação recusada no serviço para não administradores.
- Operador não apaga mais a foto pública; fotos públicas do Storage são removidas ao despublicar/arquivar/remover foto e não podem ser listadas.
- Documentos públicos só são legíveis em campanhas abertas ou encerradas; logs de auditoria validam o papel declarado.
- Testes de regras ampliados (cancelamento real seguido de novo apadrinhamento, invariante admin, campanha arquivada, papel no log).

## Pendências e decisões que dependem da organização
1. **Autorização para publicar a chave Pix e o nome da favorecida.** Mantidos exatamente como fornecidos. Observação: a chave `07152890714` tem formato de CPF; publicá-la em todos os cards expõe um documento pessoal. Se preferirem, uma chave aleatória ou e-mail pode substituí-la pelo painel (Campanhas › Pix) sem mudar código.
2. **Regras de segurança não foram executadas aqui:** o ambiente bloqueou o download do Firebase Emulator. A suíte `tests/rules` está pronta e **deve passar** (`npm run test:rules`) antes de qualquer deploy.
3. **Modo Firebase não foi exercitado de ponta a ponta** (sem credenciais neste ambiente). Todo o fluxo foi validado no modo de demonstração, que implementa as mesmas regras de negócio; homologar no projeto de teste (docs/IMPLANTACAO.md §2).
4. **Navegadores:** testes automatizados rodaram só no Chromium. Safari (iPhone/iPad), Firefox e Edge: checar manualmente na homologação (fluxo, animação, cópia do Pix).
5. **Lighthouse** não foi executado. Build: JS inicial ≈ 99 KB gzip + Firebase ≈ 180 KB gzip; Excel só no painel.
6. **Google Sheets direto:** não implementado (exigiria OAuth do Google). Caminho suportado: baixar .xlsx/.csv e importar.
7. **Fotos do Google Drive:** download manual pela conta autorizada e envio pelo painel.
8. **Rate limiting por IP:** impossível sem Cloud Functions (Blaze). Mitigado por regras, App Check opcional e cancelamento administrativo.
9. Contato institucional, datas/local de entrega e prazo de retenção de dados: não informados — campos ficam vazios até a organização definir.
10. Política de privacidade é texto-base; precisa de validação institucional/jurídica.
11. Logotipo disponível apenas em 500 px; uma versão vetorial melhoraria a nitidez.
12. Fotografias de participantes no histórico público do GitHub (docs/AUDITORIA.md) — decisão sobre tornar o repositório privado.
