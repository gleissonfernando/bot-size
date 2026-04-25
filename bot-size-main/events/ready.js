const { Events } = require('discord.js');
const { notifyReady } = require('../utils/notifications');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🚀 Bot Online! Logado como ${client.user.tag}`);
        
        // Log de Inicialização Completo (Canal + DM + Menção)
        try {
            await notifyReady(client);
        } catch (error) {
            console.error('Erro ao enviar log de inicialização:', error);
        }
    },
};
