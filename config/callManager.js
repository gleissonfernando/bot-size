const {
    PermissionFlagsBits,
    ChannelType,
    PermissionsBitField
} = require('discord.js');
const { createLimitModal, createUserIdModal } = require('./callHelpers');

// In-memory storage for active calls
// { channelId: { ownerId: string, roleId: string, bannedUsers: string[] } }
const activeCalls = new Map();
const deletionTimers = new Map();

module.exports = {
    activeCalls,
    deletionTimers,

    async handleCallInteraction(interaction) {
        const { customId, user, guild, member } = interaction;
        const voiceChannel = interaction.member?.voice.channel;

        // Logic for creating a call is the only one that doesn't require being in a call
        if (customId === 'call_create') {
            if (voiceChannel) return interaction.reply({ content: '❌ Você já está em uma call!', ephemeral: true });

            try {
                // Create temporary Role for the owner
                const ownerRole = await guild.roles.create({
                    name: `Dono da Call - ${user.username}`,
                    color: 'Random',
                    reason: 'Automatic call ownership'
                });

                // Create Voice Channel
                const channel = await guild.channels.create({
                    name: `📞 Call de ${user.username}`,
                    type: ChannelType.GuildVoice,
                    parent: process.env.CALL_CATEGORY_ID || null, // ID da Categoria Específica
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            deny: [PermissionFlagsBits.Connect], // Default: Locked (we will make it public by default or private)
                        },
                        {
                            id: ownerRole.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels],
                        },
                        {
                            id: user.id,
                            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels],
                        }
                    ],
                });

                activeCalls.set(channel.id, {
                    ownerId: user.id,
                    roleId: ownerRole.id,
                    bannedUsers: []
                });

                await member.roles.add(ownerRole);
                await interaction.reply({ content: `✅ Call criada com sucesso! ${channel}`, ephemeral: true });
            } catch (e) {
                console.error(e);
                await interaction.reply({ content: '❌ Erro ao criar call.', ephemeral: true });
            }
            return;
        }

        // For all other commands, user must be in a temporary call and be the owner
        if (!voiceChannel) return interaction.reply({ content: '❌ Você precisa estar em uma call temporária!', ephemeral: true });

        const callData = activeCalls.get(voiceChannel.id);
        if (!callData) return interaction.reply({ content: '❌ Esta não é uma call temporária gerenciável.', ephemeral: true });

        // VERIFICAÇÃO DE DESENVOLVEDOR MESTRE (Permissão Global)
        const DEVELOPER_ID = process.env.DEVELOPER_ID || '';
        const isDeveloper = user.id === DEVELOPER_ID;

        if (callData.ownerId !== user.id && !isDeveloper) {
            return interaction.reply({ content: '❌ Apenas o dono da call pode gerenciar estas configurações!', ephemeral: true });
        }

        switch (customId) {
            case 'call_private':
                await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: false });
                await interaction.reply({ content: '🔒 Call agora está Privada!', ephemeral: true });
                break;

            case 'call_public':
                await voiceChannel.permissionOverwrites.edit(guild.id, { Connect: true });
                await interaction.reply({ content: '🔓 Call agora está Pública!', ephemeral: true });
                break;

            case 'call_limit':
                await interaction.showModal(createLimitModal());
                break;

            case 'call_allow':
                await interaction.showModal(createUserIdModal('allow'));
                break;

            case 'call_disconnect':
                await interaction.showModal(createUserIdModal('disconnect'));
                break;

            case 'call_ban':
                await interaction.showModal(createUserIdModal('ban'));
                break;

            case 'call_delete':
                await voiceChannel.delete();
                const role = guild.roles.cache.get(callData.roleId);
                if (role) await role.delete();
                activeCalls.delete(voiceChannel.id);
                await interaction.reply({ content: '🗑️ Call deletada com sucesso!', ephemeral: true });
                break;
        }
    },

    async handleModal(interaction) {
        const { customId, user, guild, member } = interaction;
        const voiceChannel = interaction.member?.voice.channel;
        if (!voiceChannel) return;

        const callData = activeCalls.get(voiceChannel.id);
        const DEVELOPER_ID = process.env.DEVELOPER_ID || '';
        if (!callData || (callData.ownerId !== user.id && user.id !== DEVELOPER_ID)) return;

        if (customId === 'modal_call_limit') {
            const limit = parseInt(interaction.fields.getTextInputValue('limit_value'));
            if (isNaN(limit) || limit < 0 || limit > 99) return interaction.reply({ content: '❌ Valor inválido!', ephemeral: true });

            await voiceChannel.setUserLimit(limit);
            await interaction.reply({ content: `🔢 Limite alterado para ${limit} usuários!`, ephemeral: true });
        }
        else if (customId.startsWith('modal_')) {
            const action = customId.split('_')[1];
            const targetId = interaction.fields.getTextInputValue('user_id');
            const targetMember = await guild.members.fetch(targetId).catch(() => null);

            if (!targetMember) return interaction.reply({ content: '❌ Usuário não encontrado no servidor!', ephemeral: true });

            if (action === 'allow') {
                await voiceChannel.permissionOverwrites.create({
                    id: targetMember.id,
                    allow: [PermissionFlagsBits.Connect],
                });

                // Also grant the temporary call role to the target member
                const callData = activeCalls.get(voiceChannel.id);
                if (callData && callData.roleId) {
                    const role = await guild.roles.fetch(callData.roleId).catch(() => null);
                    if (role) {
                        await targetMember.roles.add(role);
                    }
                }

                await interaction.reply({ content: `✅ ${targetMember.user.tag} agora pode entrar e recebeu o cargo da call!`, ephemeral: true });
            } else if (action === 'disconnect') {
                try {
                    await targetMember.voice.setChannel(null);
                    await interaction.reply({ content: `🚫 ${targetMember.user.tag} foi desconectado!`, ephemeral: true });
                } catch (e) {
                    await interaction.reply({ content: '❌ Não consegui desconectar o usuário.', ephemeral: true });
                }
            } else if (action === 'ban') {
                await voiceChannel.permissionOverwrites.create({
                    id: targetMember.id,
                    deny: [PermissionFlagsBits.Connect],
                });
                callData.bannedUsers.push(targetMember.id);
                await interaction.reply({ content: `🔨 ${targetMember.user.tag} foi banido da call!`, ephemeral: true });
            }
        }
    },

    async handleVoiceStateUpdate(oldState, newState, client) {
        const guild = newState.guild;

        // New channel created check (if we didn't create it via bot)
        // but we care about empty channels
        if (oldState.channelId && !newState.channelId) {
            const oldChannelId = oldState.channelId;
            if (activeCalls.has(oldChannelId)) {
                const oldChannel = guild.channels.cache.get(oldChannelId);
                if (oldChannel && oldChannel.members.size === 0) {
                    startDeletionTimer(oldChannelId, guild, client);
                } else if (!oldChannel || oldChannel.members.size === 0) {
                    // Fallback: if channel is already gone or empty
                    startDeletionTimer(oldChannelId, guild, client);
                }
            }
        }

        if (newState.channelId) {
            const channel = newState.channel;
            if (activeCalls.has(channel.id)) {
                // Cancel deletion timer if someone enters
                if (deletionTimers.has(channel.id)) {
                    clearTimeout(deletionTimers.get(channel.id));
                    deletionTimers.delete(channel.id);
                    console.log(`♻️ Deletion cancelled for channel ${channel.id}`);
                }
            }
        }
    }
};

function startDeletionTimer(channelId, guild, client) {
    console.log(`⏳ Channel ${channelId} is empty. Starting deletion timer (30s)...`);
    const timer = setTimeout(async () => {
        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (channel && channel.members.size === 0) {
            const data = activeCalls.get(channelId);
            if (data && data.roleId) {
                const role = await guild.roles.fetch(data.roleId).catch(() => null);
                if (role) {
                    await role.delete().catch(err => console.error(`[ERROR] Falha ao deletar cargo: ${err}`));
                    console.log(`🗑️ Cargo ${data.roleId} deletado.`);
                }
            }
            if (channel) {
                await channel.delete().catch(err => console.error(`[ERROR] Falha ao deletar canal: ${err}`));
                console.log(`🗑️ Canal ${channelId} deletado.`);
            }
            activeCalls.delete(channelId);
            console.log(`✅ Deleção automática concluída para a call ${channelId}`);
        }
    }, 30000); // 30 segundos
    deletionTimers.set(channelId, timer);
}
