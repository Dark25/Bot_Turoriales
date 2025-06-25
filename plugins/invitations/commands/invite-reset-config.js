const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const InviteConfig = require("../schemas/InviteConfig");

module.exports = {
	name: "invite-reset-config",
	description: "Resetea la configuración del sistema de invitaciones",
	defaultMemberPermissions: PermissionFlagsBits.ManageGuild,

	async execute(_, interaction) {
		try {
			// Verificar permisos
			if (
				!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
			) {
				return await interaction.reply({
					content:
						"❌ No tienes permisos para resetear la configuración del sistema de invitaciones.",
					ephemeral: true,
				});
			}

			// Eliminar configuración existente
			await InviteConfig.deleteOne({ guildId: interaction.guild.id });

			const embed = new EmbedBuilder()
				.setColor("#ff6b6b")
				.setTitle("🔄 Configuración Reseteada")
				.setDescription(
					"La configuración del sistema de invitaciones ha sido reseteada a los valores predeterminados.",
				)
				.addFields([
					{
						name: "📢 Canal de notificaciones",
						value:
							"Sistema automático (busca canales como #general, #bienvenida, etc.)",
						inline: false,
					},
					{
						name: "🛡️ Anti-fake",
						value: "✅ Activado (predeterminado)",
						inline: false,
					},
				])
				.setTimestamp()
				.setFooter({
					text: `Reseteado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando invite-reset-config:", error);
			await interaction.reply({
				content:
					"❌ Ocurrió un error al resetear la configuración del sistema de invitaciones.",
				ephemeral: true,
			});
		}
	},
};
