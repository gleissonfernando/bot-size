const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
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
            .setImage('https://i.imgur.com/SEU_BANNER.png')
            .addFields(
                {
                    name: '📊 Sobre o Processo',
                    value: '`📝 Formulário`  `⚡ Análise Rápida`  `✅ Retorno Garantido`',
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
                .setLabel('ℹ️  Saiba Mais')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }
};