# Manual administrativo — Apadrinhamento MK 2.0

Acesso: link discreto "Área da equipe" no rodapé ou `/admin`. Cada pessoa usa seu próprio e-mail e senha (criados pela administração no Firebase).

## Papéis
| Ação | Administrador | Operador |
|---|:-:|:-:|
| Ver painel, participantes, apadrinhamentos e padrinhos | ✓ | ✓ |
| Cadastrar/editar participante **não publicado** | ✓ | ✓ |
| Editar participante publicado, publicar/despublicar, arquivar | ✓ | — |
| Atualizar status (contato, recebido, entregue) e observações | ✓ | ✓ |
| Cancelar apadrinhamento e liberar participante | ✓ | — |
| Registrar contribuição Pix / remover registro | ✓ / ✓ | ✓ / — |
| Importar planilha, gerenciar campanhas, ver histórico de alterações | ✓ | — |
| Exportar relatórios com dados pessoais | ✓ | — (só relatórios sem dados de padrinhos) |

## Rotina recomendada
1. **Campanhas** → criar/editar 2026: textos, orientações, informações de entrega (deixe vazio enquanto não houver data definida), contato, Pix. Status **Aberta** e **Definir como ativa**.
2. **Importação** → selecionar a campanha de destino, enviar o .xlsx/.csv baixado do Google Planilhas, conferir o mapeamento de colunas, inconsistências e duplicidades, confirmar. Tudo entra como **não publicado**. Se o arquivo for de 2025, o sistema alerta e exige confirmação explícita.
3. **Participantes** → para cada pessoa: conferir dados, ajustar o **nome de exibição** (padrão: primeiro nome + inicial), marcar **Autorização de exposição** somente quando houver autorização do participante ou responsável, enviar foto (botão câmera) e clicar **Publicar**.
   - Fotos do Google Forms ficam em links do Drive; baixe com a conta autorizada e envie pelo painel. O sistema reduz, comprime e remove metadados.
4. **Apadrinhamentos** → acompanhar; botão WhatsApp abre conversa individual (não há envio automático); mudar status para *Contato realizado → Presente recebido → Entregue*; observações internas.
   - **Cancelar** pede justificativa, guarda o registro em "Cancelados / liberados" e devolve o participante ao catálogo.
5. **Contribuições Pix** → registrar somente o que foi identificado no extrato. Não há conferência bancária automática e nenhuma contribuição reserva participante.
6. **Relatórios** → escolher relatório e filtros; Excel, CSV ou Impressão. Arquivos trazem campanha e data de geração.
7. **Histórico** → trilha de todas as ações (quem, quando, o quê).

## Boas práticas de privacidade
- Nunca compartilhar planilhas exportadas em grupos públicos; apagar arquivos locais após o uso.
- Não publicar participantes sem autorização registrada.
- Pedidos de remoção: despublicar/arquivar o participante e registrar o motivo nas observações.
