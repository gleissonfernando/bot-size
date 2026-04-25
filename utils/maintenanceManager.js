const fs = require('fs');
const path = require('path');

const MAINTENANCE_PATH = path.join(__dirname, '..', 'commands', 'config.json');

// IDs dos desenvolvedores/admins que recebem alertas
const DEV_NOTIFY_USERS = ['761011766440230932', '1426287249020158018'];

function loadConfig() {
    try {
        if (fs.existsSync(MAINTENANCE_PATH)) {
            return JSON.parse(fs.readFileSync(MAINTENANCE_PATH, 'utf8'));
        }
    } catch (err) {
        console.error('Erro ao carregar config (maintenance):', err);
    }
    return {};
}

function saveConfig(data) {
    try {
        fs.writeFileSync(MAINTENANCE_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Erro ao salvar config (maintenance):', err);
    }
}

/**
 * Verifica se o modo manutenção está ativo
 */
function isMaintenanceMode() {
    const config = loadConfig();
    return config.MAINTENANCE_MODE === true;
}

/**
 * Ativa o modo manutenção
 */
function enableMaintenance(activatedBy = null) {
    const config = loadConfig();
    config.MAINTENANCE_MODE = true;
    config.MAINTENANCE_ACTIVATED_BY = activatedBy;
    config.MAINTENANCE_ACTIVATED_AT = new Date().toISOString();
    saveConfig(config);
}

/**
 * Desativa o modo manutenção
 */
function disableMaintenance(deactivatedBy = null) {
    const config = loadConfig();
    config.MAINTENANCE_MODE = false;
    config.MAINTENANCE_DEACTIVATED_BY = deactivatedBy;
    config.MAINTENANCE_DEACTIVATED_AT = new Date().toISOString();
    saveConfig(config);
}

/**
 * Envia alertas de manutenção para os devs via DM
 */
async function sendMaintenanceAlert(client, activatedBy, message = null) {
    const alertMsg = message || `⚠️ O modo de manutenção foi **ativado** por <@${activatedBy}>. O bot está temporariamente indisponível para os usuários.`;

    for (const userId of DEV_NOTIFY_USERS) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor('#FF6B00')
                    .setTitle('🔧 Alerta de Manutenção')
                    .setDescription(alertMsg)
                    .addFields({ name: 'Ativado por', value: `<@${activatedBy}>`, inline: true })
                    .setTimestamp();
                await user.send({ embeds: [embed] });
            }
        } catch (err) {
            console.error(`Erro ao enviar alerta de manutenção para ${userId}:`, err);
        }
    }
}

module.exports = {
    isMaintenanceMode,
    enableMaintenance,
    disableMaintenance,
    sendMaintenanceAlert,
    DEV_NOTIFY_USERS
};
