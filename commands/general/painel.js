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
    { id: 'tab_stats', label: '📊 Estatísticas' },
    { id: 'tab_roles', label: '🛡️ Cargos' },
    { id: 'tab_config', label: '⚙️ Configurações' },
  ];

  const row = new ActionRowBuilder();
  for (const t of tabs) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(t.id)
        .setLabel(t.label)
        .setStyle(t.id === activeTab ? ButtonStyle.Primary : ButtonStyle.Secondary),
    );
  }
  return row;
}

// ── ABA 1 – Estatísticas ──────────────────────────────────────────────────────
function buildStatsEmbed() {
  const stats = loadStats();
  return new EmbedBuilder()
    .setTitle('📊  Painel de Controle — Estatísticas')
    .setColor(0x5865F2)
    .setDescription('Acompanhe os sets em tempo real.')
    .addFields(
      { name: '🕐 Pendentes', value: `\`\`\`${stats.pendentes}\`\`\``, inline: true },
      { name: '✅ Aprovados', value: `\`\`\`${stats.aprovados}\`\`\``, inline: true },
      { name: '❌ Recusados', value: `\`\`\`${stats.recusados}\`\`\``, inline: true },
    )
    .setFooter({ text: 'Bot Size • Painel Gerência' })
    .setTimestamp();
}

// ── ABA 2 – Cargos Autorizados ────────────────────────────────────────────────
function buildRolesEmbed() {
  const config = loadConfig();
  const roles = config.STAFF_ROLES ?? [];

  const desc = roles.length === 0
    ? '*Nenhum cargo autorizado ainda.*'
    : roles.map(id => `• <@&${id}>  \`${id}\``).join('\n');

  return new EmbedBuilder()
    .setTitle('🛡️  Painel de Controle — Cargos Autorizados')
    .setColor(0xED4245)
    .setDescription('**Cargos que podem aceitar/recusar sets:**\n\n' + desc)
    .setFooter({ text: 'Bot Size • Painel Gerência' })
    .setTimestamp();
}

function buildRolesRows(config) {
  const roles = config.STAFF_ROLES ?? [];
  const rows = [];

  let currentRow = new ActionRowBuilder();
  let countInRow = 0;

  for (const roleId of roles.slice(0, 20)) {
    if (countInRow === 5) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
      countInRow = 0;
    }
    currentRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`remove_role_${roleId}`)
        .setLabel(`− ${roleId}`)
        .setStyle(ButtonStyle.Danger),
    );
    countInRow++;
  }

  if (countInRow > 0) rows.push(currentRow);

  const manageRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('add_role_btn')
      .setLabel('+ Adicionar Cargo')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('list_roles_btn')
      .setLabel('📋 Listar Cargos')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('remove_role_modal_btn')
      .setLabel('🗑️ Remover por ID')
      .setStyle(ButtonStyle.Danger),
  );
  rows.push(manageRow);

  return rows.slice(0, 5);
}

// ── ABA 3 – Configurações ─────────────────────────────────────────────────────
function buildConfigEmbed() {
  const config = loadConfig();
  const val = v => (v ? `\`${v}\`` : '`não definido`');

  return new EmbedBuilder()
    .setTitle('⚙️  Painel de Controle — Configurações')
    .setColor(0xFEE75C)
    .setDescription('Clique em **Editar** para alterar cada valor.')
    .addFields(
      { name: '📢 Canal de Solicitações', value: val(config.STAFF_CHANNEL_ID), inline: false },
      { name: '🏠 Cargo Morador', value: val(config.CARGO_MORADOR_ID), inline: true },
      { name: '👤 Cargo Membro', value: val(config.CARGO_MEMBRO_ID), inline: true },
      { name: '📁 Categoria dos Canais', value: val(config.CATEGORY_ID), inline: false },
    )
    .setFooter({ text: 'Bot Size • Painel Gerência' })
    .setTimestamp();
}

