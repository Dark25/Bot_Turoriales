const BasePlugin = require("../BasePlugin");
const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	PermissionFlagsBits,
} = require("discord.js");
const SuggestionData = require("./schemas/SuggestionData");
const _SuggestionConfig = require("./schemas/SuggestionConfig");

class SuggestionsPlugin extends BasePlugin {
	constructor(client) {
		super(client);

		// Información del plugin
		this.name = "suggestions";
		this.version = "1.0.0";
		this.description = "Sistema completo de sugerencias de la comunidad";
		this.author = "Dark25";

		// Configuración del plugin
		this.configSchema = {
			suggestionsChannel: {
				type: "string",
				required: true,
				description: "ID del canal donde se enviarán las sugerencias",
			},
			approvalChannel: {
				type: "string",
				required: false,
				description: "ID del canal para sugerencias aprobadas",
			},
			rejectedChannel: {
				type: "string",
				required: false,
				description: "ID del canal para sugerencias rechazadas",
			},
			enabledSuggestions: {
				type: "boolean",
				required: false,
				description: "Si está habilitado el sistema de sugerencias",
			},
			requiredRole: {
				type: "string",
				required: false,
				description: "ID del rol requerido para enviar sugerencias",
			},
			approverRole: {
				type: "string",
				required: false,
				description: "ID del rol que puede aprobar/rechazar sugerencias",
			},
			autoApprovalVotes: {
				type: "number",
				required: false,
				description: "Número de votos positivos para aprobación automática",
			},
			autoRejectionVotes: {
				type: "number",
				required: false,
				description: "Número de votos negativos para rechazo automático",
			},
			enableCategories: {
				type: "boolean",
				required: false,
				description: "Si están habilitadas las categorías de sugerencias",
			},
			allowedCategories: {
				type: "object",
				required: false,
				description: "Categorías permitidas para las sugerencias",
			},
		};

		// Emojis para las reacciones
		this.upvoteEmoji = "👍";
		this.downvoteEmoji = "👎";
		this.neutralEmoji = "🤔";
	}

	/**
	 * Se ejecuta cuando el plugin es cargado
	 */
	async onLoad() {
		// Verificar si ya está cargado para evitar doble registro
		if (this.client.plugins?.has(this.name)) {
			const existingPlugin = this.client.plugins.get(this.name);
			if (existingPlugin === this) {
				this.log("Plugin ya inicializado, omitiendo carga...", "warn");
				return;
			}
		}

		this.log("Cargando plugin de sugerencias...", "info");

		// NO registrar comandos aquí - dejar que el pluginManager lo haga
		// para evitar conflictos de doble registro

		this.log("Plugin de sugerencias cargado exitosamente", "success");
	}

	/**
	 * Se ejecuta cuando el plugin es descargado
	 */
	async onUnload() {
		this.log("Descargando plugin de sugerencias...", "info");
	}

	/**
	 * Crea un embed para una sugerencia
	 */
	createSuggestionEmbed(suggestion, _interaction = null) {
		const embed = new EmbedBuilder()
			.setColor(this.getSuggestionColor(suggestion.status))
			.setTitle(`💡 Sugerencia #${suggestion.suggestionId}`)
			.setDescription(suggestion.content)
			.addFields([
				{
					name: "👤 Autor",
					value: `<@${suggestion.authorId}>`,
					inline: true,
				},
				{
					name: "📊 Estado",
					value: this.getStatusText(suggestion.status),
					inline: true,
				},
				{
					name: "📅 Creada",
					value: `<t:${Math.floor(suggestion.createdAt.getTime() / 1000)}:R>`,
					inline: true,
				},
			])
			.setTimestamp();

		if (suggestion.category) {
			embed.addFields([
				{
					name: "🏷️ Categoría",
					value: suggestion.category,
					inline: true,
				},
			]);
		}

		if (suggestion.approvedBy) {
			embed.addFields([
				{
					name: "✅ Aprobada por",
					value: `<@${suggestion.approvedBy}>`,
					inline: true,
				},
			]);
		}

		if (suggestion.rejectedBy) {
			embed.addFields([
				{
					name: "❌ Rechazada por",
					value: `<@${suggestion.rejectedBy}>`,
					inline: true,
				},
			]);
		}

		if (suggestion.adminNote) {
			embed.addFields([
				{
					name: "📝 Nota del administrador",
					value: suggestion.adminNote,
					inline: false,
				},
			]);
		}

		// Agregar estadísticas de votos
		embed.addFields([
			{
				name: "📊 Votos",
				value: `${this.upvoteEmoji} ${suggestion.upvotes || 0} | ${
					this.downvoteEmoji
				} ${suggestion.downvotes || 0} | ${this.neutralEmoji} ${
					suggestion.neutralVotes || 0
				}`,
				inline: false,
			},
		]);

		return embed;
	}

