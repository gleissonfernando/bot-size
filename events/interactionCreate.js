const {
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');
const { isGerencia } = require('../utils/permissions');
const { sendStaffLog, notifyError, sendUpdateLog } = require('../utils/notifications');

// IDs fixos
const CATEGORIA_ID       = '1497388763054342244';
const CARGO_APROVADO     = '1490151003864043570';
const CARGO_FORMULARIO   = '1497394597746315355';
const CARGO_TESTE_ID     = '1497405005802635374';

const CANAIS_AUTORIZADOS = [
    '1497421574108745728',
    '1497368376920772628'
];

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        const { client } = interaction;

        // ─── Logs de Comandos ────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const restrictedCommands = new Set(['set', 'painel']);
            
            if (restrictedCommands.has(interaction.commandName) && !CANAIS_AUTORIZADOS.includes(interaction.channelId)) {
                await interaction.reply({
                    content: `❌ Este comando só pode ser utilizado nos canais de comandos autorizados: <#${CANAIS_AUTORIZADOS[0]}> ou <#${CANAIS_AUTORIZADOS[1]}>.`,
                    ephemeral: true
                });
                return;
            }

            // Log de uso de comando
            await sendStaffLog(client, '⌨️ Comando Utilizado', `O comando \`/${interaction.commandName}\` foi executado por <@${interaction.user.id}> no canal <#${interaction.channelId}>.`);

            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            
            try { 
                await command.execute(interaction); 
            } catch (err) { 
                console.error(err);
                await notifyError(client, err, `Execução do comando /${interaction.commandName}`);
                if (interaction.deferred || interaction.replied) {
                    await interaction.followUp({ content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true });
                } else {
                    await interaction.reply({ content: '❌ Ocorreu um erro ao executar este comando.', ephemeral: true });
                }
            }
            return;
        }

        const painelCommand = client.commands.get('painel');

        // Lida com Botões do Painel
        if (interaction.isButton() && painelCommand && typeof painelCommand.handleButton === 'function') {
            const painelButtonIds = [
                'tab_stats', 'tab_roles', 'tab_config', 'add_role_btn', 'list_roles_btn', 
                'remove_role_modal_btn', 'edit_staff_channel', 'edit_cargo_morador', 
                'edit_cargo_membro', 'edit_category'
            ];
            
            // Botão de Teste do Sistema
            if (interaction.customId === 'test_system_btn') {
                if (!interaction.member.roles.cache.has(CARGO_TESTE_ID)) {
                    return interaction.reply({ 
                        content: '❌ **Acesso Negado:** Você não possui o cargo necessário para realizar testes no sistema.', 
                        ephemeral: true 
                    });
                }

                await interaction.deferReply({ ephemeral: true });

                try {
                    const testEmbed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🧪 Teste de Sistema')
                        .setDescription('Esta é uma mensagem de teste enviada via Painel Administrativo.')
                        .addFields({ name: 'Solicitado por', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` })
                        .setTimestamp();

                    await interaction.user.send({ embeds: [testEmbed] });
                    
                    await sendUpdateLog(client, 'Teste de Sistema Executado', `O usuário <@${interaction.user.id}> executou um teste de sistema. Uma DM de teste foi enviada com sucesso.`, '#FEE75C');
                    
                    await interaction.editReply({ content: '✅ **Sucesso:** A mensagem de teste foi enviada para o seu privado e o log foi gerado.' });
                } catch (err) {
                    await interaction.editReply({ content: '❌ **Erro:** Não consegui enviar a mensagem para o seu privado. Verifique se suas DMs estão abertas.' });
                    await notifyError(client, err, 'Botão de Teste do Sistema');
                }
                return;
            }

            if (painelButtonIds.includes(interaction.customId)) {
                try {
                    await painelCommand.handleButton(interaction);
                } catch (err) {
                    await notifyError(client, err, 'Botão do Painel');
                }
                return;
            }
        }

        // Lida com Modais do Painel
        if (interaction.isModalSubmit() && painelCommand && typeof painelCommand.handleModal === 'function') {
            const painelModalIds = [
                'modal_add_role', 'modal_remove_role', 'modal_edit_staff_channel', 
                'modal_edit_cargo_morador', 'modal_edit_cargo_membro', 'modal_edit_category'
            ];
            if (painelModalIds.includes(interaction.customId)) {
                try {
                    await painelCommand.handleModal(interaction);
                } catch (err) {
                    await notifyError(client, err, 'Modal do Painel');
                }
                return;
            }
        }

        // Lida com Select Menus do Painel
        if (interaction.isStringSelectMenu() && painelCommand && typeof painelCommand.handleSelectMenu === 'function') {
            if (interaction.customId === 'remove_role_select') {
                try {
                    await painelCommand.handleSelectMenu(interaction);
                } catch (err) {
                    await notifyError(client, err, 'Select Menu do Painel');
                }
                return;
            }
        }

        // ─── Botão: Iniciar Recrutamento ──────────────────────────
        if (interaction.isButton() && interaction.customId === 'size_set_start') {
            await sendStaffLog(client, '📝 Formulário Iniciado', `O usuário <@${interaction.user.id}> iniciou o preenchimento do formulário.`, '#FEE75C');

            const modal = new ModalBuilder()
                .setCustomId('size_modal_form')
                .setTitle('🎮  Formulário: Morador');

            const fields = [
                { id: 'campo_nome', label: 'NOME (IC)', placeholder: 'Ex: Rafael' },
                { id: 'campo_id', label: 'ID NO GAME', placeholder: 'Ex: 222' },
                { id: 'campo_indicacao', label: 'QUEM TE INDICOU?', placeholder: 'Nick de quem te indicou' },
                { id: 'campo_idade', label: 'SUA IDADE', placeholder: 'Ex: 18' }
            ];

            fields.forEach(f => {
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId(f.id).setLabel(f.label).setPlaceholder(f.placeholder).setStyle(TextInputStyle.Short).setRequired(true)
                ));
            });

            await interaction.showModal(modal);
            return;
        }

        // ─── Modal: Envio de Respostas ────────────────────────────
        if (interaction.isModalSubmit() && interaction.customId === 'size_modal_form') {
            try {
                const nome      = interaction.fields.getTextInputValue('campo_nome');
                const id        = interaction.fields.getTextInputValue('campo_id');
                const novoNick  = `${id} ${nome}`;
                const membro    = interaction.member;

                await interaction.deferReply({ ephemeral: true });

                await sendStaffLog(client, '📩 Ficha Enviada', `O usuário <@${membro.id}> enviou a ficha.\n**Nick:** ${novoNick}`, '#57F287');

                try { await membro.setNickname(novoNick); } catch {}
                try { await membro.roles.add(CARGO_FORMULARIO); } catch {}

                const canal = await interaction.guild.channels.create({
                    name: `📋・${id}-${nome}`.toLowerCase(),
                    type: ChannelType.GuildText,
                    parent: CATEGORIA_ID,
                    permissionOverwrites: [
                        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: membro.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                    ]
                });

                const embedFicha = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setAuthor({ name: 'Size — Ficha de Recrutamento', iconURL: interaction.guild.iconURL({ dynamic: true }) })
                    .setTitle(`📋  Ficha de ${novoNick}`)
                    .setDescription(`> Ficha enviada por <@${membro.id}>. Analise e tome uma decisão abaixo.`)
                    .addFields(
                        { name: '👤 Nome (IC)',     value: `\`${nome}\``,      inline: true },
                        { name: '🎮 ID no Game',    value: `\`${id}\``,        inline: true },
                        { name: '🆔 Discord',       value: `<@${membro.id}>`,  inline: true }
                    )
                    .setFooter({ text: 'Size Recrutamento' })
                    .setTimestamp();

                const rowDecisao = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`aprovar_${membro.id}`).setLabel('✅  Aprovar').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`reprovar_${membro.id}`).setLabel('❌  Reprovar').setStyle(ButtonStyle.Danger)
                );

                await canal.send({ embeds: [embedFicha], components: [rowDecisao] });
                await interaction.editReply({ content: `✅ Sua ficha foi enviada com sucesso! Aguarde a análise da staff.` });
            } catch (err) {
                await notifyError(client, err, 'Processamento de Formulário');
            }
            return;
        }

        // ─── Botões: Aprovar / Reprovar ───────────────────────────
        if (interaction.isButton() && (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('reprovar_'))) {
            try {
                if (!isGerencia(interaction)) {
                    await interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
                    return;
                }

                const action = interaction.customId.startsWith('aprovar_') ? 'Aprovada' : 'Reprovada';
                const color = action === 'Aprovada' ? '#57F287' : '#ED4245';
                const membroId = interaction.customId.split('_')[1];
                const membro   = await interaction.guild.members.fetch(membroId).catch(() => null);

                await interaction.deferUpdate();

                await sendStaffLog(client, `⚖️ Decisão de Recrutamento: ${action}`, `A ficha de <@${membroId}> foi **${action}** por <@${interaction.user.id}>.`, color);

                if (membro) {
                    try { await membro.roles.remove(CARGO_FORMULARIO); } catch {}
                    if (action === 'Aprovada') try { await membro.roles.add(CARGO_APROVADO); } catch {}

                    try {
                        const dmEmbed = new EmbedBuilder()
                            .setColor(color)
                            .setTitle(action === 'Aprovada' ? '✅ Parabéns!' : '❌ Resultado')
                            .setDescription(`Olá, **${membro.displayName}**! Sua ficha foi **${action.toLowerCase()}** pela staff da **Size**.`)
                            .setTimestamp();
                        await membro.send({ embeds: [dmEmbed] });
                    } catch {}
                }

                const embedResult = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`✅ Ficha ${action}`)
                    .setDescription(`<@${membroId}> foi ${action.toLowerCase()} por <@${interaction.user.id}>.`)
                    .setTimestamp();

                await interaction.message.edit({ embeds: [embedResult], components: [] });
                if (action === 'Reprovada') setTimeout(async () => { try { await interaction.channel.delete(); } catch {} }, 5000);
            } catch (err) {
                await notifyError(client, err, 'Aprovação/Reprovação');
            }
            return;
        }
    }
};
