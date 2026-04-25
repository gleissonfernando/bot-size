require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN,
    clientId: process.env.VITE_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '',
    guildId: process.env.VITE_DISCORD_GUILD_ID || process.env.DISCORD_GUILD_ID || '',
    staffChannelId: process.env.STAFF_CHANNEL_ID || 'ID_DO_CANAL_DE_STAFF',
    logsChannelId: process.env.LOGS_CHANNEL_ID || '1497380031016599603',
    categoryId: process.env.CATEGORY_ID || 'ID_DA_CATEGORIA_ONDE_VAI_CRIAR_A_CALL',
    roles: {
        morador: process.env.ROLE_MORADOR_ID || 'ID_DO_CARGO_MORADOR',
        membro: process.env.ROLE_MEMBRO_ID || 'ID_DO_CARGO_MEMBRO'
    },
    staffRoles: [
        1485109291542118420,
  
    ],
    authorizedUserIds: (process.env.AUTHORIZED_USER_IDS || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean),
    registeredRoleIds: [
        ...((process.env.REGISTERED_ROLE_IDS || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean)),
        '1484971948927619142'
    ],
    gerenciaRoleIds: [
        ...((process.env.GERENCIA_ROLE_IDS || '')
            .split(',')
            .map(v => v.trim())
            .filter(Boolean)),
        '1484971948927619142'
    ]
};
