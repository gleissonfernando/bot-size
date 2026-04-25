const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');
const path = require('path');
const fs = require('fs');
const { isRegisteredUser, denyNotRegistered } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set')
        .setDescription('🎯 Abre o sistema de recrutamento Size'),

    async execute(interaction) {
        if (!isRegisteredUser(interaction)) {
            await denyNotRegistered(interaction);
            return;
        }

        // Nome real do arquivo na pasta foto
        const fileName = 'IMG_4234-fotor-bg-remover-20260424232155.png';
        const bannerPath = path.join(__dirname, '../../foto/', fileName);

        if (!fs.existsSync(bannerPath)) {
            await interaction.reply({
                content: `❌ Banner não encontrado (${fileName}). Contate um administrador.`,
                flags: 64
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setAuthor({
                name: 'Size — Recrutamento Oficial',
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTitle('📋  Bem-vindo ao Sistema de Setagem')
            .setDescription(
                '> 👋 Olá, **candidato**! Você está prestes a iniciar o processo de recrutamento oficial da **Size**.\n\n' +
                '> 📌 Leia com atenção antes de começar:\n\n' +
                '🔹 Responda todas as perguntas com sinceridade\n' +
                '🔹 O processo é rápido e totalmente online\n' +
                '🔹 Nossa equipe analisará sua ficha em breve'
            )
            .setImage(`attachment://${fileName}`)
            .addFields(
                {
                    name: '📊 Sobre o Processo',
                    value: '`📝 Formulário`\n`⚡ Análise Rápida`\n`✅ Retorno Garantido`',
                    inline: false
                },
                {
                    name: '⏱️ Tempo Estimado',
                    value: '> Aproximadamente **5 minutos**',
                    inline: true
                },
                {
                    name: '📬 Retorno',
                    value: '> Em até **24 horas**',
                    inline: true
                }
            )
            .setFooter({
                text: '🔒 Size Recrutamento  •  Clique no botão para iniciar',
                iconURL: interaction.guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('size_set_start')
                .setLabel('🎮  Iniciar Recrutamento')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('size_set_info')
                .setLabel('ℹ️ Informações')
                .setStyle(ButtonStyle.Secondary)
        );

        const bannerAttachment = new AttachmentBuilder(bannerPath);

        try {
            await interaction.reply({
                embeds: [embed],
                components: [row],
                files: [bannerAttachment],
                flags: 64
            });
        } catch (error) {
            console.error('[set] Erro ao enviar embed de recrutamento:', error);

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ocorreu um erro ao abrir o recrutamento. Tente novamente.',
                    flags: 64
                });
            }
        }
    }
};
