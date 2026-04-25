const { Events } = require('discord.js');
const { logger } = require('../utils/logger');
const { deleteGuildConfig } = require('../utils/configManager');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild) {
    try {
      logger.warn(`Bot foi removido do servidor: ${guild.name} (${guild.id})`);

      // 1. Deletar configurações do servidor do banco de dados
      await deleteGuildConfig(guild.id);
      logger.info(`Configurações do servidor ${guild.id} foram deletadas do banco de dados`);

      // 2. Registrar no log de auditoria
      logger.info(`AUDITORIA: Bot removido de ${guild.name} - Dados limpos automaticamente`);

    } catch (error) {
      logger.error(`Erro ao processar remoção do bot do servidor ${guild.id}:`, error);
    }
  }
};
