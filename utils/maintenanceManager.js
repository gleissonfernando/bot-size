const fs = require('fs');
const path = require('path');

const MAINTENANCE_PATH = path.join(__dirname, '..', 'commands', 'config.json');
const LOG_CHANNEL_ID   = '1497380031016599603'; // Canal de logs principal

// IDs dos desenvolvedores que sempre recebem alertas
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
 * Coleta todos os IDs de cargos de staff (config.json + config.js)
 */
function getAllStaffRoleIds() {
    const ids = new Set();

    // Cargos do painel (config.json)
    try {
        const panelConfig = loadConfig();
        if (Array.isArray(panelConfig.STAFF_ROLES)) {
            panelConfig.STAFF_ROLES.forEach(id => ids.add(String(id)));
        }
    } catch {}

    // Cargos fixos do config.js
    try {
        const appConfig = require('../config/config');
        if (Array.isArray(appConfig.staffRoles)) {
            appConfig.staffRoles.forEach(id => ids.add(String(id)));
        }
        if (Array.isArray(appConfig.gerenciaRoleIds)) {
            appConfig.gerenciaRoleIds.forEach(id => ids.add(String(id)));
        }
    } catch {}

    return [...ids];
}

/**
 * Envia DM de alerta de manutenção para TODOS os membros que têm cargo de staff no servidor
 * Retorna { enviados, falhas }
 */
async function notifyAllStaffMembers(client, guild, activatedBy, ativando = true) {
    const { EmbedBuilder } = require('discord.js');
    const staffRoleIds = getAllStaffRoleIds();

    if (staffRoleIds.length === 0) {
        console.warn('[Maintenance] Nenhum cargo de staff configurado para notificar.');
        return { enviados: 0, falhas: 0 };
    }

    // Busca todos os membros do servidor (força fetch completo)
    let members;
    try {
        members = await guild.members.fetch();
    } catch (err) {
        console.error('[Maintenance] Erro ao buscar membros do servidor:', err);
        return { enviados: 0, falhas: 0 };
    }

    // Filtra membros que possuem pelo menos um cargo de staff
    const staffMembers = members.filter(member =>
        !member.user.bot &&
        staffRoleIds.some(roleId => member.roles.cache.has(roleId))
    );

    const titulo = ativando
        ? '🔧 Bot em Modo Manutenção'
        : '✅ Bot Voltou ao Normal';

    const descricao = ativando
        ? `O bot da **Size** foi colocado em **modo de manutenção** por <@${activatedBy}>.\n\n` +
          `> Usuários comuns receberão uma mensagem informando que o bot está em manutenção.\n\n` +
          `**Ativado em:** <t:${Math.floor(Date.now() / 1000)}:F>`
        : `O bot da **Size** voltou a operar **normalmente**. O modo de manutenção foi desativado por <@${activatedBy}>.\n\n` +
          `**Desativado em:** <t:${Math.floor(Date.now() / 1000)}:F>`;

    const cor = ativando ? 0xED4245 : 0x57F287;

    let enviados = 0;
    let falhas = 0;

    for (const [, member] of staffMembers) {
        try {
            const embed = new EmbedBuilder()
                .setColor(cor)
                .setTitle(titulo)
                .setDescription(descricao)
                .addFields(
                    { name: 'Servidor', value: guild.name, inline: true },
                    { name: 'Ação por', value: `<@${activatedBy}>`, inline: true }
                )
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2920/2920349.png')
                .setFooter({ text: 'Size Management System • Alerta Automático' })
                .setTimestamp();

            await member.send({ embeds: [embed] });
            enviados++;
        } catch {
            falhas++;
        }
    }

    // Também notifica os devs fixos que podem não ter cargo no servidor
    for (const userId of DEV_NOTIFY_USERS) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (!user) continue;

            // Verifica se já foi notificado como membro do servidor
            const jaNotificado = staffMembers.has(userId);
            if (jaNotificado) continue;

            const embed = new EmbedBuilder()
                .setColor(cor)
                .setTitle(titulo)
                .setDescription(descricao)
                .addFields(
                    { name: 'Servidor', value: guild.name, inline: true },
                    { name: 'Ação por', value: `<@${activatedBy}>`, inline: true }
                )
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2920/2920349.png')
                .setFooter({ text: 'Size Management System • Alerta Dev' })
                .setTimestamp();

            await user.send({ embeds: [embed] });
            enviados++;
        } catch {
            falhas++;
        }
    }

    return { enviados, falhas };
}

/**
 * Envia log detalhado no canal de logs ao ativar/desativar manutenção
 */
async function sendMaintenanceLog(client, guild, activatedBy, ativando = true) {
    const { EmbedBuilder } = require('discord.js');

    try {
        const canal = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (!canal) return;

        const titulo = ativando
            ? '🔧 Modo Manutenção ATIVADO'
            : '✅ Modo Manutenção DESATIVADO';

        const cor = ativando ? 0xED4245 : 0x57F287;

        const embed = new EmbedBuilder()
            .setColor(cor)
            .setTitle(titulo)
            .setDescription(
                ativando
                    ? `O modo de manutenção foi **ativado** no servidor **${guild.name}**.\n\n` +
                      `> Todas as interações de usuários comuns estão bloqueadas até que a manutenção seja desativada.`
                    : `O modo de manutenção foi **desativado** no servidor **${guild.name}**.\n\n` +
                      `> O bot voltou a operar normalmente.`
            )
            .addFields(
                { name: '👤 Responsável', value: `<@${activatedBy}> (\`${activatedBy}\`)`, inline: true },
                { name: '🕐 Horário', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                { name: '🏠 Servidor', value: guild.name, inline: true }
            )
            .setFooter({ text: 'Size Management System • Log de Manutenção' })
            .setTimestamp();

        // Menciona o cargo de erro/alerta no canal de log
        const appConfig = require('../config/config');
        const staffRoles = getAllStaffRoleIds();
        const mencoes = staffRoles.map(id => `<@&${id}>`).join(' ');

        await canal.send({
            content: ativando ? `${mencoes} ⚠️ **ATENÇÃO: Bot em manutenção!**` : `${mencoes} ✅ **Bot voltou ao normal!**`,
            embeds: [embed]
        });
    } catch (err) {
        console.error('[Maintenance] Erro ao enviar log de manutenção:', err);
    }
}

/**
 * Envia alertas de manutenção para os devs via DM (uso legado/manual)
 */
async function sendMaintenanceAlert(client, activatedBy, message = null) {
    const { EmbedBuilder } = require('discord.js');
    const alertMsg = message || `⚠️ O modo de manutenção foi **ativado** por <@${activatedBy}>. O bot está temporariamente indisponível para os usuários.`;

    for (const userId of DEV_NOTIFY_USERS) {
        try {
            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
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
    notifyAllStaffMembers,
    sendMaintenanceLog,
    sendMaintenanceAlert,
    getAllStaffRoleIds,
    DEV_NOTIFY_USERS
};