	/**
	 * Crea los botones para una sugerencia
	 */
	createSuggestionButtons(suggestion) {
		const row = new ActionRowBuilder();

		if (suggestion.status === "pending") {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`suggestion_approve_${suggestion.suggestionId}`)
					.setLabel("Aprobar")
					.setStyle(ButtonStyle.Success)
					.setEmoji("✅"),
				new ButtonBuilder()
					.setCustomId(`suggestion_reject_${suggestion.suggestionId}`)
					.setLabel("Rechazar")
					.setStyle(ButtonStyle.Danger)
					.setEmoji("❌"),
				new ButtonBuilder()
					.setCustomId(`suggestion_info_${suggestion.suggestionId}`)
					.setLabel("Información")
					.setStyle(ButtonStyle.Secondary)
					.setEmoji("ℹ️"),
			);
		} else {
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(`suggestion_info_${suggestion.suggestionId}`)
					.setLabel("Información")
					.setStyle(ButtonStyle.Secondary)
					.setEmoji("ℹ️"),
			);
		}

		return row;
	}

	/**
	 * Obtiene el color del embed según el estado
	 */
	getSuggestionColor(status) {
		switch (status) {
			case "pending":
				return 0xffff00; // Amarillo
			case "approved":
				return 0x00ff00; // Verde
			case "rejected":
				return 0xff0000; // Rojo
			case "implemented":
				return 0x0080ff; // Azul
			default:
				return 0x808080; // Gris
		}
	}

	/**
	 * Obtiene el texto del estado
	 */
	getStatusText(status) {
		switch (status) {
			case "pending":
				return "⏳ Pendiente";
			case "approved":
				return "✅ Aprobada";
			case "rejected":
				return "❌ Rechazada";
			case "implemented":
				return "🎉 Implementada";
			default:
				return "❓ Desconocido";
		}
	}

	/**
	 * Genera un ID único para la sugerencia
	 */
	async generateSuggestionId(guildId) {
		const lastSuggestion = await SuggestionData.findOne({ guildId })
			.sort({ suggestionId: -1 })
			.limit(1);

		return lastSuggestion ? lastSuggestion.suggestionId + 1 : 1;
	}

	/**
	 * Verifica si un usuario tiene permisos para aprobar sugerencias
	 */
	async canApproveSuggestions(member, guildId) {
		// Si es administrador, puede aprobar
		if (member.permissions.has(PermissionFlagsBits.Administrator)) {
			return true;
		}

		// Verificar rol específico de aprobador
		const config = await this.getConfig(guildId);
		if (config.approverRole && member.roles.cache.has(config.approverRole)) {
			return true;
		}

		return false;
	}

	/**
	 * Envía notificación al autor de la sugerencia
	 */
	async notifyAuthor(
		suggestion,
		newStatus,
		adminNote = null,
		moderator = null,
	) {
		try {
			const user = await this.client.users.fetch(suggestion.authorId);
			if (!user) return;

			const embed = new EmbedBuilder()
				.setColor(this.getSuggestionColor(newStatus))
				.setTitle(
					`📬 Actualización de tu sugerencia #${suggestion.suggestionId}`,
				)
				.setDescription(suggestion.content)
				.addFields([
					{
						name: "📊 Nuevo Estado",
						value: this.getStatusText(newStatus),
						inline: true,
					},
					{
						name: "🏠 Servidor",
						value: suggestion.guildId,
						inline: true,
					},
				])
				.setTimestamp();

			if (moderator) {
				embed.addFields([
					{
						name: "👤 Moderador",
						value: `<@${moderator}>`,
						inline: true,
					},
				]);
			}

			if (adminNote) {
				embed.addFields([
					{
						name: "📝 Nota del administrador",
						value: adminNote,
						inline: false,
					},
				]);
			}

			await user.send({ embeds: [embed] });
		} catch (error) {
			this.log(
				`Error enviando notificación al autor: ${error.message}`,
				"error",
			);
		}
	}
}

module.exports = SuggestionsPlugin;
