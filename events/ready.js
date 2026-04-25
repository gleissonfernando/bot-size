const { Events } = require('discord.js');

const mongoose = require('mongoose');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🚀 Bot Online! Logado como ${client.user.tag}`);
        
        // Sincronização periódica de cargos de desenvolvedor
        setInterval(async () => {
            try {
                const User = mongoose.models.User;
                if (!User) return;

                const devs = await User.find({ role: { $in: ['developer', 'admin'] } });
                const devIds = new Set(devs.map(d => d.discordId));
                
                // Pegamos o ID do cargo de dev do .env ou uma constante (precisa ser configurado no Discord)
                const DEV_ROLE_ID = process.env.DEV_ROLE_ID;
                if (!DEV_ROLE_ID) return;

                for (const guild of client.guilds.cache.values()) {
                    const role = guild.roles.cache.get(DEV_ROLE_ID);
                    if (!role) continue;

                    // Remove cargo de quem não é mais dev na dashboard
                    role.members.forEach(async (member) => {
                        if (!devIds.has(member.id) && member.id !== process.env.DEVELOPER_ID) {
                            try {
                                await member.roles.remove(role);
                                console.log(`[SYNC] Cargo de Dev removido de ${member.user.tag} (Não autorizado na Dashboard)`);
                            } catch (e) {
                                // Ignora erros de permissão
                            }
                        }
                    });

                    // Adiciona cargo para quem é dev na dashboard mas não tem o cargo
                    for (const devId of devIds) {
                        try {
                            const member = await guild.members.fetch(devId).catch(() => null);
                            if (member && !member.roles.cache.has(DEV_ROLE_ID)) {
                                await member.roles.add(role);
                                console.log(`[SYNC] Cargo de Dev adicionado para ${member.user.tag} (Sincronizado via Dashboard)`);
                            }
                        } catch (e) {
                            // Ignora erros
                        }
                    }
                }
            } catch (error) {
                console.error('[SYNC_ERROR]: Erro na sincronização de cargos:', error.message);
            }
        }, 1000 * 60 * 15); // Sincroniza a cada 15 minutos
    },
};
