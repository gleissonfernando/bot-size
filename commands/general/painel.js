const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { isGerencia } = require('../../utils/permissions');
const { sendUpdateLog, notifyError } = require('../../utils/notifications');
const {
  isMaintenanceMode,
  enableMaintenance,
  disableMaintenance,
  sendMaintenanceAlert,
} = require('../../utils/maintenanceManager');

// ─── Caminhos dos arquivos de configuração ────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const STATS_PATH = path.join(__dirname, '..', 'stats.json');

// ─── Canal e Cargo para mensagens automáticas ─────────────────────────────────
const AUTO_MSG_CHANNEL_ID = '1484969500884471879';
const AUTO_MSG_ROLE_ID = '1490147350570860725';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      const defaults = {
        STAFF_ROLES: [],
        STAFF_CHANNEL_ID: '',
        CARGO_MORADOR_ID: '',
        CARGO_MEMBRO_ID: '',
        CATEGORY_ID: '',
        MAINTENANCE_MODE: false,
      };
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    console.error('Erro ao carregar config:', err);
    return { STAFF_ROLES: [], STAFF_CHANNEL_ID: '', CARGO_MORADOR_ID: '', CARGO_MEMBRO_ID: '', CATEGORY_ID: '', MAINTENANCE_MODE: false };
  }
}

function saveConfig(data) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Erro ao salvar config:', err);
  }
}

function loadStats() {
  try {
    if (!fs.existsSync(STATS_PATH)) {
      const defaults = { pendentes: 0, aprovados: 0, recusados: 0 };
      fs.writeFileSync(STATS_PATH, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    return JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
  } catch (err) {
    console.error('Erro ao carregar stats:', err);
    return { pendentes: 0, aprovados: 0, recusados: 0 };
  }
}

// ─── Builders de cada aba ─────────────────────────────────────────────────────

function buildTabRow(activeTab) {
  const tabs = [
    { id: 'tab_stats',        label: 'Estatísticas',  emoji: '📊' },
    { id: 'tab_roles',        label: 'Cargos Staff',  emoji: '🛡️' },
    { id: 'tab_config',       label: 'Configurações', emoji: '⚙️' },
    { id: 'tab_manutencao',   label: 'Manutenção',    emoji: '🔧' },
    { id: 'tab_mensagens',    label: 'Mensagens',     emoji: '💬' },
  ];

  // Discord permite no máximo 5 botões por linha
  const row = new ActionRowBuilder();
  for (const t of tabs) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(t.id)
        .setLabel(t.label)
        .setEmoji(t.emoji)
        .setStyle(t.id === activeTab ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );
  }
  return row;
}

// ─── ABA: Estatísticas ────────────────────────────────────────────────────────

function buildStatsEmbed() {
  const stats = loadStats();
  const total = stats.pendentes + stats.aprovados + stats.recusados;

  return new EmbedBuilder()
    .setTitle('📊  Painel de Controle — Central de Estatísticas')
    .setColor(0x5865F2)
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1162/1162456.png')
    .setDescription(
      '### 📈 Resumo Geral\n' +
      'Acompanhe o desempenho do recrutamento em tempo real.\n\n' +
      `> **Total de Fichas:** \`${total}\``
    )
    .addFields(
      { name: '🕐 Pendentes', value: `\`\`\`yaml\n${stats.pendentes}\n\`\`\``, inline: true },
      { name: '✅ Aprovados', value: `\`\`\`diff\n+ ${stats.aprovados}\n\`\`\``, inline: true },
      { name: '❌ Recusados', value: `\`\`\`diff\n- ${stats.recusados}\n\`\`\``, inline: true },
    )
    .setFooter({ text: 'Size Management System • Monitoramento' })
    .setTimestamp();
}

function buildStatsRows() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('test_system_btn')
      .setLabel('Testar Sistema')
      .setEmoji('🧪')
      .setStyle(ButtonStyle.Danger)
  );
  return [row];
}

// ─── ABA: Cargos Staff ────────────────────────────────────────────────────────