function buildConfigRows() {
  const fields = [
    { id: 'edit_staff_channel', label: 'Editar Canal de Solicitações' },
    { id: 'edit_cargo_morador', label: 'Editar Cargo Morador' },
    { id: 'edit_cargo_membro', label: 'Editar Cargo Membro' },
    { id: 'edit_category', label: 'Editar Categoria' },
  ];

  const row = new ActionRowBuilder();
  for (const f of fields) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(f.id)
        .setLabel(f.label)
        .setStyle(ButtonStyle.Secondary),
    );
  }
  return [row];
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
    await interaction.reply({ embeds: [embed], components, ephemeral: true });
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
    if (!isRegisteredUser(interaction)) {
      await denyNotRegistered(interaction);
      return;
    }

    if (!isGerencia(interaction)) {
      await interaction.reply({
        content: '❌ Você não está cadastrado no sistema.',
        ephemeral: true,
      });
      return;
    }

    await renderTab(interaction, 'tab_stats', false);
  },

  async handleButton(interaction) {
    const { customId } = interaction;

    if (!canUsePanel(interaction)) {
      await interaction.reply({ content: '❌ Você não está cadastrado no sistema.', ephemeral: true });
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
      return interaction.followUp({ content: '✅ Cargo removido da lista.', ephemeral: true });
    }

    if (customId === 'add_role_btn') {
      const modal = new ModalBuilder()
        .setCustomId('modal_add_role')
        .setTitle('Adicionar Cargo Autorizado');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_id_input')
            .setLabel('ID ou menção do cargo')
            .setPlaceholder('@cargo ou ID numérico')
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
          content: '📋 Nenhum cargo cadastrado no painel.',
          ephemeral: true
        });
      }

      const listText = roles.map((id, idx) => `${idx + 1}. <@&${id}> (\`${id}\`)`).join('\n');
      return interaction.reply({
        content: `📋 **Cargos cadastrados no painel:**\n${listText}`,
        ephemeral: true
      });
    }

    if (customId === 'remove_role_modal_btn') {
      const modal = new ModalBuilder()
        .setCustomId('modal_remove_role')
        .setTitle('Remover Cargo Autorizado');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('role_id_remove_input')
            .setLabel('ID ou menção do cargo')
            .setPlaceholder('@cargo ou ID numérico')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );

      return interaction.showModal(modal);
    }

    const configModalMap = {
      edit_staff_channel: { modalId: 'modal_edit_staff_channel', title: 'Canal de Solicitações', label: 'Novo ID do canal', placeholder: 'Ex: 123456789012345678' },
      edit_cargo_morador: { modalId: 'modal_edit_cargo_morador', title: 'Cargo Morador', label: 'Novo ID do cargo', placeholder: 'Ex: 123456789012345678' },
      edit_cargo_membro: { modalId: 'modal_edit_cargo_membro', title: 'Cargo Membro', label: 'Novo ID do cargo', placeholder: 'Ex: 123456789012345678' },
      edit_category: { modalId: 'modal_edit_category', title: 'Categoria dos Canais', label: 'Novo ID da categoria', placeholder: 'Ex: 123456789012345678' },
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
    const { customId } = interaction;

    if (!canUsePanel(interaction)) {
      await interaction.reply({ content: '❌ Você não está cadastrado no sistema.', ephemeral: true });
      return;
    }

    if (customId === 'modal_add_role') {
      let raw = interaction.fields.getTextInputValue('role_id_input').trim();
      raw = raw.replace(/^<@&/, '').replace(/>$/, '');

      const config = loadConfig();
      const roles = config.STAFF_ROLES ?? [];

      if (roles.includes(raw)) {
        return interaction.reply({ content: '⚠️ Esse cargo já está autorizado.', ephemeral: true });
      }

      let role;
      try {
        role = await interaction.guild.roles.fetch(raw);
      } catch {
        role = null;
      }

      if (!role) {
        return interaction.reply({ content: '❌ Cargo não encontrado no servidor.', ephemeral: true });
      }

      config.STAFF_ROLES = [...roles, raw];
      saveConfig(config);

      await interaction.deferUpdate();
      await renderTab(interaction, 'tab_roles', true);
      return interaction.followUp({ content: `✅ Cargo **${role.name}** adicionado com sucesso.`, ephemeral: true });
    }

    if (customId === 'modal_remove_role') {
      let raw = interaction.fields.getTextInputValue('role_id_remove_input').trim();
      raw = raw.replace(/^<@&/, '').replace(/>$/, '');

      const config = loadConfig();
      const roles = config.STAFF_ROLES ?? [];

      if (!roles.includes(raw)) {
        return interaction.reply({ content: '⚠️ Esse cargo não está cadastrado no painel.', ephemeral: true });
      }

      config.STAFF_ROLES = roles.filter(r => r !== raw);
      saveConfig(config);

      await interaction.deferUpdate();
      await renderTab(interaction, 'tab_roles', true);
      return interaction.followUp({ content: `✅ Cargo \`${raw}\` removido com sucesso.`, ephemeral: true });
    }

    const configModalFields = {
      modal_edit_staff_channel: 'STAFF_CHANNEL_ID',
      modal_edit_cargo_morador: 'CARGO_MORADOR_ID',
      modal_edit_cargo_membro: 'CARGO_MEMBRO_ID',
      modal_edit_category: 'CATEGORY_ID',
    };

    if (configModalFields[customId]) {
      const field = configModalFields[customId];
      const value = interaction.fields.getTextInputValue('config_value_input').trim();

      const config = loadConfig();
      config[field] = value;
      saveConfig(config);

      await interaction.deferUpdate();
      await renderTab(interaction, 'tab_config', true);
      return interaction.followUp({ content: `✅ **${field}** atualizado para \`${value}\`.`, ephemeral: true });
    }
  },
};
