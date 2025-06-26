const { PermissionFlagsBits } = require("discord.js");
const { addReactionRole } = require("../utils/reactionRoleUtils");

module.exports = {
  name: "reactionroles-setup",
  description: "Configura un mensaje de roles por reacción.",
  defaultMemberPermissions: PermissionFlagsBits.ManageRoles,
  options: [
    {
      name: "canal",
      description: "ID del canal donde está el mensaje",
      type: 7, // CHANNEL
      required: true,
      channelTypes: [0], // GUILD_TEXT
    },
    {
      name: "mensaje",
      description: "ID del mensaje a configurar",
      type: 3, // STRING
      required: true,
    },
    {
      name: "emoji",
      description: "Emoji para la reacción (puede ser personalizado o estándar)",
      type: 3, // STRING
      required: true,
    },
    {
      name: "rol",
      description: "Rol a asignar",
      type: 8, // ROLE
      required: true,
    },
    {
      name: "unico",
      description: "¿Este rol debe ser único en su categoría?",
      type: 5, // BOOLEAN
      required: false,
    },
    {
      name: "categoria",
      description: "Categoría para agrupar roles únicos (opcional)",
      type: 3, // STRING
      required: false,
    },
    {
      name: "limite",
      description: "Máximo de usuarios que pueden tener este rol (opcional)",
      type: 4, // INTEGER
      required: false,
    },
  ],
  async execute(_, interaction) {
    const channel = interaction.options.getChannel("canal");
    const messageId = interaction.options.getString("mensaje");
    const emoji = interaction.options.getString("emoji");
    const roleId = interaction.options.getRole("rol").id;
    const unique = interaction.options.getBoolean("unico") || false;
    const category = interaction.options.getString("categoria") || null;
    const limit = interaction.options.getInteger("limite") || null;

    // Buscar si ya existe configuración para ese mensaje
    const existing = await require("../utils/reactionRoleUtils").getReactionRoles(interaction.guildId);
    let config = existing.find(r => r.messageId === messageId && r.channelId === channel.id);
    if (!config) {
      // Crear nueva configuración para el mensaje
      await addReactionRole({
        guildId: interaction.guildId,
        channelId: channel.id,
        messageId,
        roles: [{ roleId, emoji, category, unique, limit }],
      });
    } else {
      // Agregar el nuevo rol a la configuración existente
      config.roles.push({ roleId, emoji, category, unique, limit });
      await config.save();
    }

    // Intentar agregar la reacción automáticamente solo si no existe
    let reactionOK = false;
    try {
      const msg = await channel.messages.fetch(messageId);
      const alreadyReacted = msg.reactions.cache.has(emoji) || msg.reactions.cache.some(r => r.emoji.name === emoji || r.emoji.toString() === emoji);
      if (!alreadyReacted) {
        await msg.react(emoji);
        reactionOK = true;
      } else {
        reactionOK = true;
      }
    } catch (e) {
      reactionOK = false;
    }

    const { EmbedBuilder } = require("discord.js");
    const embed = new EmbedBuilder()
      .setTitle("✅ Rol por reacción configurado")
      .setColor("#5865F2")
      .addFields(
        { name: "Canal", value: `<#${channel.id}>`, inline: true },
        { name: "Mensaje", value: messageId, inline: true },
        { name: "Emoji", value: emoji, inline: true },
        { name: "Rol", value: `<@&${roleId}>`, inline: true },
        { name: "Único", value: unique ? "Sí" : "No", inline: true },
        { name: "Categoría", value: category ? category : "Ninguna", inline: true },
        { name: "Límite", value: limit ? limit.toString() : "Sin límite", inline: true },
        { name: "Reacción agregada", value: reactionOK ? "✅ Sí" : "❌ No (verifica permisos y el emoji)", inline: false }
      )
      .setFooter({ text: "Sistema de roles por reacción" })
      .setTimestamp();
    interaction.reply({ embeds: [embed], flags: 64 });
  },
};
