/**
 * Agendador de Mensagens Automáticas
 * 
 * Responsável por enviar mensagens automáticas de bom dia no canal configurado
 * com menção ao cargo definido.
 * 
 * Canal: 1484969500884471879
 * Cargo: 1490147350570860725
 * Horário: Todos os dias às 08:00 (horário de Brasília / UTC-3)
 */

const { EmbedBuilder } = require('discord.js');

const AUTO_MSG_CHANNEL_ID = '1484969500884471879';
const AUTO_MSG_ROLE_ID = '1490147350570860725';

// Horário de envio: 08:00 horário de Brasília (UTC-3 = 11:00 UTC)
const SEND_HOUR_UTC = 11; // 08:00 BRT = 11:00 UTC
const SEND_MINUTE = 0;

let schedulerInterval = null;
let lastSentDate = null;

/**
 * Constrói o embed de bom dia
 */
function buildBomdiaEmbed() {
    const now = new Date();
    const hora = now.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo'
    });
    const data = now.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo'
    });

    // Capitaliza a primeira letra do dia da semana
    const dataFormatada = data.charAt(0).toUpperCase() + data.slice(1);

    const saudacoes = [
        'Que hoje seja um dia incrível para toda a família **Size**! 🌟',
        'Comece o dia com energia e disposição! A **Size** conta com você! 💪',
        'Mais um dia para brilhar com a família **Size**! ✨',
        'Que esse dia traga muitas conquistas para todos nós! 🏆',
        'Bom dia, família **Size**! Vamos fazer desse dia algo especial! 🎯'
    ];

    const saudacao = saudacoes[Math.floor(Math.random() * saudacoes.length)];

    return new EmbedBuilder()
        .setTitle('🌅  Bom Dia, Size!')
        .setColor(0xFEE75C)
        .setDescription(
            `### ☀️ Bom dia a todos!\n\n` +
            `> ${saudacao}\n\n` +
            `📅 **${dataFormatada}** — 🕐 ${hora}\n\n` +
            `<@&${AUTO_MSG_ROLE_ID}> — Bom dia a todos os membros! 🎉`
        )
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/869/869869.png')
        .setImage('https://cdn-icons-png.flaticon.com/512/4052/4052984.png')
        .setFooter({ text: 'Size — Mensagem Automática de Bom Dia' })
        .setTimestamp();
}

/**
 * Verifica se está na hora de enviar a mensagem de bom dia
 */
function shouldSendNow() {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Verifica se já enviou hoje
    if (lastSentDate === todayStr) return false;

    // Verifica se está no horário correto (janela de 1 minuto)
    if (utcHour === SEND_HOUR_UTC && utcMinute === SEND_MINUTE) {
        return true;
    }

    return false;
}

/**
 * Envia a mensagem de bom dia
 */
async function sendBomdiaMessage(client) {
    try {
        const canal = await client.channels.fetch(AUTO_MSG_CHANNEL_ID).catch(() => null);
        if (!canal) {
            console.error(`[Scheduler] Canal ${AUTO_MSG_CHANNEL_ID} não encontrado.`);
            return false;
        }

        const embed = buildBomdiaEmbed();
        await canal.send({ embeds: [embed] });

        const todayStr = new Date().toISOString().split('T')[0];
        lastSentDate = todayStr;

        console.log(`[Scheduler] ✅ Mensagem de bom dia enviada com sucesso em ${new Date().toISOString()}`);
        return true;
    } catch (err) {
        console.error('[Scheduler] Erro ao enviar mensagem de bom dia:', err);
        return false;
    }
}

/**
 * Inicia o agendador de mensagens automáticas
 * Verifica a cada 30 segundos se está na hora de enviar
 */
function startScheduler(client) {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
    }

    console.log('[Scheduler] ✅ Agendador de mensagens automáticas iniciado.');
    console.log(`[Scheduler] Mensagem de bom dia será enviada às 08:00 BRT (${SEND_HOUR_UTC}:${String(SEND_MINUTE).padStart(2, '0')} UTC) no canal ${AUTO_MSG_CHANNEL_ID}`);

    // Verifica a cada 30 segundos
    schedulerInterval = setInterval(async () => {
        if (shouldSendNow()) {
            await sendBomdiaMessage(client);
        }
    }, 30 * 1000);

    return schedulerInterval;
}

/**
 * Para o agendador
 */
function stopScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
        console.log('[Scheduler] Agendador parado.');
    }
}

module.exports = {
    startScheduler,
    stopScheduler,
    sendBomdiaMessage,
    buildBomdiaEmbed,
    AUTO_MSG_CHANNEL_ID,
    AUTO_MSG_ROLE_ID
};
