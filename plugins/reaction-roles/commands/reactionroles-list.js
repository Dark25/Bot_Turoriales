const { getReactionRoles } = require("../utils/reactionRoleUtils");

module.exports = {
  name: "reactionroles-list",
  description: "Lista los mensajes de roles por reacción configurados.",
  options: [
    {
      name: "mensaje",
      description: "Filtrar por ID de mensaje (usa autocompletado)",
      type: 3, // STRING
      required: false,
      autocomplete: true,
    },
  ],
  async autocomplete(interaction) {
    // Autocompletado de mensajes configurados
    const focused = interaction.options.getFocused();
    const roles = await getReactionRoles(interaction.guildId);
    const choices = roles.map(r => ({
      name: `Canal: #${interaction.guild.channels.cache.get(r.channelId)?.name || r.channelId} | Mensaje: ${r.messageId}`,
      value: r.messageId
    }));
    const filtered = choices.filter(c => c.value.startsWith(focused));
    await interaction.respond(filtered.slice(0, 25));
  },
  async execute(_, interaction) {
    const { EmbedBuilder } = require("discord.js");
    const filterMessageId = interaction.options.getString("mensaje");
    const roles = await getReactionRoles(interaction.guildId);
    const filteredRoles = filterMessageId ? roles.filter(r => r.messageId === filterMessageId) : roles;
    if (!filteredRoles.length) {
      const embed = new EmbedBuilder()
        .setTitle("❌ No hay mensajes de roles por reacción configurados.")
        .setColor("#ED4245")
        .setFooter({ text: "Sistema de roles por reacción" })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], flags: 64 });
    }
    const embed = new EmbedBuilder()
      .setTitle("📋 Mensajes de roles por reacción")
      .setColor("#5865F2")
      .setFooter({ text: "Sistema de roles por reacción" })
      .setTimestamp();
    for (const r of filteredRoles) {
      embed.addFields({
        name: `Canal: <#${r.channelId}> | Mensaje: ${r.messageId}`,
        value: r.roles.map(x => `${x.emoji} <@&${x.roleId}>${x.unique ? " (Único)" : ""}${x.category ? ` [${x.category}]` : ""}${x.limit ? ` (Límite: ${x.limit})` : ""}`).join("\n"),
        inline: false
      });
    }
    interaction.reply({ embeds: [embed], flags: 64 });
  },
};