function buildRolesEmbed() {
  const config = loadConfig();
  const roles = config.STAFF_ROLES ?? [];

  const desc = roles.length === 0
    ? '⚠️ *Nenhum cargo autorizado foi configurado ainda.*'
    : roles.map(id => `> 🛡️ <@&${id}> \`(${id})\``).join('\n');

  return new EmbedBuilder()
    .setTitle('🛡️  Painel de Controle — Gestão de Acessos')
    .setColor(0xED4245)
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1062/1062630.png')
    .setDescription(
      '### 👥 Permissões de Staff\n' +
      'Os cargos listados abaixo possuem permissão para **Aprovar** ou **Reprovar** recrutamentos.\n\n' +
      desc
    )
    .setFooter({ text: 'Size Management System • Segurança' })
    .setTimestamp();
}

function buildRolesRows() {
  const manageRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('add_role_btn')
      .setLabel('Adicionar Cargo')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('list_roles_btn')
      .setLabel('Lista & Remover')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('remove_role_modal_btn')
      .setLabel('Remover por ID')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
  );
  return [manageRow];
}

// ─── ABA: Configurações ───────────────────────────────────────────────────────

function buildConfigEmbed() {
  const config = loadConfig();
  const val = v => (v ? `<#${v}> \`(${v})\`` : '`⚠️ não definido`');
  const valRole = v => (v ? `<@&${v}> \`(${v})\`` : '`⚠️ não definido`');
  const valCat = v => (v ? `📂 \`${v}\`` : '`⚠️ não definido`');

  return new EmbedBuilder()
    .setTitle('⚙️  Painel de Controle — Configurações Gerais')
    .setColor(0xFEE75C)
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/900/900618.png')
    .setDescription(
      '### 🛠️ Ajustes do Sistema\n' +
      'Configure os canais e cargos fundamentais para o funcionamento do bot.\n\n' +
      `**📢 Canal de Solicitações:**\n> ${val(config.STAFF_CHANNEL_ID)}\n\n` +
      `**🏠 Cargo Morador:**\n> ${valRole(config.CARGO_MORADOR_ID)}\n\n` +
      `**👤 Cargo Membro:**\n> ${valRole(config.CARGO_MEMBRO_ID)}\n\n` +
      `**📁 Categoria dos Canais:**\n> ${valCat(config.CATEGORY_ID)}`
    )
    .setFooter({ text: 'Size Management System • Configurações' })
    .setTimestamp();
}

function buildConfigRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('edit_staff_channel')
      .setLabel('Canal Staff')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('edit_cargo_morador')
      .setLabel('Cargo Morador')
      .setEmoji('🏠')
      .setStyle(ButtonStyle.Secondary),
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('edit_cargo_membro')
      .setLabel('Cargo Membro')
      .setEmoji('👤')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('edit_category')
      .setLabel('Categoria')
      .setEmoji('📁')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row1, row2];
}

// ─── ABA: Manutenção ──────────────────────────────────────────────────────────

function buildManutencaoEmbed() {
  const manutencao = isMaintenanceMode();
  const config = loadConfig();

  const statusText = manutencao
    ? '🔴 **ATIVO** — O bot está em modo de manutenção. Todas as interações de usuários estão bloqueadas.'
    : '🟢 **INATIVO** — O bot está operando normalmente.';

  const ativadoPor = config.MAINTENANCE_ACTIVATED_BY
    ? `<@${config.MAINTENANCE_ACTIVATED_BY}>`
    : '`N/A`';

  const ativadoEm = config.MAINTENANCE_ACTIVATED_AT
    ? `<t:${Math.floor(new Date(config.MAINTENANCE_ACTIVATED_AT).getTime() / 1000)}:R>`
    : '`N/A`';

  return new EmbedBuilder()
    .setTitle('🔧  Painel de Controle — Modo Manutenção')
    .setColor(manutencao ? 0xED4245 : 0x57F287)
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/2920/2920349.png')
    .setDescription(
      '### 🛠️ Controle de Manutenção\n' +
      'Quando o modo de manutenção está ativo, qualquer interação de usuários comuns com o bot retornará uma mensagem informando que o bot está em manutenção.\n\n' +
      `**Status Atual:**\n> ${statusText}\n\n` +
      `**Última ativação por:** ${ativadoPor}\n` +
      `**Ativado:** ${ativadoEm}`
    )
    .addFields(
      {
        name: '📋 Como funciona',
        value: '> Ao ativar, usuários sem cargo de staff que tentarem usar o bot receberão uma mensagem de manutenção com botão para chamar suporte.',
        inline: false
      }
    )
    .setFooter({ text: 'Size Management System • Manutenção' })
    .setTimestamp();
}

