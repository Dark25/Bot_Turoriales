const SuggestionData = require("../schemas/SuggestionData");
const SuggestionConfig = require("../schemas/SuggestionConfig");

module.exports = {
	name: "messageReactionAdd",
	once: false,

	async execute(reaction, user, client) {
		try {
			// Ignorar reacciones del bot
			if (user.bot) return;

			// Si la reacción es parcial, fetchear
			if (reaction.partial) {
				try {
					await reaction.fetch();
				} catch (error) {
					console.error("Error fetching reaction:", error);
					return;
				}
			}

			const plugin = client.plugins?.get("suggestions");
			if (!plugin) return;

			// Verificar si es una reacción en una sugerencia
			const suggestion = await SuggestionData.findOne({
				guildId: reaction.message.guild.id,
				messageId: reaction.message.id,
			});

			if (!suggestion) return;

			// Solo procesar reacciones válidas
			const validEmojis = [
				plugin.upvoteEmoji,
				plugin.downvoteEmoji,
				plugin.neutralEmoji,
			];
			if (!validEmojis.includes(reaction.emoji.name)) return;

			// Obtener configuración
			const config = await SuggestionConfig.findOne({
				guildId: reaction.message.guild.id,
			});
			if (!config) return;

			// Verificar si el usuario ya votó
			const existingVote = suggestion.voters.find((v) => v.userId === user.id);

			// Determinar tipo de voto
			let voteType;
			if (reaction.emoji.name === plugin.upvoteEmoji) {
				voteType = "upvote";
			} else if (reaction.emoji.name === plugin.downvoteEmoji) {
				voteType = "downvote";
			} else if (reaction.emoji.name === plugin.neutralEmoji) {
				voteType = "neutral";
			}

			// Si el usuario ya votó, actualizar su voto
			if (existingVote) {
				// Si es el mismo tipo de voto, no hacer nada
				if (existingVote.vote === voteType) return;

				// Actualizar el voto anterior
				const oldVoteField =
					existingVote.vote === "upvote"
						? "upvotes"
						: existingVote.vote === "downvote"
							? "downvotes"
							: "neutralVotes";

				if (suggestion[oldVoteField] > 0) {
					suggestion[oldVoteField]--;
				}

				// Actualizar el tipo de voto
				existingVote.vote = voteType;
			} else {
				// Nuevo voto
				suggestion.voters.push({
					userId: user.id,
					vote: voteType,
				});
			}

			// Actualizar contador del nuevo voto
			const newVoteField =
				voteType === "upvote"
					? "upvotes"
					: voteType === "downvote"
						? "downvotes"
						: "neutralVotes";

			suggestion[newVoteField] = (suggestion[newVoteField] || 0) + 1;

			// Guardar cambios
			await suggestion.save();

			// Verificar aprobación/rechazo automático si la sugerencia está pendiente
			if (suggestion.status === "pending") {
				let autoAction = null;

				if (
					config.autoApprovalVotes &&
					suggestion.upvotes >= config.autoApprovalVotes
				) {
					autoAction = "approve";
				} else if (
					config.autoRejectionVotes &&
					suggestion.downvotes >= config.autoRejectionVotes
				) {
					autoAction = "reject";
				}

				if (autoAction) {
					await this.handleAutoAction(
						suggestion,
						autoAction,
						config,
						plugin,
						client,
					);
				} else {
					// Solo actualizar el mensaje si no hay acción automática
					await this.updateSuggestionMessage(suggestion, plugin, client);
				}
			} else {
				// Actualizar mensaje para sugerencias ya procesadas
				await this.updateSuggestionMessage(suggestion, plugin, client);
			}
		} catch (error) {
			console.error("Error en messageReactionAdd:", error);
		}
	},

	async handleAutoAction(suggestion, action, config, plugin, client) {
		try {
			const _oldStatus = suggestion.status;

			if (action === "approve") {
				suggestion.status = "approved";
				suggestion.approvedBy = client.user.id; // Bot como aprobador automático
				suggestion.adminNote = `Aprobada automáticamente por alcanzar ${config.autoApprovalVotes} votos positivos.`;
			} else if (action === "reject") {
				suggestion.status = "rejected";
				suggestion.rejectedBy = client.user.id; // Bot como rechazador automático
				suggestion.adminNote = `Rechazada automáticamente por alcanzar ${config.autoRejectionVotes} votos negativos.`;
			}

			await suggestion.save();

			// Actualizar mensaje original
			await this.updateSuggestionMessage(suggestion, plugin, client);

			// Mover mensaje a canal correspondiente si está configurado
			await this.moveSuggestionMessage(suggestion, config, plugin, client);

			// Notificar al autor
			if (config.dmNotifications) {
				await plugin.notifyAuthor(
					suggestion,
					suggestion.status,
					suggestion.adminNote,
					"Sistema Automático",
				);
			}

			plugin.log(
				`Sugerencia #${suggestion.suggestionId} ${
					action === "approve" ? "aprobada" : "rechazada"
				} automáticamente`,
				"info",
			);
		} catch (error) {
			console.error("Error en handleAutoAction:", error);
		}
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
			console.error("Error actualizando mensaje de sugerencia:", error);
		}
	},

	async moveSuggestionMessage(suggestion, config, plugin, client) {
		try {
			let targetChannelId;

			if (suggestion.status === "approved" && config.approvalChannel) {
				targetChannelId = config.approvalChannel;
			} else if (suggestion.status === "rejected" && config.rejectedChannel) {
				targetChannelId = config.rejectedChannel;
			} else {
				return; // No hay canal configurado para este estado
			}

			const targetChannel = await client.channels.fetch(targetChannelId);
			if (!targetChannel) return;

			const embed = plugin.createSuggestionEmbed(suggestion);
			const buttons = plugin.createSuggestionButtons(suggestion);

			const newMessage = await targetChannel.send({
				embeds: [embed],
				components: [buttons],
			});

			// Actualizar IDs del mensaje
			suggestion.messageId = newMessage.id;
			suggestion.channelId = targetChannel.id;
			await suggestion.save();
		} catch (error) {
			console.error("Error moviendo mensaje de sugerencia:", error);
		}
	},
};
