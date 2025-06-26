const { EmbedBuilder } = require("discord.js");
const SuggestionData = require("../schemas/SuggestionData");
const SuggestionConfig = require("../schemas/SuggestionConfig");

module.exports = {
	name: "interactionCreate",
	once: false,

	async execute(interaction, client) {
		try {
			// Obtener el plugin directamente de la colección
			const plugin = client.plugins?.get("suggestions");
			if (!plugin) return;

			// Manejar modales
			if (interaction.isModalSubmit()) {
				await this.handleModalSubmit(interaction, plugin, client);
			}

			// Manejar botones
			else if (interaction.isButton()) {
				await this.handleButtonInteraction(interaction, plugin, client);
			}
		} catch (error) {
			console.error("Error en interactionCreate (suggestions):", error);
		}
	},

	async handleModalSubmit(interaction, plugin, client) {
		try {
			// Modal de nueva sugerencia
			if (interaction.customId.startsWith("suggestion_modal_")) {
				await this.handleNewSuggestionModal(interaction, plugin, client);
			}
			// Modal de aprobación
			else if (interaction.customId.startsWith("approve_suggestion_")) {
				await this.handleApproveModal(interaction, plugin, client);
			}
			// Modal de rechazo
			else if (interaction.customId.startsWith("reject_suggestion_")) {
				await this.handleRejectModal(interaction, plugin, client);
			}
		} catch (error) {
			console.error("Error en handleModalSubmit:", error);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: "❌ Ocurrió un error al procesar el modal.",
					ephemeral: true,
				});
			}
		}
	},

	async handleNewSuggestionModal(interaction, plugin, client) {
		const category = interaction.customId.split("_")[2];
		const content = interaction.fields.getTextInputValue("suggestion_content");

		await interaction.deferReply({ ephemeral: true });

		// Obtener configuración
		const config = await SuggestionConfig.findOne({
			guildId: interaction.guild.id,
		});
		if (!config) {
			return await interaction.editReply({
				content: "❌ Sistema de sugerencias no configurado.",
			});
		}

		// Generar ID de sugerencia
		const suggestionId = await plugin.generateSuggestionId(
			interaction.guild.id,
		);

		// Crear sugerencia en la base de datos
		const suggestion = new SuggestionData({
			guildId: interaction.guild.id,
			suggestionId,
			authorId: interaction.user.id,
			content,
			category: category !== "general" ? category : null,
			status: "pending",
		});

		await suggestion.save();

		// Obtener canal de sugerencias
		const suggestionsChannel = await client.channels.fetch(
			config.suggestionsChannel,
		);
		if (!suggestionsChannel) {
			await suggestion.deleteOne();
			return await interaction.editReply({
				content: "❌ Canal de sugerencias no encontrado.",
			});
		}

		// Crear embed y botones
		const embed = plugin.createSuggestionEmbed(suggestion, interaction);
		const buttons = plugin.createSuggestionButtons(suggestion);

		// Enviar mensaje
		const message = await suggestionsChannel.send({
			embeds: [embed],
			components: [buttons],
		});

		// Añadir reacciones automáticas
		await message.react(plugin.upvoteEmoji);
		await message.react(plugin.downvoteEmoji);
		await message.react(plugin.neutralEmoji);

		// Actualizar sugerencia con IDs del mensaje
		suggestion.messageId = message.id;
		suggestion.channelId = suggestionsChannel.id;
		await suggestion.save();

		await interaction.editReply({
			content: `✅ Tu sugerencia #${suggestionId} ha sido enviada exitosamente en ${suggestionsChannel}.`,
		});

		plugin.log(
			`Nueva sugerencia #${suggestionId} de ${interaction.user.username} en ${interaction.guild.name}`,
			"info",
		);
	},

	async handleApproveModal(interaction, plugin, client) {
		const suggestionId = Number.parseInt(interaction.customId.split("_")[2]);
		const adminNote =
			interaction.fields.getTextInputValue("admin_note") || null;

		await interaction.deferReply({ ephemeral: true });

		// Buscar sugerencia
		const suggestion = await SuggestionData.findOne({
			guildId: interaction.guild.id,
			suggestionId,
		});

		if (!suggestion || suggestion.status !== "pending") {
			return await interaction.editReply({
				content: "❌ Sugerencia no encontrada o ya procesada.",
			});
		}

		// Actualizar sugerencia
		suggestion.status = "approved";
		suggestion.approvedBy = interaction.user.id;
		suggestion.adminNote = adminNote;
		await suggestion.save();

		// Actualizar mensaje original
		await this.updateSuggestionMessage(suggestion, plugin, client);

		// Mover a canal de aprobadas si está configurado
		const config = await SuggestionConfig.findOne({
			guildId: interaction.guild.id,
		});
		if (config?.approvalChannel) {
			await this.moveSuggestionToChannel(
				suggestion,
				config.approvalChannel,
				plugin,
				client,
			);
		}

		// Notificar al autor
		if (config?.dmNotifications) {
			await plugin.notifyAuthor(
				suggestion,
				"approved",
				adminNote,
				interaction.user.id,
			);
		}

		await interaction.editReply({
			content: `✅ Sugerencia #${suggestionId} aprobada exitosamente.`,
		});

		plugin.log(
			`Sugerencia #${suggestionId} aprobada por ${interaction.user.username}`,
			"success",
		);
	},

	async handleRejectModal(interaction, plugin, client) {
		const suggestionId = Number.parseInt(interaction.customId.split("_")[2]);
		const adminNote =
			interaction.fields.getTextInputValue("admin_note") || null;

		await interaction.deferReply({ ephemeral: true });

		// Buscar sugerencia
		const suggestion = await SuggestionData.findOne({
			guildId: interaction.guild.id,
			suggestionId,
		});

		if (!suggestion || suggestion.status !== "pending") {
			return await interaction.editReply({
				content: "❌ Sugerencia no encontrada o ya procesada.",
			});
		}

		// Actualizar sugerencia
		suggestion.status = "rejected";
		suggestion.rejectedBy = interaction.user.id;
		suggestion.adminNote = adminNote;
		await suggestion.save();

		// Actualizar mensaje original
		await this.updateSuggestionMessage(suggestion, plugin, client);

		// Mover a canal de rechazadas si está configurado
		const config = await SuggestionConfig.findOne({
			guildId: interaction.guild.id,
		});
		if (config?.rejectedChannel) {
			await this.moveSuggestionToChannel(
				suggestion,
				config.rejectedChannel,
				plugin,
				client,
			);
		}

		// Notificar al autor
		if (config?.dmNotifications) {
			await plugin.notifyAuthor(
				suggestion,
				"rejected",
				adminNote,
				interaction.user.id,
			);
		}

		await interaction.editReply({
			content: `❌ Sugerencia #${suggestionId} rechazada.`,
		});

		plugin.log(
			`Sugerencia #${suggestionId} rechazada por ${interaction.user.username}`,
			"warn",
		);
	},

	async handleButtonInteraction(interaction, plugin, _client) {
		try {
			if (interaction.customId.startsWith("suggestion_")) {
				const [, action, suggestionId] = interaction.customId.split("_");
				const id = Number.parseInt(suggestionId);

				if (action === "info") {
					await this.showSuggestionInfo(interaction, id, plugin);
				} else if (action === "approve" || action === "reject") {
					// Verificar permisos
					const canApprove = await plugin.canApproveSuggestions(
						interaction.member,
						interaction.guild.id,
					);
					if (!canApprove) {
						return await interaction.reply({
							content:
								action === "approve"
									? "❌ No tienes permisos para aprobar sugerencias."
									: "❌ No tienes permisos para rechazar sugerencias.",
							ephemeral: true,
						});
					}

					// Buscar sugerencia
					const suggestion = await SuggestionData.findOne({
						guildId: interaction.guild.id,
						suggestionId: id,
					});

					if (!suggestion || suggestion.status !== "pending") {
						return await interaction.reply({
							content: "❌ Sugerencia no encontrada o ya procesada.",
							ephemeral: true,
						});
					}

					// Ejecutar el comando correspondiente pasando el client real y el interaction real
					const commandModule = require(`../commands/suggestion-${action}`);
					// Guardar las opciones originales
					const originalOptions = interaction.options;
					// Sobrescribir solo getInteger temporalmente
					interaction.options = {
						getInteger: () => id,
					};
					await commandModule.execute(interaction.client, interaction);
					// Restaurar las opciones originales
					interaction.options = originalOptions;
				}
			}
		} catch (error) {
			console.error("Error en handleButtonInteraction:", error);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: "❌ Ocurrió un error al procesar el botón.",
					ephemeral: true,
				});
			}
		}
	},

	async showSuggestionInfo(interaction, suggestionId, plugin) {
		await interaction.deferReply({ ephemeral: true });

		const suggestion = await SuggestionData.findOne({
			guildId: interaction.guild.id,
			suggestionId,
		});

		if (!suggestion) {
			return await interaction.editReply({
				content: `❌ No se encontró la sugerencia #${suggestionId}.`,
			});
		}

		const embed = new EmbedBuilder()
			.setColor(plugin.getSuggestionColor(suggestion.status))
			.setTitle(
				`💡 Información Rápida - Sugerencia #${suggestion.suggestionId}`,
			)
			.setDescription(suggestion.content)
			.addFields([
				{
					name: "📊 Estado",
					value: plugin.getStatusText(suggestion.status),
					inline: true,
				},
				{
					name: "📊 Votos",
					value: `👍 ${suggestion.upvotes || 0} | 👎 ${
						suggestion.downvotes || 0
					} | 🤔 ${suggestion.neutralVotes || 0}`,
					inline: true,
				},
				{
					name: "📅 Creada",
					value: `<t:${Math.floor(suggestion.createdAt.getTime() / 1000)}:R>`,
					inline: true,
				},
			])
			.setFooter({
				text: `Usa /suggestion-info id:${suggestionId} para más detalles`,
			})
			.setTimestamp();

		if (suggestion.adminNote) {
			embed.addFields([
				{
					name: "📝 Nota del Administrador",
					value: suggestion.adminNote,
					inline: false,
				},
			]);
		}

		await interaction.editReply({ embeds: [embed] });
	},

	async updateSuggestionMessage(suggestion, plugin, client) {
		try {
			const channel = await client.channels.fetch(suggestion.channelId);
			if (!channel) return;

			const message = await channel.messages.fetch(suggestion.messageId);
			if (!message) return;

			const embed = plugin.createSuggestionEmbed(suggestion);
			const buttons = plugin.createSuggestionButtons(suggestion);

			await message.edit({
				embeds: [embed],
				components: [buttons],
			});
		} catch (error) {
			console.error("Error actualizando mensaje:", error);
		}
	},

	async moveSuggestionToChannel(suggestion, channelId, plugin, client) {
		try {
			const targetChannel = await client.channels.fetch(channelId);
			if (!targetChannel) return;

			const embed = plugin.createSuggestionEmbed(suggestion);
			const buttons = plugin.createSuggestionButtons(suggestion);

			const newMessage = await targetChannel.send({
				embeds: [embed],
				components: [buttons],
			});

			// Actualizar IDs
			suggestion.messageId = newMessage.id;
			suggestion.channelId = targetChannel.id;
			await suggestion.save();
		} catch (error) {
			console.error("Error moviendo sugerencia:", error);
		}
	},
};
