const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const InviteConfig = require("../schemas/InviteConfig");

module.exports = {
	name: "invite-config",
	description: "Muestra la configuración actual del sistema de invitaciones",
	defaultMemberPermissions: PermissionFlagsBits.ManageGuild,

	async execute(_, interaction) {
		try {
			// Verificar permisos
			if (
				!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
			) {
				return await interaction.reply({
					content:
						"❌ No tienes permisos para ver la configuración del sistema de invitaciones.",
					ephemeral: true,
				});
			}

			// Obtener configuración
			const config = await InviteConfig.findOne({
				guildId: interaction.guild.id,
			});

			const embed = new EmbedBuilder()
				.setColor("#4c9aff")
				.setTitle("⚙️ Configuración del Sistema de Invitaciones")
				.addFields([
					{
						name: "📢 Canal de notificaciones",
						value: config?.channelId
							? `<#${config.channelId}>`
							: "❌ No configurado (se usará canal automático)",
						inline: false,
					},
					{
						name: "🛡️ Anti-fake",
						value: config
							? config.antiFake
								? "✅ Activado"
								: "❌ Desactivado"
							: "✅ Activado (predeterminado)",
						inline: false,
					},
					{
						name: "📅 Última actualización",
						value: config?.updatedAt
							? `<t:${Math.floor(config.updatedAt.getTime() / 1000)}:R>`
							: "❌ Nunca configurado",
						inline: false,
					},
				])
				.setTimestamp()
				.setFooter({
					text: `Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				});

			if (!config) {
				embed.setDescription(
					"⚠️ El sistema de invitaciones no ha sido configurado aún. Usa `/invite-setup` para configurarlo.",
				);
			}

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando invite-config:", error);
			await interaction.reply({
				content:
					"❌ Ocurrió un error al obtener la configuración del sistema de invitaciones.",
				ephemeral: true,
			});
		}
	},
};
