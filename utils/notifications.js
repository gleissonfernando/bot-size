const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'commands', 'config.json');
const ERROR_LOG_CHANNEL_ID = '761011766440230932';
const ERROR_ROLE_ID = '1497405005802635374';
const NOTIFY_USERS = ['1426287249020158018', '761011766440230932'];

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
    return { STAFF_CHANNEL_ID: '' };
}

/**
 * Envia um log para o canal de staff configurado
 */
async function sendStaffLog(client, title, description, color = '#5865F2', fields = []) {
    const config = loadConfig();
    const logChannelId = config.STAFF_CHANNEL_ID;
    if (!logChannelId) return;

    try {
        const channel = await client.channels.fetch(logChannelId).catch(() => null);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: 'Size Log System' })
                .setTimestamp();
            
            if (fields.length > 0) embed.addFields(fields);
            
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('Erro ao enviar log de staff:', err);
    }
}

/**
 * Envia um log de atualização para o canal específico
 */
async function sendUpdateLog(client, title, description, color = '#3498DB') {
    try {
        const channel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID).catch(() => null);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🔄 Atualização: ${title}`)
                .setDescription(description)
                .setFooter({ text: 'Size Update System' })
                .setTimestamp();
            
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('Erro ao enviar log de atualização:', err);
    }
}

/**
 * Notifica sobre erros críticos (Cargo e DM)
 */
async function notifyError(client, error, context = '') {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'N/A';
    
    // 1. Enviar para o canal de log com marcação de cargo
    try {
        const channel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID).catch(() => null);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('🚨 Erro Crítico Detectado')
                .setDescription(`**Contexto:** ${context}\n**Erro:** \`${errorMessage}\``)
                .addFields({ name: 'Stack Trace', value: `\`\`\`js\n${errorStack.slice(0, 1000)}\n\`\`\`` })
                .setTimestamp();
            
            await channel.send({ 
                content: `<@&${ERROR_ROLE_ID}>`, 
                embeds: [embed] 
            });
        }
    } catch (err) {
        console.error('Erro ao enviar notificação de erro no canal:', err);
    }

    // 2. Enviar DM para os usuários especificados
    for (const userId of NOTIFY_USERS) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('⚠️ Alerta de Erro do Bot')
                    .setDescription(`Ocorreu um erro que requer atenção imediata.\n\n**Contexto:** ${context}\n**Erro:** ${errorMessage}`)
                    .setTimestamp();
                
                await user.send({ embeds: [dmEmbed] });
            }
        } catch (err) {
            console.error(`Erro ao enviar DM para ${userId}:`, err);
        }
    }
}

module.exports = {
    sendStaffLog,
    sendUpdateLog,
    notifyError
};
