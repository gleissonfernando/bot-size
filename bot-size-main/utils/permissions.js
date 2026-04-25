const fs = require('fs');
const path = require('path');
const config = require('../config/config');

function normalizeIds(list) {
    if (!Array.isArray(list)) return [];
    return list.map(String).map(id => id.trim()).filter(Boolean);
}

function memberHasAnyRole(member, roleIds) {
    if (!member || !member.roles || !member.roles.cache) return false;
    const normalized = normalizeIds(roleIds);
    if (normalized.length === 0) return false;
    return normalized.some(roleId => member.roles.cache.has(roleId));
}

function isUserAuthorizedById(userId) {
    if (!userId) return false;
    const authorizedIds = normalizeIds(config.authorizedUserIds);
    return authorizedIds.includes(String(userId));
}

function getPanelStaffRoleIds() {
    try {
        const panelConfigPath = path.join(__dirname, '../commands/config.json');
        if (!fs.existsSync(panelConfigPath)) return [];
        const raw = fs.readFileSync(panelConfigPath, 'utf8');
        const panelConfig = JSON.parse(raw);
        return normalizeIds(panelConfig.STAFF_ROLES || []);
    } catch {
        return [];
    }
}

/**
 * Verifica se o usuário tem permissão baseada nos cargos cadastrados no /painel
 */
function isRegisteredUser(interaction) {
    if (!interaction || !interaction.user) return false;

    const userId = interaction.user.id;
    // Donos/Admins autorizados via ENV sempre têm acesso
    if (isUserAuthorizedById(userId)) return true;

    // Apenas cargos cadastrados no /painel (commands/config.json -> STAFF_ROLES)
    const panelStaffRoleIds = getPanelStaffRoleIds();
    return memberHasAnyRole(interaction.member, panelStaffRoleIds);
}

/**
 * Para este bot, a gerência é definida pelos mesmos cargos do painel
 */
function isGerencia(interaction) {
    return isRegisteredUser(interaction);
}

async function denyNotRegistered(interaction) {
    return interaction.reply({
        content: '❌ **Acesso Negado:** Este comando é restrito a usuários cadastrados no painel administrativo.',
        ephemeral: true
    });
}

module.exports = {
    isRegisteredUser,
    isGerencia,
    denyNotRegistered
};
