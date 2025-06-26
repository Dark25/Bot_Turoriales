const { ChannelType, PermissionFlagsBits } = require("discord.js");
const SuggestionConfig = require("../schemas/SuggestionConfig");

module.exports = {
	name: "suggestion-setup",
	description: "Configura el sistema de sugerencias",
	defaultMemberPermissions: PermissionFlagsBits.Administrator,
	options: [
		{
			name: "canal-sugerencias",
			description: "Canal donde se enviarán las sugerencias",
			type: 7, // CHANNEL
			channel_types: [ChannelType.GuildText],
			required: true,
		},
		{
			name: "canal-aprobadas",
			description: "Canal para sugerencias aprobadas",
			type: 7, // CHANNEL
			channel_types: [ChannelType.GuildText],
			required: false,
		},
		{
			name: "canal-rechazadas",
			description: "Canal para sugerencias rechazadas",
			type: 7, // CHANNEL
			channel_types: [ChannelType.GuildText],
			required: false,
		},
		{
			name: "rol-requerido",
			description: "Rol requerido para enviar sugerencias",
			type: 8, // ROLE
			required: false,
		},
		{
			name: "rol-aprobador",
			description: "Rol que puede aprobar/rechazar sugerencias",
			type: 8, // ROLE
			required: false,
		},
		{
			name: "votos-aprobacion",
			description:
				"Votos positivos para aprobación automática (por defecto: 10)",
			type: 4, // INTEGER
			min_value: 1,
			max_value: 100,
			required: false,
		},
		{
			name: "votos-rechazo",
			description: "Votos negativos para rechazo automático (por defecto: 5)",
			type: 4, // INTEGER
			min_value: 1,
			max_value: 100,
			required: false,
		},
		{
			name: "categorias",
			description: "Habilitar categorías de sugerencias",
			type: 5, // BOOLEAN
			required: false,
		},
		{
			name: "notificaciones-dm",
			description: "Enviar notificaciones por DM a los autores",
			type: 5, // BOOLEAN
			required: false,
		},
		{
			name: "cooldown",
			description:
				"Tiempo de espera entre sugerencias en segundos (por defecto: 300)",
			type: 4, // INTEGER
			min_value: 0,
			max_value: 3600,
			required: false,
		},
		{
			name: "max-sugerencias",
			description:
				"Máximo de sugerencias pendientes por usuario (por defecto: 3)",
			type: 4, // INTEGER
			min_value: 1,
			max_value: 10,
			required: false,
		},
	],

	async execute(_client, interaction) {
		try {
			// Verificar permisos
			if (
				!interaction.member.permissions.has(PermissionFlagsBits.Administrator)
			) {
				return await interaction.reply({
					content:
						"❌ Necesitas permisos de administrador para usar este comando.",
					flags: 64, // MessageFlags.Ephemeral
				});
			}

			const plugin = interaction.client.plugins?.get("suggestions");
			if (!plugin) {
				return await interaction.reply({
					content: "❌ El plugin de sugerencias no está disponible.",
					flags: 64, // MessageFlags.Ephemeral
				});
			}

			await interaction.deferReply({ flags: 64 }); // MessageFlags.Ephemeral

			// Obtener opciones
			const suggestionsChannel =
				interaction.options.getChannel("canal-sugerencias");
			const approvalChannel = interaction.options.getChannel("canal-aprobadas");
			const rejectedChannel =
				interaction.options.getChannel("canal-rechazadas");
			const requiredRole = interaction.options.getRole("rol-requerido");
			const approverRole = interaction.options.getRole("rol-aprobador");
			const autoApprovalVotes =
				interaction.options.getInteger("votos-aprobacion") || 10;
			const autoRejectionVotes =
				interaction.options.getInteger("votos-rechazo") || 5;
			const enableCategories =
				interaction.options.getBoolean("categorias") ?? false;
			const dmNotifications =
				interaction.options.getBoolean("notificaciones-dm") ?? true;
			const cooldownTime = interaction.options.getInteger("cooldown") ?? 300;
			const maxSuggestions =
				interaction.options.getInteger("max-sugerencias") || 3;

			// Verificar que el bot pueda enviar mensajes en el canal
			const botPermissions = suggestionsChannel.permissionsFor(
				interaction.client.user,
			);
			if (
				!botPermissions.has([
					PermissionFlagsBits.SendMessages,
					PermissionFlagsBits.AddReactions,
					PermissionFlagsBits.ReadMessageHistory,
				])
			) {
				return await interaction.editReply({
					content: `❌ No tengo los permisos necesarios en ${suggestionsChannel}. Necesito: Enviar Mensajes, Añadir Reacciones y Leer Historial de Mensajes.`,
				});
			}

			// Buscar configuración existente o crear nueva
			let config = await SuggestionConfig.findOne({
				guildId: interaction.guild.id,
			});

			if (config) {
				// Actualizar configuración existente
				config.suggestionsChannel = suggestionsChannel.id;
				config.approvalChannel = approvalChannel?.id || null;
				config.rejectedChannel = rejectedChannel?.id || null;
				config.requiredRole = requiredRole?.id || null;
				config.approverRole = approverRole?.id || null;
				config.autoApprovalVotes = autoApprovalVotes;
				config.autoRejectionVotes = autoRejectionVotes;
				config.enableCategories = enableCategories;
				config.dmNotifications = dmNotifications;
				config.cooldownTime = cooldownTime;
				config.maxSuggestionsPerUser = maxSuggestions;
			} else {
				// Crear nueva configuración
				config = new SuggestionConfig({
					guildId: interaction.guild.id,
					suggestionsChannel: suggestionsChannel.id,
					approvalChannel: approvalChannel?.id || null,
					rejectedChannel: rejectedChannel?.id || null,
					requiredRole: requiredRole?.id || null,
					approverRole: approverRole?.id || null,
					autoApprovalVotes,
					autoRejectionVotes,
					enableCategories,
					dmNotifications,
					cooldownTime,
					maxSuggestionsPerUser: maxSuggestions,
				});
			}

			await config.save();

			// Crear mensaje de confirmación
			let confirmationMessage =
				"✅ **Sistema de sugerencias configurado exitosamente!**\n\n";
			confirmationMessage += `📝 **Canal de sugerencias:** ${suggestionsChannel}\n`;

			if (approvalChannel) {
				confirmationMessage += `✅ **Canal de aprobadas:** ${approvalChannel}\n`;
			}

			if (rejectedChannel) {
				confirmationMessage += `❌ **Canal de rechazadas:** ${rejectedChannel}\n`;
			}

			if (requiredRole) {
				confirmationMessage += `🔒 **Rol requerido:** ${requiredRole}\n`;
			}

			if (approverRole) {
				confirmationMessage += `👑 **Rol aprobador:** ${approverRole}\n`;
			}

			confirmationMessage += `📊 **Votos para aprobación automática:** ${autoApprovalVotes}\n`;
			confirmationMessage += `📊 **Votos para rechazo automático:** ${autoRejectionVotes}\n`;
			confirmationMessage += `🏷️ **Categorías habilitadas:** ${
				enableCategories ? "Sí" : "No"
			}\n`;
			confirmationMessage += `📬 **Notificaciones DM:** ${
				dmNotifications ? "Sí" : "No"
			}\n`;
			confirmationMessage += `⏱️ **Cooldown:** ${cooldownTime} segundos\n`;
			confirmationMessage += `📋 **Máx. sugerencias por usuario:** ${maxSuggestions}\n\n`;
			confirmationMessage +=
				"Los usuarios ahora pueden usar `/suggest` para enviar sugerencias.";

			await interaction.editReply({
				content: confirmationMessage,
			});

			plugin.log(
				`Sistema de sugerencias configurado en ${interaction.guild.name}`,
				"success",
			);
		} catch (error) {
			console.error("Error en suggestion-setup:", error);

			try {
				if (interaction.deferred) {
					await interaction.editReply({
						content:
							"❌ Ocurrió un error al configurar el sistema de sugerencias.",
					});
				} else if (!interaction.replied) {
					await interaction.reply({
						content:
							"❌ Ocurrió un error al configurar el sistema de sugerencias.",
						flags: 64, // MessageFlags.Ephemeral
					});
				}
			} catch (replyError) {
				console.error("Error al responder la interacción:", replyError);
			}
		}
	},
};
