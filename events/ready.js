const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'commands', 'config.json');

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
    return {};
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🚀 Bot Online! Logado como ${client.user.tag}`);
        
        // Log de Inicialização no Canal de Logs
        const config = loadConfig();
        const logChannelId = config.STAFF_CHANNEL_ID; // Usando o canal configurado no painel

        if (logChannelId) {
            try {
                const channel = await client.channels.fetch(logChannelId).catch(() => null);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🚀 Sistema Inicializado')
                        .setDescription('O bot da **Size** acabou de ser iniciado/reiniciado com sucesso.')
                        .addFields(
                            { name: '🛰️ Status', value: '`Online`', inline: true },
                            { name: '⏰ Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setFooter({ text: 'Size Management System' })
                        .setTimestamp();

                    await channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Erro ao enviar log de inicialização:', error);
            }
        }
    },
};
