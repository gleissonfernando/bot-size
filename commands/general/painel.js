const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { isRegisteredUser, isGerencia, denyNotRegistered } = require('../../utils/permissions');

// ─── Caminhos dos arquivos de configuração ────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const STATS_PATH = path.join(__dirname, '..', 'stats.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    const defaults = {
      STAFF_ROLES: [],
      STAFF_CHANNEL_ID: '',
      CARGO_MORADOR_ID: '',
      CARGO_MEMBRO_ID: '',
      CATEGORY_ID: '',
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function saveConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function loadStats() {
  if (!fs.existsSync(STATS_PATH)) {
    const defaults = { pendentes: 0, aprovados: 0, recusados: 0 };
    fs.writeFileSync(STATS_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(STATS_PATH, 'utf8'));
}

// ─── Builders de cada aba ─────────────────────────────────────────────────────

/** Botões de navegação entre abas */
function buildTabRow(activeTab) {
  const tabs = [
    { id: 'tab_stats', label: 'Estatísticas', emoji: '📊' },
    { id: 'tab_roles', label: 'Cargos', emoji: '🛡️' },
    { id: 'tab_config', label: 'Configurações', emoji: '⚙️' },
  ];

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

// ── ABA 1 – Estatísticas ──────────────────────────────────────────────────────
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

// ── ABA 2 – Cargos Autorizados ────────────────────────────────────────────────
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

function buildRolesRows(config) {
  const manageRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('add_role_btn')
      .setLabel('Adicionar Cargo')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('list_roles_btn')
      .setLabel('Lista Detalhada')
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

// ── ABA 3 – Configurações ─────────────────────────────────────────────────────
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

// ─── Função central: renderiza a aba ─────────────────────────────────────────
async function renderTab(interaction, tab, edit = false) {
  const config = loadConfig();
  let embed;
  let extraRows;

  if (tab === 'tab_stats') {
    embed = buildStatsEmbed();
    extraRows = [];
  } else if (tab === 'tab_roles') {
    embed = buildRolesEmbed();
    extraRows = buildRolesRows(config);
  } else {
    embed = buildConfigEmbed();
    extraRows = buildConfigRows();
  }

  const tabRow = buildTabRow(tab);
  const components = [tabRow, ...extraRows];

  if (edit) {
    await interaction.editReply({ embeds: [embed], components });
  } else {
    await interaction.reply({ embeds: [embed], components });
  }
}

function canUsePanel(interaction) {
  if (!isRegisteredUser(interaction)) return false;
  if (!isGerencia(interaction)) return false;
  return true;
}

// ─── Definição do Slash Command ───────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Abre o painel de controle do bot Size.'),

  async execute(interaction) {
    await renderTab(interaction, 'tab_stats', false);
  },

  async handleButton(interaction) {
    const { customId } = interaction;

    if (!canUsePanel(interaction)) {
      await interaction.reply({ content: '❌ **Acesso Negado:** Apenas a Staff autorizada pode interagir com o painel administrativo.', ephemeral: true });
      return;
    }

    if (['tab_stats', 'tab_roles', 'tab_config'].includes(customId)) {
      await interaction.deferUpdate();
      return renderTab(interaction, customId, true);
    }

    if (customId.startsWith('remove_role_')) {
      const roleId = customId.replace('remove_role_', '');
      const config = loadConfig();
      config.STAFF_ROLES = (config.STAFF_ROLES ?? []).filter(r => r !== roleId);
      saveConfig(config);

      await interaction.deferUpdate();
      await renderTab(interaction, 'tab_roles', true);
      return interaction.followUp({ content: '✅ **Sucesso:** O cargo foi removido das permissões.', ephemeral: true });
    }

    if (customId === 'add_role_btn') {
      const modal = new ModalBuilder()
        .setCustomId('modal_add_role')
        .setTitle('🛡️ Adicionar Cargo Autorizado');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_id_input')
            .setLabel('ID ou Menção do Cargo')
            .setPlaceholder('Ex: 123456789012345678')
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

      const listText = roles.map((id, idx) => `**${idx + 1}.** <@&${id}> (\`${id}\`)`).join('\n');
      return interaction.reply({
        content: `### 📋 Lista de Cargos Autorizados\n${listText}`,
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
            .setPlaceholder('Ex: 123456789012345678')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );

      return interaction.showModal(modal);
    }

    const configModalMap = {
      edit_staff_channel: { modalId: 'modal_edit_staff_channel', title: '📢 Canal de Solicitações', label: 'Novo ID do Canal', placeholder: 'Ex: 123456789012345678' },
      edit_cargo_morador: { modalId: 'modal_edit_cargo_morador', title: '🏠 Cargo Morador', label: 'Novo ID do Cargo', placeholder: 'Ex: 123456789012345678' },
      edit_cargo_membro: { modalId: 'modal_edit_cargo_membro', title: '👤 Cargo Membro', label: 'Novo ID do Cargo', placeholder: 'Ex: 123456789012345678' },
      edit_category: { modalId: 'modal_edit_category', title: '📁 Categoria dos Canais', label: 'Novo ID da Categoria', placeholder: 'Ex: 123456789012345678' },
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

  async handleModal(interaction) {
    const { customId, fields } = interaction;

    if (!canUsePanel(interaction)) {
      await interaction.reply({ content: '❌ **Erro:** Você não tem permissão para realizar esta ação.', ephemeral: true });
      return;
    }

    const config = loadConfig();

    if (customId === 'modal_add_role') {
      let roleId = fields.getTextInputValue('role_id_input').replace(/[<@&>]/g, '');
      if (!config.STAFF_ROLES) config.STAFF_ROLES = [];
      if (!config.STAFF_ROLES.includes(roleId)) {
        config.STAFF_ROLES.push(roleId);
        saveConfig(config);
      }
      await interaction.deferUpdate();
      return renderTab(interaction, 'tab_roles', true);
    }

    if (customId === 'modal_remove_role') {
      let roleId = fields.getTextInputValue('role_id_remove_input').replace(/[<@&>]/g, '');
      config.STAFF_ROLES = (config.STAFF_ROLES ?? []).filter(r => r !== roleId);
      saveConfig(config);
      await interaction.deferUpdate();
      return renderTab(interaction, 'tab_roles', true);
    }

    const configUpdateMap = {
      modal_edit_staff_channel: 'STAFF_CHANNEL_ID',
      modal_edit_cargo_morador: 'CARGO_MORADOR_ID',
      modal_edit_cargo_membro: 'CARGO_MEMBRO_ID',
      modal_edit_category: 'CATEGORY_ID',
    };

    if (configUpdateMap[customId]) {
      const key = configUpdateMap[customId];
      config[key] = fields.getTextInputValue('config_value_input').trim();
      saveConfig(config);
      await interaction.deferUpdate();
      return renderTab(interaction, 'tab_config', true);
    }
  },
};
