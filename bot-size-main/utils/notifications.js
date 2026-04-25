const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'commands', 'config.json');

// IDs atualizados conforme solicitação do usuário
const ERROR_LOG_CHANNEL_ID = '1497380031016599603'; // Canal das Logs (Real-time)
const UPDATE_LOG_CHANNEL_ID = '1497380031016599603'; // Unificando para o canal solicitado
const ERROR_ROLE_ID = '1497405005802635374'; // Cargo para mencionar
const NOTIFY_USERS = ['761011766440230932', '1426287249020158018']; // DMs dos Devs

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Erro ao ler config.json:', err);
    }
    return { STAFF_CHANNEL_ID: '' };
}

/**
 * Envia um log para o canal de logs principal (Real-time)
 */
async function sendStaffLog(client, title, description, color = '#5865F2', fields = []) {
    try {
        const channel = await client.channels.fetch(ERROR_LOG_CHANNEL_ID).catch(() => null);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .setFooter({ text: 'Size Log System • Real-time' })
                .setTimestamp();
            
            if (fields.length > 0) embed.addFields(fields);
            
            await channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('Erro ao enviar log de staff:', err);
    }
}

/**
 * Envia um log de atualização para o canal específico de atualizações
 */
async function sendUpdateLog(client, title, description, color = '#3498DB', mention = false) {
    try {
        const channel = await client.channels.fetch(UPDATE_LOG_CHANNEL_ID).catch(() => null);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`🔄 Atualização: ${title}`)
                .setDescription(description)
                .setFooter({ text: 'Size Update System' })
                .setTimestamp();
            
            const payload = { embeds: [embed] };
            if (mention) payload.content = `<@&${ERROR_ROLE_ID}>`;
            
            await channel.send(payload);
        }
    } catch (err) {
        console.error('Erro ao enviar log de atualização:', err);
    }
}

/**
 * Notifica sobre a inicialização (Online)
 */
async function notifyReady(client) {
    const title = 'Bot Ligado / Reiniciado';
    const description = 'O bot da **Size** foi iniciado com sucesso e está operacional.';
    const color = '#57F287';

    // 1. Canal de Logs com Menção
    await sendUpdateLog(client, title, description, color, true);

    // 2. DM para os Devs
    for (const userId of NOTIFY_USERS) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const dmEmbed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`✅ ${title}`)
                    .setDescription(description)
                    .setTimestamp();
                await user.send({ embeds: [dmEmbed] }).catch(() => null);
            }
        } catch (err) {}
    }
}

/**
 * Notifica sobre o desligamento do bot via canal e DM
 */
async function notifyShutdown(client, reason, signal) {
    const title = 'Bot Desligado';
    const description = `O bot está sendo desligado.\n**Motivo:** ${reason}\n**Sinal:** ${signal}`;
    const color = '#ED4245';
    
    // 1. Canal de Logs com Menção
    await sendUpdateLog(client, title, description, color, true);

    // 2. DM para os desenvolvedores
    for (const userId of NOTIFY_USERS) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const dmEmbed = new EmbedBuilder()
                    .setColor(color)
                    .setTitle(`⚠️ ${title}`)
                    .setDescription(description)
                    .setTimestamp();
                await user.send({ embeds: [dmEmbed] }).catch(() => null);
            }
        } catch (err) {}
    }
}

/**
 * Notifica sobre erros críticos (Cargo e DM)
 */
async function notifyError(client, error, context = '') {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = (error instanceof Error && error.stack) ? error.stack : 'N/A';
    
    console.error(`[ERRO CRÍTICO] ${context}: ${errorMessage}`);

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
    } catch (err) {}

    for (const userId of NOTIFY_USERS) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const dmEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('⚠️ Alerta de Erro do Bot')
                    .setDescription(`Ocorreu um erro que requer atenção imediata.\n\n**Contexto:** ${context}\n**Erro:** ${errorMessage}`)
                    .setTimestamp();
                await user.send({ embeds: [dmEmbed] }).catch(() => null);
            }
        } catch (err) {}
    }
}

module.exports = {
    sendStaffLog,
    sendUpdateLog,
    notifyError,
    notifyShutdown,
    notifyReady
};
