[x] Remover pasta frontend/
[x] Remover pasta backend/
[x] Remover tratamento duplicado de interactionCreate
[x] Ajustar config/config.js para recrutamento VSYNC/Size
[x] Criar comando /set (embed + botão)
[x] Implementar fluxo botão -> select -> modal -> staff
sempor[x] Implementar Aprovar/Recusar com segurança
[x] Registrar comandos no Discord
[x] Teste crítico do fluxo base
[x] Adicionar script start no package.json (`"start": "node index.js"`)
[x] Validar inicialização com `npm start`
[ ] Expandir index.js para controlar bot + API Express completa
[ ] Adicionar proteção e sanitização básica de endpoints administrativos
[ ] Endurecer .gitignore para evitar vazamento de segredos/artefatos sensíveis
[x] Testar subida do bot/API com npm start (Sincronizado via Manus)
[ ] Testar endpoints críticos da API com curl
[x] Criar utils/permissions.js (cadastro + acesso gerência/painel por user.id/cargo)
[x] Atualizar config/config.js com listas de autorizados e cargos de gerência
[x] Proteger /set com verificação de cadastro/permissão
[x] Proteger /painel com verificação de cadastro/permissão (somente gerência)
[x] Proteger botões aprovar/reprovar em interactionCreate.js (somente gerência)
[ ] Testar validações de permissão e respostas ephemeral
[x] Painel: adicionar botão para listar cargos cadastrados
[x] Painel: adicionar modo de remover cargo por ID (modal)
[ ] Painel: validar fluxo de listar/remover cargos no Discord