function buildManutencaoRows() {
  const manutencao = isMaintenanceMode();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('toggle_manutencao_btn')
      .setLabel(manutencao ? '✅ Desativar Manutenção' : '🔴 Ativar Manutenção')
      .setEmoji(manutencao ? '🟢' : '🔴')
      .setStyle(manutencao ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('alert_manutencao_btn')
      .setLabel('🚨 Enviar Alerta para Devs')
      .setEmoji('🚨')
      .setStyle(ButtonStyle.Secondary),
  );

  return [row];
}

// ─── ABA: Mensagens ───────────────────────────────────────────────────────────

function buildMensagensEmbed() {
  return new EmbedBuilder()
    .setTitle('💬  Painel de Controle — Central de Mensagens')
    .setColor(0x5865F2)
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/1041/1041916.png')
    .setDescription(
      '### 📨 Envio e Automação de Mensagens\n' +
      'Use os botões abaixo para enviar mensagens via bot para qualquer canal ou testar a mensagem automática de bom dia.\n\n' +
      `**📢 Canal de Mensagens Automáticas:**\n> <#${AUTO_MSG_CHANNEL_ID}>\n\n` +
      `**🏷️ Cargo Mencionado:**\n> <@&${AUTO_MSG_ROLE_ID}>`
    )
    .addFields(
      {
        name: '🌅 Mensagem de Bom Dia',
        value: `> Enviada automaticamente no canal <#${AUTO_MSG_CHANNEL_ID}> com menção ao cargo <@&${AUTO_MSG_ROLE_ID}>.`,
        inline: false
      },
      {
        name: '📤 Envio Manual',
        value: '> Selecione um canal e escreva a mensagem que será enviada pelo bot.',
        inline: false
      }
    )
    .setFooter({ text: 'Size Management System • Mensagens' })
    .setTimestamp();
}

function buildMensagensRows() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('send_msg_canal_btn')
      .setLabel('Enviar Mensagem em Canal')
      .setEmoji('📤')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('test_bomdia_btn')
      .setLabel('Testar Bom Dia')
      .setEmoji('🌅')
      .setStyle(ButtonStyle.Success),
  );

  return [row1];
}

// ─── Render Principal ─────────────────────────────────────────────────────────

async function renderTab(interaction, tab, edit = false) {
  let embed;
  let extraRows;

  if (tab === 'tab_stats') {
    embed = buildStatsEmbed();
    extraRows = buildStatsRows();
  } else if (tab === 'tab_roles') {
    embed = buildRolesEmbed();
    extraRows = buildRolesRows();
  } else if (tab === 'tab_manutencao') {
    embed = buildManutencaoEmbed();
    extraRows = buildManutencaoRows();
  } else if (tab === 'tab_mensagens') {
    embed = buildMensagensEmbed();
    extraRows = buildMensagensRows();
  } else {
    embed = buildConfigEmbed();
    extraRows = buildConfigRows();
  }

  const tabRow = buildTabRow(tab);
  const components = [tabRow, ...extraRows];

  try {
    if (edit) {
      await interaction.editReply({ embeds: [embed], components });
    } else {
      await interaction.reply({ embeds: [embed], components, ephemeral: true });
    }
  } catch (error) {
    console.error(`Erro ao renderizar aba ${tab}:`, error);
  }
}

function canUsePanel(interaction) {
  return isGerencia(interaction);
}

// ─── Função para construir a mensagem de Bom Dia ──────────────────────────────

