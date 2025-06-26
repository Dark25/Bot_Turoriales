const {
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} = require("discord.js");
const SuggestionData = require("../schemas/SuggestionData");
const SuggestionConfig = require("../schemas/SuggestionConfig");

module.exports = {
	name: "suggest",
	description: "Envía una nueva sugerencia a la comunidad",
	options: [
		{
			name: "categoria",
			description: "Categoría de la sugerencia",
			type: 3, // STRING
			required: false,
			choices: [
				{ name: "💭 General", value: "general" },
				{ name: "✨ Características", value: "features" },
				{ name: "🐛 Errores", value: "bugs" },
				{ name: "📈 Mejoras", value: "improvements" },
			],
		},
	],

	async execute(_client, interaction) {
		try {
			const plugin = interaction.client.plugins?.get("suggestions");
			if (!plugin) {
				return await interaction.reply({
					content: "❌ El plugin de sugerencias no está disponible.",
					flags: 64,
				});
			}

			// Verificar si el plugin está habilitado
			const isEnabled = await plugin.isEnabled(interaction.guild.id);
			if (!isEnabled) {
				return await interaction.reply({
					content:
						"❌ El sistema de sugerencias está deshabilitado en este servidor.",
					ephemeral: true,
				});
			}

			// Obtener configuración
			const config = await SuggestionConfig.findOne({
				guildId: interaction.guild.id,
			});
			if (!config) {
				return await interaction.reply({
					content:
						"❌ El sistema de sugerencias no está configurado. Un administrador debe usar `/suggestion-setup` primero.",
					ephemeral: true,
				});
			}

			// Verificar permisos de rol si está configurado
			if (
				config.requiredRole &&
				!interaction.member.roles.cache.has(config.requiredRole)
			) {
				return await interaction.reply({
					content: "❌ No tienes el rol requerido para enviar sugerencias.",
					ephemeral: true,
				});
			}

			// Verificar cooldown
			const lastSuggestion = await SuggestionData.findOne({
				guildId: interaction.guild.id,
				authorId: interaction.user.id,
			}).sort({ createdAt: -1 });

			if (lastSuggestion && config.cooldownTime > 0) {
				const timeDiff =
					(Date.now() - lastSuggestion.createdAt.getTime()) / 1000;
				if (timeDiff < config.cooldownTime) {
					const remainingTime = Math.ceil(config.cooldownTime - timeDiff);
					return await interaction.reply({
						content: `❌ Debes esperar ${remainingTime} segundos antes de enviar otra sugerencia.`,
						ephemeral: true,
					});
				}
			}

			// Verificar límite de sugerencias pendientes
			const pendingSuggestions = await SuggestionData.countDocuments({
				guildId: interaction.guild.id,
				authorId: interaction.user.id,
				status: "pending",
			});

			if (pendingSuggestions >= config.maxSuggestionsPerUser) {
				return await interaction.reply({
					content: `❌ Ya tienes ${config.maxSuggestionsPerUser} sugerencias pendientes. Espera a que sean revisadas antes de enviar más.`,
					ephemeral: true,
				});
			}

			const category = interaction.options.getString("categoria");

			// Verificar si la categoría está permitida
			if (
				config.enableCategories &&
				category &&
				!config.allowedCategories.has(category)
			) {
				return await interaction.reply({
					content: "❌ Categoría no válida.",
					ephemeral: true,
				});
			}

			// Crear modal para la sugerencia
			const modal = new ModalBuilder()
				.setCustomId(`suggestion_modal_${category || "general"}`)
				.setTitle("💡 Nueva Sugerencia");

			const suggestionInput = new TextInputBuilder()
				.setCustomId("suggestion_content")
				.setLabel("Describe tu sugerencia")
				.setStyle(TextInputStyle.Paragraph)
				.setPlaceholder("Explica tu sugerencia de manera clara y detallada...")
				.setRequired(true)
				.setMaxLength(2000)
				.setMinLength(10);

			const firstActionRow = new ActionRowBuilder().addComponents(
				suggestionInput,
			);
			modal.addComponents(firstActionRow);

			await interaction.showModal(modal);
		} catch (error) {
			console.error("Error en comando suggest:", error);
			try {
				if (!interaction.replied && !interaction.deferred) {
					await interaction.reply({
						content: "❌ Ocurrió un error al procesar tu sugerencia.",
						flags: 64, // MessageFlags.Ephemeral
					});
				}
			} catch (replyError) {
				console.error("Error al responder la interacción:", replyError);
			}
		}
	},
};
