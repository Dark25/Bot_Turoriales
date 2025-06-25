const {
	EmbedBuilder,
	PermissionFlagsBits,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");
const InviteStats = require("../schemas/InviteStats");
const InvitationData = require("../schemas/InvitationData");

module.exports = {
	name: "invite-reset",
	description: "Resetea las invitaciones de un usuario o de todo el servidor",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	options: [
		{
			name: "usuario",
			description: "Resetea las invitaciones de un usuario",
			type: 1,
			options: [
				{
					name: "usuario",
					description: "Usuario a resetear",
					type: 6,
					required: true,
				},
			],
		},
		{
			name: "servidor",
			description: "Resetea todas las invitaciones del servidor",
			type: 1,
		},
	],

	async execute(_, interaction) {
		try {
			// Verificar permisos
			if (
				!interaction.member.permissions.has(PermissionFlagsBits.Administrator)
			) {
				return await interaction.reply({
					content:
						"❌ Necesitas permisos de administrador para usar este comando.",
					ephemeral: true,
				});
			}

			const subcommand = interaction.options.getSubcommand();
			const guildId = interaction.guild.id;

			if (subcommand === "usuario") {
				const targetUser = interaction.options.getUser("usuario");

				// Buscar estadísticas del usuario
				const stats = await InviteStats.findOne({
					guildId,
					userId: targetUser.id,
				});

				if (!stats) {
					return await interaction.reply({
						content: "❌ Este usuario no tiene estadísticas de invitaciones.",
						ephemeral: true,
					});
				}

				// Crear botones de confirmación
				const confirmButton = new ButtonBuilder()
					.setCustomId(`confirm_reset_user_${targetUser.id}`)
					.setLabel("Confirmar Reset")
					.setStyle(ButtonStyle.Danger)
					.setEmoji("✅");

				const cancelButton = new ButtonBuilder()
					.setCustomId("cancel_reset")
					.setLabel("Cancelar")
					.setStyle(ButtonStyle.Secondary)
					.setEmoji("❌");

				const row = new ActionRowBuilder().addComponents(
					confirmButton,
					cancelButton,
				);

				const embed = new EmbedBuilder()
					.setColor("#ff6b6b")
					.setTitle("⚠️ Confirmar Reset de Usuario")
					.setDescription(
						`¿Estás seguro de que quieres resetear las invitaciones de **${targetUser.tag}**?`,
					)
					.addFields([
						{
							name: "📊 Estadísticas actuales",
							value: `✅ Válidas: ${stats.validInvites}\n⭐ Bonus: ${stats.bonusInvites}\n❌ Falsas: ${stats.fakeInvites}\n👋 Se fueron: ${stats.leftInvites}`,
							inline: false,
						},
					])
					.setFooter({ text: "Esta acción no se puede deshacer" });

				await interaction.reply({
					embeds: [embed],
					components: [row],
					ephemeral: true,
				});
			} else if (subcommand === "servidor") {
				// Crear botones de confirmación para el servidor
				const confirmButton = new ButtonBuilder()
					.setCustomId("confirm_reset_server")
					.setLabel("Confirmar Reset Total")
					.setStyle(ButtonStyle.Danger)
					.setEmoji("🗑️");

				const cancelButton = new ButtonBuilder()
					.setCustomId("cancel_reset")
					.setLabel("Cancelar")
					.setStyle(ButtonStyle.Secondary)
					.setEmoji("❌");

				const row = new ActionRowBuilder().addComponents(
					confirmButton,
					cancelButton,
				);

				const totalStats = await InviteStats.countDocuments({ guildId });
				const totalInvitations = await InvitationData.countDocuments({
					guildId,
				});

				const embed = new EmbedBuilder()
					.setColor("#ff6b6b")
					.setTitle("🚨 Confirmar Reset Total del Servidor")
					.setDescription(
						"¿Estás **ABSOLUTAMENTE SEGURO** de que quieres resetear **TODAS** las invitaciones del servidor?",
					)
					.addFields([
						{
							name: "📊 Datos que se eliminarán",
							value: `👥 ${totalStats} usuarios con estadísticas\n📝 ${totalInvitations} registros de invitaciones`,
							inline: false,
						},
						{
							name: "⚠️ ADVERTENCIA",
							value:
								"Esta acción es **IRREVERSIBLE** y eliminará todos los datos de invitaciones del servidor.",
							inline: false,
						},
					])
					.setFooter({ text: "Confirma solo si estás completamente seguro" });

				await interaction.reply({
					embeds: [embed],
					components: [row],
					ephemeral: true,
				});
			}

			// Manejar las respuestas de los botones
			const collector = interaction.channel.createMessageComponentCollector({
				filter: (i) => i.user.id === interaction.user.id,
				time: 30000,
			});

			collector.on("collect", async (buttonInteraction) => {
				if (buttonInteraction.customId === "cancel_reset") {
					await buttonInteraction.update({
						content: "❌ Reset cancelado.",
						embeds: [],
						components: [],
					});
				} else if (
					buttonInteraction.customId.startsWith("confirm_reset_user_")
				) {
					const userId = buttonInteraction.customId.split("_")[3];

					// Resetear estadísticas del usuario
					await InviteStats.deleteOne({ guildId, userId });
					await InvitationData.deleteMany({ guildId, userId });

					const user = await interaction.client.users.fetch(userId);

					await buttonInteraction.update({
						content: `✅ Se han reseteado las invitaciones de **${user.tag}**.`,
						embeds: [],
						components: [],
					});
				} else if (buttonInteraction.customId === "confirm_reset_server") {
					// Resetear todo el servidor
					const deletedStats = await InviteStats.deleteMany({ guildId });
					const deletedInvitations = await InvitationData.deleteMany({
						guildId,
					});

					await buttonInteraction.update({
						content: `✅ Se han reseteado todas las invitaciones del servidor.\n📊 Eliminados: ${deletedStats.deletedCount} estadísticas y ${deletedInvitations.deletedCount} registros.`,
						embeds: [],
						components: [],
					});
				}
			});

			collector.on("end", () => {
				// El colector se agotó sin respuesta
			});
		} catch (error) {
			console.error("Error en comando invite-reset:", error);
			await interaction.reply({
				content: "❌ Ocurrió un error al resetear las invitaciones.",
				ephemeral: true,
			});
		}
	},
};