function buildBomdiaMessage() {
  const now = new Date();
  const hora = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  const data = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });

  const embed = new EmbedBuilder()
    .setTitle('🌅  Bom Dia, Size!')
    .setColor(0xFEE75C)
    .setDescription(
      `### ☀️ Bom dia a todos!\n\n` +
      `> Que hoje seja um dia incrível para toda a família **Size**!\n\n` +
      `📅 **${data}** — 🕐 ${hora}\n\n` +
      `<@&${AUTO_MSG_ROLE_ID}> — Bom dia a todos os membros! 🎉`
    )
    .setThumbnail('https://cdn-icons-png.flaticon.com/512/869/869869.png')
    .setFooter({ text: 'Size — Bom Dia Automático' })
    .setTimestamp();

  return embed;
}

// ─── Módulo exportado ─────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o painel de controle do bot Size.'),

  async execute(interaction) {
    if (!canUsePanel(interaction)) {
      await interaction.reply({
        content: '❌ **Acesso Negado:** Apenas a Staff autorizada pode acessar o painel de controle.',
        ephemeral: true
      });
      return;
    }
    await renderTab(interaction, 'tab_stats', false);
  },

  async handleButton(interaction) {
    const { customId, client } = interaction;

    if (!canUsePanel(interaction)) {
      await interaction.reply({
        content: '❌ **Acesso Negado:** Apenas a Staff autorizada pode interagir com os controles administrativos.',
        ephemeral: true
      });
      return;
    }

    // ─── Navegação entre abas ──────────────────────────────────────────────────
    if (['tab_stats', 'tab_roles', 'tab_config', 'tab_manutencao', 'tab_mensagens'].includes(customId)) {
      await interaction.deferUpdate();
      return renderTab(interaction, customId, true);
    }

    // ─── Botão: Ativar/Desativar Manutenção ───────────────────────────────────
    if (customId === 'toggle_manutencao_btn') {
      await interaction.deferUpdate();
      const manutencaoAtiva = isMaintenanceMode();

      if (manutencaoAtiva) {
        disableMaintenance(interaction.user.id);
        await sendUpdateLog(client, 'Manutenção Desativada', `O modo de manutenção foi **desativado** por <@${interaction.user.id}>.`, '#57F287');
        await interaction.followUp({
          content: '✅ **Manutenção Desativada:** O bot voltou a operar normalmente.',
          ephemeral: true
        });
      } else {
        enableMaintenance(interaction.user.id);
        await sendMaintenanceAlert(client, interaction.user.id);
        await sendUpdateLog(client, 'Manutenção Ativada', `O modo de manutenção foi **ativado** por <@${interaction.user.id}>. Os devs foram notificados.`, '#ED4245');
        await interaction.followUp({
          content: '🔧 **Manutenção Ativada:** O bot está agora em modo de manutenção. Os desenvolvedores foram alertados via DM.',
          ephemeral: true
        });
      }

      return renderTab(interaction, 'tab_manutencao', true);
    }

    // ─── Botão: Alerta para Devs ──────────────────────────────────────────────
    if (customId === 'alert_manutencao_btn') {
      const modal = new ModalBuilder()
        .setCustomId('modal_alert_devs')
        .setTitle('🚨 Enviar Alerta para Desenvolvedores');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('alert_message_input')
            .setLabel('Mensagem do Alerta')
            .setPlaceholder('Descreva o problema ou motivo do alerta...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(500),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─── Botão: Enviar Mensagem em Canal ──────────────────────────────────────
    if (customId === 'send_msg_canal_btn') {
      const modal = new ModalBuilder()
        .setCustomId('modal_send_msg_canal')
        .setTitle('📤 Enviar Mensagem em Canal');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('canal_id_input')
            .setLabel('ID do Canal')
            .setPlaceholder('Cole o ID do canal onde a mensagem será enviada')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('mensagem_canal_input')
            .setLabel('Mensagem')
            .setPlaceholder('Digite a mensagem que o bot irá enviar...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(2000),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─── Botão: Testar Bom Dia ────────────────────────────────────────────────
    if (customId === 'test_bomdia_btn') {
      await interaction.deferReply({ ephemeral: true });

      try {
        const canal = await client.channels.fetch(AUTO_MSG_CHANNEL_ID).catch(() => null);
        if (!canal) {
          return interaction.editReply({ content: `❌ **Erro:** Não encontrei o canal <#${AUTO_MSG_CHANNEL_ID}>. Verifique se o bot tem acesso.` });
        }

        const embed = buildBomdiaMessage();
        await canal.send({ embeds: [embed] });

        await sendUpdateLog(client, 'Mensagem de Bom Dia Enviada', `Uma mensagem de bom dia foi enviada manualmente por <@${interaction.user.id}> no canal <#${AUTO_MSG_CHANNEL_ID}>.`, '#FEE75C');
        await interaction.editReply({ content: `✅ **Sucesso:** Mensagem de bom dia enviada com sucesso em <#${AUTO_MSG_CHANNEL_ID}>!` });
      } catch (err) {
        await notifyError(client, err, 'Botão Testar Bom Dia');
        await interaction.editReply({ content: '❌ **Erro:** Ocorreu um erro ao enviar a mensagem de bom dia.' });
      }
      return;
    }

    // ─── Botão: Adicionar Cargo ───────────────────────────────────────────────
    if (customId === 'add_role_btn') {
      const modal = new ModalBuilder()
        .setCustomId('modal_add_role')
        .setTitle('🛡️ Adicionar Cargo Autorizado');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_id_input')
            .setLabel('ID ou Menção do Cargo')
            .setPlaceholder('Cole o ID do cargo ou mencione @cargo')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );
      return interaction.showModal(modal);
    }

    if (customId === 'list_roles_btn') {
      const config = loadConfig();
      const roles = config.STAFF_ROLES ?? [];

      if (roles.length === 0) {
        return interaction.reply({
          content: '📋 **Informação:** Não há cargos cadastrados no momento.',
          ephemeral: true
        });
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId('remove_role_select')
        .setPlaceholder('Selecione um cargo para remover...')
        .setMinValues(1)
        .setMaxValues(1);

      for (const id of roles) {
        const role = interaction.guild.roles.cache.get(id);
        const label = role ? role.name : `Cargo ID: ${id}`;
        select.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(label)
            .setDescription(`Remover permissões do cargo ${id}`)
            .setValue(id)
            .setEmoji('🗑️')
        );
      }

      const row = new ActionRowBuilder().addComponents(select);

      return interaction.reply({
        content: '### 📋 Lista Interativa de Cargos\nSelecione um cargo no menu abaixo para **removê-lo** instantaneamente.',
        components: [row],
        ephemeral: true
      });
    }

    if (customId === 'remove_role_modal_btn') {
      const modal = new ModalBuilder()
        .setCustomId('modal_remove_role')
        .setTitle('🗑️ Remover Cargo Autorizado');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_id_remove_input')
            .setLabel('ID do Cargo para Remover')
            .setPlaceholder('Insira o ID numérico do cargo')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );
      return interaction.showModal(modal);
    }

    // ─── Botão: Teste do Sistema ──────────────────────────────────────────────
    if (customId === 'test_system_btn') {
      await interaction.deferReply({ ephemeral: true });
      try {
        const testEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle('🧪 Teste de Sistema')
          .setDescription('Esta é uma mensagem de teste enviada via Painel Administrativo.')
          .addFields({ name: 'Solicitado por', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` })
          .setTimestamp();

        await interaction.user.send({ embeds: [testEmbed] });
        await sendUpdateLog(client, 'Teste de Sistema Executado', `O usuário <@${interaction.user.id}> executou um teste de sistema.`, '#FEE75C');
        await interaction.editReply({ content: '✅ **Sucesso:** A mensagem de teste foi enviada para o seu privado.' });
      } catch (err) {
        await interaction.editReply({ content: '❌ **Erro:** Não consegui enviar a mensagem para o seu privado. Verifique se suas DMs estão abertas.' });
        await notifyError(client, err, 'Botão de Teste do Sistema');
      }
      return;
    }

    const configModalMap = {
      edit_staff_channel: { modalId: 'modal_edit_staff_channel', title: '📢 Canal de Solicitações', label: 'Novo ID do Canal', placeholder: 'Ex: 1497368376920772628' },
      edit_cargo_morador: { modalId: 'modal_edit_cargo_morador', title: '🏠 Cargo Morador', label: 'Novo ID do Cargo', placeholder: 'Ex: 1490151003864043570' },
      edit_cargo_membro: { modalId: 'modal_edit_cargo_membro', title: '👤 Cargo Membro', label: 'Novo ID do Cargo', placeholder: 'Ex: 1490151003864043570' },
      edit_category: { modalId: 'modal_edit_category', title: '📁 Categoria dos Canais', label: 'Novo ID da Categoria', placeholder: 'Ex: 1497388763054342244' },
    };

    if (configModalMap[customId]) {
      const m = configModalMap[customId];
      const modal = new ModalBuilder().setCustomId(m.modalId).setTitle(m.title);
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('config_value_input')
            .setLabel(m.label)
            .setPlaceholder(m.placeholder)
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );
      return interaction.showModal(modal);
    }
  },

  async handleSelectMenu(interaction) {
    if (interaction.customId === 'remove_role_select') {
      if (!canUsePanel(interaction)) {
        return interaction.reply({ content: '❌ Você não tem permissão.', ephemeral: true });
      }

      const roleId = interaction.values[0];
      const config = loadConfig();

      config.STAFF_ROLES = (config.STAFF_ROLES ?? []).filter(r => r !== roleId);
      saveConfig(config);

      await interaction.update({
        content: `✅ **Sucesso:** O cargo <@&${roleId}> foi removido das permissões.`,
        components: [],
      });

      await sendUpdateLog(interaction.client, 'Configuração Alterada', `O cargo <@&${roleId}> foi **removido** da lista de staff autorizada por <@${interaction.user.id}>.`);
    }
  },

  async handleModal(interaction) {
    const { customId, fields, client } = interaction;

    if (!canUsePanel(interaction)) {
      await interaction.reply({ content: '❌ **Erro:** Você não tem permissão para realizar esta ação.', ephemeral: true });
      return;
    }

    const config = loadConfig();

    // ─── Modal: Alerta para Devs ──────────────────────────────────────────────
    if (customId === 'modal_alert_devs') {
      const alertMsg = fields.getTextInputValue('alert_message_input').trim();

      await interaction.deferReply({ ephemeral: true });

      const { sendMaintenanceAlert } = require('../../utils/maintenanceManager');
      const { DEV_NOTIFY_USERS } = require('../../utils/maintenanceManager');
      const { EmbedBuilder } = require('discord.js');

      let enviados = 0;
      for (const userId of DEV_NOTIFY_USERS) {
        try {
          const user = await client.users.fetch(userId).catch(() => null);
          if (user) {
            const embed = new EmbedBuilder()
              .setColor('#FF6B00')
              .setTitle('🚨 Alerta Enviado pela Staff')
              .setDescription(alertMsg)
              .addFields(
                { name: 'Enviado por', value: `<@${interaction.user.id}>`, inline: true },
                { name: 'Servidor', value: interaction.guild?.name || 'N/A', inline: true }
              )
              .setTimestamp();
            await user.send({ embeds: [embed] });
            enviados++;
          }
        } catch (err) {
          console.error(`Erro ao enviar alerta para ${userId}:`, err);
        }
      }

      await sendUpdateLog(client, 'Alerta Enviado para Devs', `<@${interaction.user.id}> enviou um alerta para os desenvolvedores:\n> ${alertMsg}`, '#FF6B00');
      await interaction.editReply({ content: `✅ **Alerta enviado!** Notificação enviada para **${enviados}** desenvolvedor(es) via DM.` });
      return;
    }

    // ─── Modal: Enviar Mensagem em Canal ──────────────────────────────────────
    if (customId === 'modal_send_msg_canal') {
      const canalId = fields.getTextInputValue('canal_id_input').replace(/[<#>]/g, '').trim();
      const mensagem = fields.getTextInputValue('mensagem_canal_input').trim();

      if (!/^\d+$/.test(canalId)) {
        return interaction.reply({ content: '❌ **Erro:** O ID do canal deve conter apenas números.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const canal = await client.channels.fetch(canalId).catch(() => null);
        if (!canal) {
          return interaction.editReply({ content: `❌ **Erro:** Canal \`${canalId}\` não encontrado. Verifique o ID e se o bot tem acesso.` });
        }

        await canal.send({ content: mensagem });

        await sendUpdateLog(client, 'Mensagem Enviada via Painel', `<@${interaction.user.id}> enviou uma mensagem no canal <#${canalId}>:\n> ${mensagem.slice(0, 200)}${mensagem.length > 200 ? '...' : ''}`, '#5865F2');
        await interaction.editReply({ content: `✅ **Sucesso:** Mensagem enviada com sucesso em <#${canalId}>!` });
      } catch (err) {
        await notifyError(client, err, 'Modal Enviar Mensagem em Canal');
        await interaction.editReply({ content: '❌ **Erro:** Não foi possível enviar a mensagem. Verifique as permissões do bot no canal.' });
      }
      return;
    }

    // ─── Modal: Adicionar Cargo ───────────────────────────────────────────────
    if (customId === 'modal_add_role') {
      let roleId = fields.getTextInputValue('role_id_input').replace(/[<@&>]/g, '').trim();

      if (!/^\d+$/.test(roleId)) {
        return interaction.reply({ content: '❌ **Erro:** O ID do cargo deve conter apenas números.', ephemeral: true });
      }

      if (!config.STAFF_ROLES) config.STAFF_ROLES = [];
      if (!config.STAFF_ROLES.includes(roleId)) {
        config.STAFF_ROLES.push(roleId);
        saveConfig(config);
        await interaction.deferUpdate();
        await renderTab(interaction, 'tab_roles', true);

        await sendUpdateLog(client, 'Configuração Alterada', `O cargo <@&${roleId}> foi **adicionado** à lista de staff autorizada por <@${interaction.user.id}>.`);
        return interaction.followUp({ content: `✅ **Sucesso:** Cargo <@&${roleId}> adicionado com sucesso!`, ephemeral: true });
      } else {
        return interaction.reply({ content: '⚠️ **Aviso:** Este cargo já está na lista de autorizados.', ephemeral: true });
      }
    }

    // ─── Modal: Remover Cargo ─────────────────────────────────────────────────
    if (customId === 'modal_remove_role') {
      let roleId = fields.getTextInputValue('role_id_remove_input').replace(/[<@&>]/g, '').trim();

      if (!config.STAFF_ROLES || !config.STAFF_ROLES.includes(roleId)) {
        return interaction.reply({ content: '❌ **Erro:** Este ID de cargo não foi encontrado na lista.', ephemeral: true });
      }

      config.STAFF_ROLES = config.STAFF_ROLES.filter(r => r !== roleId);
      saveConfig(config);
      await interaction.deferUpdate();
      await renderTab(interaction, 'tab_roles', true);

      await sendUpdateLog(client, 'Configuração Alterada', `O cargo <@&${roleId}> foi **removido** da lista de staff autorizada por <@${interaction.user.id}>.`);
      return interaction.followUp({ content: '✅ **Sucesso:** O cargo foi removido das permissões.', ephemeral: true });
    }

    // ─── Modais de Configuração ───────────────────────────────────────────────
    const configUpdateMap = {
      modal_edit_staff_channel: 'STAFF_CHANNEL_ID',
      modal_edit_cargo_morador: 'CARGO_MORADOR_ID',
      modal_edit_cargo_membro: 'CARGO_MEMBRO_ID',
      modal_edit_category: 'CATEGORY_ID',
    };

    if (configUpdateMap[customId]) {
      const key = configUpdateMap[customId];
      const value = fields.getTextInputValue('config_value_input').trim();

      if (!/^\d+$/.test(value)) {
        return interaction.reply({ content: '❌ **Erro:** O ID deve conter apenas números.', ephemeral: true });
      }

      const oldValue = config[key];
      config[key] = value;
      saveConfig(config);
      await interaction.deferUpdate();
      await renderTab(interaction, 'tab_config', true);

      await sendUpdateLog(client, 'Configuração Alterada', `A configuração **${key}** foi alterada de \`${oldValue || 'vazio'}\` para \`${value}\` por <@${interaction.user.id}>.`);
      return interaction.followUp({ content: `✅ **Sucesso:** Configuração atualizada com sucesso!`, ephemeral: true });
    }
  },

  // Expõe a função buildBomdiaMessage para uso externo (agendador)
  buildBomdiaMessage,
  AUTO_MSG_CHANNEL_ID,
  AUTO_MSG_ROLE_ID,
};
