const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const InviteConfig = require("../schemas/InviteConfig");

module.exports = {
	name: "invite-setup",
	description: "Configura el sistema de invitaciones",
	defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
	options: [
		{
			name: "canal",
			description: "Canal donde enviar mensajes de bienvenida/despedida",
			type: 7,
			channelTypes: [0],
			required: false,
		},
		{
			name: "anti-fake",
			description: "Activar detección de cuentas falsas (menos de 7 días)",
			type: 5,
			required: false,
		},
	],

	async execute(_, interaction) {
		try {
			// Verificar permisos
			if (
				!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
			) {
				return await interaction.reply({
					content:
						"❌ No tienes permisos para configurar el sistema de invitaciones.",
					ephemeral: true,
				});
			}

			const channel = interaction.options.getChannel("canal");
			const antiFake = interaction.options.getBoolean("anti-fake");

			// Verificar permisos del bot
			const botPermissions = interaction.guild.members.me.permissions;
			const requiredPermissions = [
				PermissionFlagsBits.ViewAuditLog,
				PermissionFlagsBits.ManageGuild,
			];

			const missingPermissions = requiredPermissions.filter(
				(perm) => !botPermissions.has(perm),
			);

			if (missingPermissions.length > 0) {
				const permissionNames = missingPermissions.map((perm) => {
					switch (perm) {
						case PermissionFlagsBits.ViewAuditLog:
							return "Ver registro de auditoría";
						case PermissionFlagsBits.ManageGuild:
							return "Administrar servidor";
						default:
							return "Permiso desconocido";
					}
				});

				return await interaction.reply({
					content: `❌ El bot necesita los siguientes permisos para funcionar correctamente:\n${permissionNames.map((p) => `• ${p}`).join("\n")}`,
					ephemeral: true,
				});
			}

			// Verificar que el bot puede ver las invitaciones
			try {
				await interaction.guild.invites.fetch();
			} catch (_error) {
				return await interaction.reply({
					content:
						"❌ No puedo acceder a las invitaciones del servidor. Verifica que tengo permisos de 'Administrar servidor'.",
					ephemeral: true,
				});
			}

			// Buscar o crear configuración
			let config = await InviteConfig.findOne({
				guildId: interaction.guild.id,
			});
			let isNewConfig = false;

			if (!config) {
				config = new InviteConfig({
					guildId: interaction.guild.id,
				});
				isNewConfig = true;
			}

			// Actualizar configuración si se proporcionaron valores
			let configUpdated = false;

			if (channel) {
				config.channelId = channel.id;
				configUpdated = true;
			}

			if (antiFake !== null) {
				config.antiFake = antiFake;
				configUpdated = true;
			}

			// Solo guardar si se actualizo algo o es una nueva configuración
			if (configUpdated || isNewConfig) {
				config.updatedAt = new Date();
				await config.save();
			}

			const embed = new EmbedBuilder()
				.setColor("#51cf66")
				.setTitle("✅ Sistema de Invitaciones Configurado")
				.setDescription(
					isNewConfig
						? "El sistema de invitaciones ha sido configurado por primera vez y está funcionando correctamente."
						: configUpdated
							? "La configuración del sistema de invitaciones ha sido actualizada."
							: "El sistema de invitaciones está funcionando correctamente con la configuración actual.",
				)
				.addFields([
					{
						name: "🔧 Configuración",
						value: `${config.channelId ? `📢 Canal: <#${config.channelId}>` : "📢 Canal: Sistema predeterminado"}\n🛡️ Anti-fake: ${config.antiFake ? "Activado" : "Desactivado"}`,
						inline: false,
					},
					{
						name: "📋 Comandos disponibles",
						value:
							"• `/invites` - Ver invitaciones de un usuario\n• `/invite-leaderboard` - Top de invitadores\n• `/invite-add` - Añadir invitaciones bonus\n• `/invite-remove` - Remover invitaciones bonus\n• `/invite-reset` - Resetear invitaciones",
						inline: false,
					},
					{
						name: "🎯 Características",
						value:
							"• Seguimiento automático de invitaciones\n• Detección de cuentas falsas\n• Estadísticas detalladas\n• Mensajes de bienvenida/despedida\n• Sistema de invitaciones bonus",
						inline: false,
					},
				])
				.setTimestamp()
				.setFooter({
					text: `Configurado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando invite-setup:", error);
			await interaction.reply({
				content:
					"❌ Ocurrió un error al configurar el sistema de invitaciones.",
				ephemeral: true,
			});
		}
	},
};
