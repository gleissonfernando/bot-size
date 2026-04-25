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
const fs = require('fs');
const path = require('path');
const { isGerencia } = require('../utils/permissions');

const CONFIG_PATH = path.join(__dirname, '..', 'commands', 'config.json');

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
    return { STAFF_ROLES: [], STAFF_CHANNEL_ID: '', CARGO_MORADOR_ID: '', CARGO_MEMBRO_ID: '', CATEGORY_ID: '' };
}

// IDs fixos (podem ser movidos para config.json depois)
const CATEGORIA_ID       = '1497388763054342244';
const CARGO_APROVADO     = '1490151003864043570';
const CARGO_FORMULARIO   = '1497394597746315355';

const CANAIS_AUTORIZADOS = [
    '1497421574108745728',
    '1497368376920772628'
];

// Função auxiliar para logs
async function sendLog(interaction, title, description, color = '#5865F2') {
    const config = loadConfig();
    const logChannelId = config.STAFF_CHANNEL_ID;
    if (!logChannelId) return;

    try {
        const channel = await interaction.guild.channels.fetch(logChannelId).catch(() => null);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .addFields(
                    { name: '👤 Usuário', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)`, inline: true },
                    { name: '📍 Canal', value: `<#${interaction.channelId}>`, inline: true }
                )
                .setFooter({ text: 'Size Log System' })
                .setTimestamp();
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('Erro ao enviar log:', err);
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {

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
            await sendLog(interaction, '⌨️ Comando Utilizado', `O comando \`/${interaction.commandName}\` foi executado.`);

            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;
            try { await command.execute(interaction); } catch (err) { console.error(err); }
            return;
        }

        const painelCommand = interaction.client.commands.get('painel');

        // Lida com Botões do Painel
        if (interaction.isButton() && painelCommand && typeof painelCommand.handleButton === 'function') {
            const painelButtonIds = [
                'tab_stats', 'tab_roles', 'tab_config', 'add_role_btn', 'list_roles_btn', 
                'remove_role_modal_btn', 'edit_staff_channel', 'edit_cargo_morador', 
                'edit_cargo_membro', 'edit_category'
            ];
            if (painelButtonIds.includes(interaction.customId)) {
                await painelCommand.handleButton(interaction);
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
                await painelCommand.handleModal(interaction);
                return;
            }
        }

        // Lida com Select Menus do Painel
        if (interaction.isStringSelectMenu() && painelCommand && typeof painelCommand.handleSelectMenu === 'function') {
            if (interaction.customId === 'remove_role_select') {
                await painelCommand.handleSelectMenu(interaction);
                return;
            }
        }

        // ─── Botão: Iniciar Recrutamento ──────────────────────────
        if (interaction.isButton() && interaction.customId === 'size_set_start') {
            // Log de abertura de formulário
            await sendLog(interaction, '📝 Formulário Iniciado', 'O usuário iniciou o preenchimento do formulário de recrutamento.', '#FEE75C');

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
            const nome      = interaction.fields.getTextInputValue('campo_nome');
            const id        = interaction.fields.getTextInputValue('campo_id');
            const novoNick  = `${id} ${nome}`;
            const membro    = interaction.member;

            await interaction.deferReply({ ephemeral: true });

            // Log de envio de ficha
            await sendLog(interaction, '📩 Ficha Enviada', `O usuário finalizou e enviou a ficha de recrutamento.\n**Nick:** ${novoNick}`, '#57F287');

            try { await membro.setNickname(novoNick); } catch {}
            try { await membro.roles.add(CARGO_FORMULARIO); } catch {}

            const canal = await interaction.guild.channels.create({
                name: `📋・${id}-${nome}`.toLowerCase(),
                type: ChannelType.GuildText,
                parent: CATEGORIA_ID,
                permissionOverwrites: [
                    { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: membro.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
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
            return;
        }

        // ─── Botões: Aprovar / Reprovar ───────────────────────────
        if (interaction.isButton() && (interaction.customId.startsWith('aprovar_') || interaction.customId.startsWith('reprovar_'))) {
            if (!isGerencia(interaction)) {
                await interaction.reply({ content: '❌ Sem permissão.', ephemeral: true });
                return;
            }

            const action = interaction.customId.startsWith('aprovar_') ? 'Aprovada' : 'Reprovada';
            const color = action === 'Aprovada' ? '#57F287' : '#ED4245';
            const membroId = interaction.customId.split('_')[1];
            const membro   = await interaction.guild.members.fetch(membroId).catch(() => null);

            await interaction.deferUpdate();

            // Log de decisão da Staff
            await sendLog(interaction, `⚖️ Decisão de Recrutamento: ${action}`, `A ficha de <@${membroId}> foi **${action}** por <@${interaction.user.id}>.`, color);

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
            return;
        }
    }
};
