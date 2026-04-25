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
const config = require('../config/config');

const CATEGORIA_ID       = '1497388763054342244';
const CARGO_APROVADO     = '1490151003864043570';
const CARGO_FORMULARIO   = '1497394597746315355';

// Canais autorizados para os comandos /set e /painel
const CANAIS_AUTORIZADOS = [
    '1497421574108745728',
    '1497368376920772628'
];

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {

        // ─── Comando slash ───────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const restrictedCommands = new Set(['set', 'painel']);
            
            // Verifica se o comando está na lista de restritos e se o canal é autorizado
            if (restrictedCommands.has(interaction.commandName) && !CANAIS_AUTORIZADOS.includes(interaction.channelId)) {
                await interaction.reply({
                    content: `❌ Este comando só pode ser utilizado nos canais de comandos autorizados: <#${CANAIS_AUTORIZADOS[0]}> ou <#${CANAIS_AUTORIZADOS[1]}>.`,
                    ephemeral: true
                });
                return;
            }

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try { await command.execute(interaction); } catch (err) { console.error(err); }
            return;
        }

        // ─── Botões/Modais do painel ─────────────────────────────
        const painelCommand = interaction.client.commands.get('painel');

        if (interaction.isButton() && painelCommand && typeof painelCommand.handleButton === 'function') {
            const painelButtonIds = [
                'tab_stats',
                'tab_roles',
                'tab_config',
                'add_role_btn',
                'edit_staff_channel',
                'edit_cargo_morador',
                'edit_cargo_membro',
                'edit_category'
            ];
            const isPainelButton =
                painelButtonIds.includes(interaction.customId) ||
                interaction.customId.startsWith('remove_role_');

            if (isPainelButton) {
                await painelCommand.handleButton(interaction);
                return;
            }
        }

        if (interaction.isModalSubmit() && painelCommand && typeof painelCommand.handleModal === 'function') {
            const painelModalIds = [
                'modal_add_role',
                'modal_edit_staff_channel',
                'modal_edit_cargo_morador',
                'modal_edit_cargo_membro',
                'modal_edit_category'
            ];
            if (painelModalIds.includes(interaction.customId)) {
                await painelCommand.handleModal(interaction);
                return;
            }
        }

        // ─── Botão: abrir modal (Recrutamento) ───────────────────
        if (interaction.isButton() && interaction.customId === 'size_set_start') {
            const modal = new ModalBuilder()
                .setCustomId('size_modal_form')
                .setTitle('🎮  Formulário: Morador');

            const nomeInput = new TextInputBuilder()
                .setCustomId('campo_nome')
                .setLabel('NOME (IC)')
                .setPlaceholder('Ex: Rafael')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const idInput = new TextInputBuilder()
                .setCustomId('campo_id')
                .setLabel('ID NO GAME')
                .setPlaceholder('Ex: 222')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const indicacaoInput = new TextInputBuilder()
                .setCustomId('campo_indicacao')
                .setLabel('QUEM TE INDICOU?')
                .setPlaceholder('Nick de quem te indicou')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const idadeInput = new TextInputBuilder()
                .setCustomId('campo_idade')
                .setLabel('SUA IDADE')
                .setPlaceholder('Ex: 18')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(indicacaoInput),
                new ActionRowBuilder().addComponents(idadeInput)
            );

            await interaction.showModal(modal);

            try {
                const logsChannel = await interaction.guild.channels.fetch(config.logsChannelId).catch(() => null);
                if (logsChannel && logsChannel.isTextBased()) {
                    const embedLogAbertura = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('📝 Formulário aberto')
                        .setDescription('Um usuário abriu o formulário de recrutamento.')
                        .addFields(
                            { name: 'Usuário', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)`, inline: true },
                            { name: 'Canal', value: `<#${interaction.channelId}>`, inline: true },
                            { name: 'Ação', value: 'Clique no botão **Iniciar Recrutamento**', inline: false }
                        )
                        .setTimestamp();

                    await logsChannel.send({ embeds: [embedLogAbertura] });
                }
            } catch {}

            return;
        }

        // ─── Modal: receber respostas ────────────────────────────
        if (interaction.isModalSubmit() && interaction.customId === 'size_modal_form') {
            const nome      = interaction.fields.getTextInputValue('campo_nome');
            const id        = interaction.fields.getTextInputValue('campo_id');
            const indicacao = interaction.fields.getTextInputValue('campo_indicacao');
            const idade     = interaction.fields.getTextInputValue('campo_idade');
            const novoNick  = `${id} ${nome}`;
            const membro    = interaction.member;

            await interaction.deferReply({ ephemeral: true });

            // 1. Renomeia o usuário
            try { await membro.setNickname(novoNick); } catch {}

            // 2. Dá o cargo de formulário enviado
            try { await membro.roles.add(CARGO_FORMULARIO); } catch {}

            // 3. Cria o canal privado na categoria
            const canal = await interaction.guild.channels.create({
                name: `📋・${id}-${nome}`.toLowerCase(),
                type: ChannelType.GuildText,
                parent: CATEGORIA_ID,
                permissionOverwrites: [
                    {
                        // Nega para @everyone
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        // Permite só para o usuário pelo ID dele
                        id: membro.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    {
                        // Permite para o bot
                        id: interaction.client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ReadMessageHistory,
                            PermissionFlagsBits.ManageChannels
                        ]
                    }
                ]
            });

            // 4. Embed com os dados no canal criado
            const embedFicha = new EmbedBuilder()
                .setColor('#5865F2')
                .setAuthor({
                    name: 'Size — Ficha de Recrutamento',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTitle(`📋  Ficha de ${novoNick}`)
                .setDescription(`> Ficha enviada por <@${membro.id}>. Analise e tome uma decisão abaixo.`)
                .addFields(
                    { name: '👤 Nome (IC)',     value: `\`${nome}\``,      inline: true },
                    { name: '🎮 ID no Game',    value: `\`${id}\``,        inline: true },
                    { name: '📅 Idade',         value: `\`${idade}\``,     inline: true },
                    { name: '🔗 Indicado por',  value: `\`${indicacao}\``, inline: true },
                    { name: '🏷️ Apelido',      value: `\`${novoNick}\``,  inline: true },
                    { name: '🆔 Discord',       value: `<@${membro.id}>`,  inline: true }
                )
                .setFooter({ text: 'Size Recrutamento  •  Aguardando decisão da staff' })
                .setTimestamp();

            const rowDecisao = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprovar_${membro.id}`)
                    .setLabel('✅  Aprovar')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`reprovar_${membro.id}`)
                    .setLabel('❌  Reprovar')
                    .setStyle(ButtonStyle.Danger)
            );

            await canal.send({ embeds: [embedFicha], components: [rowDecisao] });

            // 5. Confirmação para o usuário
            await interaction.editReply({
                content: `✅ Sua ficha foi enviada com sucesso! Aguarde a análise da staff.`
            });

            return;
        }

        // ─── Botão: Aprovar ──────────────────────────────────────
        if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
            if (!isGerencia(interaction)) {
                await interaction.reply({
                    content: '❌ Você não tem permissão para realizar esta ação.',
                    ephemeral: true
                });
                return;
            }

            const membroId = interaction.customId.split('_')[1];
            const membro   = await interaction.guild.members.fetch(membroId).catch(() => null);

            await interaction.deferUpdate();

            if (membro) {
                try { await membro.roles.remove(CARGO_FORMULARIO); } catch {}
                try { await membro.roles.add(CARGO_APROVADO); } catch {}

                try {
                    const dmAprovado = new EmbedBuilder()
                        .setColor('#57F287')
                        .setTitle('✅  Parabéns! Você foi aprovado!')
                        .setDescription(
                            `Olá, **${membro.displayName}**! 🎉\n\n` +
                            `Sua ficha foi **aprovada** pela staff da **Size**.\n` +
                            `Bem-vindo(a) ao grupo! O cargo foi adicionado automaticamente.`
                        )
                        .setFooter({ text: 'Size Recrutamento' })
                        .setTimestamp();

                    await membro.send({ embeds: [dmAprovado] });
                } catch {}
            }

            const embedAprovado = new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('✅  Ficha Aprovada')
                .setDescription(
                    `> <@${membroId}> foi **aprovado(a)** por <@${interaction.user.id}>.\n` +
                    `> Cargo de formulário removido e cargo final concedido automaticamente.`
                )
                .setFooter({ text: 'Size Recrutamento' })
                .setTimestamp();

            await interaction.message.edit({ embeds: [embedAprovado], components: [] });
            return;
        }

        // ─── Botão: Reprovar ─────────────────────────────────────
        if (interaction.isButton() && interaction.customId.startsWith('reprovar_')) {
            if (!isGerencia(interaction)) {
                await interaction.reply({
                    content: '❌ Você não tem permissão para realizar esta ação.',
                    ephemeral: true
                });
                return;
            }

            const membroId = interaction.customId.split('_')[1];
            const membro   = await interaction.guild.members.fetch(membroId).catch(() => null);

            await interaction.deferUpdate();

            if (membro) {
                try { await membro.roles.remove(CARGO_FORMULARIO); } catch {}
                
                try {
                    const dmReprovado = new EmbedBuilder()
                        .setColor('#ED4245')
                        .setTitle('❌  Sua ficha foi reprovada')
                        .setDescription(
                            `Olá, **${membro.displayName}**.\n\n` +
                            `Infelizmente sua ficha foi **reprovada** pela staff da **Size**.\n` +
                            `Você poderá tentar novamente no futuro. Obrigado pelo interesse!`
                        )
                        .setFooter({ text: 'Size Recrutamento' })
                        .setTimestamp();

                    await membro.send({ embeds: [dmReprovado] });
                } catch {}
            }

            const embedReprovado = new EmbedBuilder()
                .setColor('#ED4245')
                .setTitle('❌  Ficha Reprovada')
                .setDescription(
                    `> <@${membroId}> foi **reprovado(a)** por <@${interaction.user.id}>.\n` +
                    `> Cargo de formulário removido e DM enviada ao candidato.`
                )
                .setFooter({ text: 'Size Recrutamento' })
                .setTimestamp();

            await interaction.message.edit({ embeds: [embedReprovado], components: [] });

            setTimeout(async () => {
                try {
                    const channelToDelete = interaction.channel;
                    if (!channelToDelete || !channelToDelete.deletable) return;
                    await channelToDelete.delete('Ficha reprovada - limpeza automática');
                } catch {}
            }, 5000);

            return;
        }
    }
};
