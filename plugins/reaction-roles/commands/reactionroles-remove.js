const { PermissionFlagsBits } = require("discord.js");
const { removeReactionRole } = require("../utils/reactionRoleUtils");

module.exports = {
  name: "reactionroles-remove",
  description: "Elimina un rol de un mensaje de roles por reacción.",
  defaultMemberPermissions: PermissionFlagsBits.ManageRoles,
  options: [
    {
      name: "mensaje",
      description: "ID del mensaje (usa autocompletado)",
      type: 3, // STRING
      required: true,
      autocomplete: true,
    },
    {
      name: "rol",
      description: "Rol a eliminar",
      type: 8, // ROLE
      required: true,
    },
  ],
  async autocomplete(interaction) {
    // Autocompletado de mensajes configurados
    const focused = interaction.options.getFocused();
    const { getReactionRoles } = require("../utils/reactionRoleUtils");
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
    const messageId = interaction.options.getString("mensaje");
    const roleId = interaction.options.getRole("rol").id;
    await removeReactionRole(interaction.guildId, messageId, roleId);
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Rol eliminado del mensaje de roles por reacción")
      .setColor("#ED4245")
      .addFields(
        { name: "Mensaje", value: messageId, inline: true },
        { name: "Rol", value: `<@&${roleId}>`, inline: true }
      )
      .setFooter({ text: "Sistema de roles por reacción" })
      .setTimestamp();
    interaction.reply({ embeds: [embed], flags: 64 });
  },
};
