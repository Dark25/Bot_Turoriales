const { EmbedBuilder } = require("discord.js");
const SuggestionData = require("../schemas/SuggestionData");

module.exports = {
	name: "suggestion-info",
	description: "Muestra información detallada de una sugerencia",
	options: [
		{
			name: "id",
			description: "ID de la sugerencia",
			type: 4, // INTEGER
			min_value: 1,
			required: true,
		},
	],

	async execute(_client, interaction) {
		try {
			const plugin = interaction.client.plugins?.get("suggestions");
			if (!plugin) {
				return await interaction.reply({
					content: "❌ El plugin de sugerencias no está disponible.",
					ephemeral: true,
				});
			}

			await interaction.deferReply();

			const suggestionId = interaction.options.getInteger("id");

			// Buscar la sugerencia
			const suggestion = await SuggestionData.findOne({
				guildId: interaction.guild.id,
				suggestionId: suggestionId,
			});

			if (!suggestion) {
				return await interaction.editReply({
					content: `❌ No se encontró la sugerencia #${suggestionId}.`,
				});
			}

			// Obtener información del autor
			const author = await interaction.client.users
				.fetch(suggestion.authorId)
				.catch(() => null);
			const authorName = author
				? `${author.username} (${author.id})`
				: `Usuario desconocido (${suggestion.authorId})`;

			// Crear embed detallado
			const embed = new EmbedBuilder()
				.setColor(plugin.getSuggestionColor(suggestion.status))
				.setTitle(`💡 Información de Sugerencia #${suggestion.suggestionId}`)
				.setDescription(suggestion.content)
				.addFields([
					{
						name: "👤 Autor",
						value: authorName,
						inline: true,
					},
					{
						name: "📊 Estado",
						value: plugin.getStatusText(suggestion.status),
						inline: true,
					},
					{
						name: "📅 Creada",
						value: `<t:${Math.floor(suggestion.createdAt.getTime() / 1000)}:F>`,
						inline: true,
					},
				])
				.setTimestamp(suggestion.createdAt);

			// Agregar categoría si existe
			if (suggestion.category) {
				embed.addFields([
					{
						name: "🏷️ Categoría",
						value: suggestion.category,
						inline: true,
					},
				]);
			}

			// Agregar información de votos
			const totalVotes =
				(suggestion.upvotes || 0) +
				(suggestion.downvotes || 0) +
				(suggestion.neutralVotes || 0);
			const upvotePercentage =
				totalVotes > 0
					? Math.round(((suggestion.upvotes || 0) / totalVotes) * 100)
					: 0;
			const downvotePercentage =
				totalVotes > 0
					? Math.round(((suggestion.downvotes || 0) / totalVotes) * 100)
					: 0;

			embed.addFields([
				{
					name: "📊 Estadísticas de Votos",
					value: `👍 **${
						suggestion.upvotes || 0
					}** votos positivos (${upvotePercentage}%)\n👎 **${
						suggestion.downvotes || 0
					}** votos negativos (${downvotePercentage}%)\n🤔 **${
						suggestion.neutralVotes || 0
					}** votos neutrales\n**Total:** ${totalVotes} votos`,
					inline: false,
				},
			]);

			// Agregar información del mensaje si existe
			if (suggestion.messageId && suggestion.channelId) {
				embed.addFields([
					{
						name: "🔗 Enlace al Mensaje",
						value: `[Ver en Discord](https://discord.com/channels/${suggestion.guildId}/${suggestion.channelId}/${suggestion.messageId})`,
						inline: true,
					},
				]);
			}

			// Agregar información de moderación si existe
			if (suggestion.approvedBy) {
				const approver = await interaction.client.users
					.fetch(suggestion.approvedBy)
					.catch(() => null);
				const approverName = approver
					? approver.username
					: "Usuario desconocido";
				embed.addFields([
					{
						name: "✅ Aprobada por",
						value: `${approverName} (<@${suggestion.approvedBy}>)`,
						inline: true,
					},
				]);
			}

			if (suggestion.rejectedBy) {
				const rejecter = await interaction.client.users
					.fetch(suggestion.rejectedBy)
					.catch(() => null);
				const rejecterName = rejecter
					? rejecter.username
					: "Usuario desconocido";
				embed.addFields([
					{
						name: "❌ Rechazada por",
						value: `${rejecterName} (<@${suggestion.rejectedBy}>)`,
						inline: true,
					},
				]);
			}

			// Agregar nota del administrador si existe
			if (suggestion.adminNote) {
				embed.addFields([
					{
						name: "📝 Nota del Administrador",
						value: suggestion.adminNote,
						inline: false,
					},
				]);
			}

			// Agregar información de última actualización si es diferente a la creación
			if (
				suggestion.updatedAt &&
				suggestion.updatedAt.getTime() !== suggestion.createdAt.getTime()
			) {
				embed.addFields([
					{
						name: "🔄 Última Actualización",
						value: `<t:${Math.floor(suggestion.updatedAt.getTime() / 1000)}:R>`,
						inline: true,
					},
				]);
			}

			// Mostrar lista de votantes si el usuario es moderador
			const canApprove = await plugin.canApproveSuggestions(
				interaction.member,
				interaction.guild.id,
			);
			if (canApprove && suggestion.voters && suggestion.voters.length > 0) {
				const votersList = suggestion.voters
					.slice(0, 10)
					.map((voter) => {
						const emoji =
							voter.vote === "upvote"
								? "👍"
								: voter.vote === "downvote"
									? "👎"
									: "🤔";
						return `${emoji} <@${voter.userId}>`;
					})
					.join("\n");

				embed.addFields([
					{
						name: `👥 Votantes${
							suggestion.voters.length > 10
								? ` (mostrando 10 de ${suggestion.voters.length})`
								: ""
						}`,
						value: votersList || "Ninguno",
						inline: false,
					},
				]);
			}

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en suggestion-info:", error);
			if (interaction.deferred) {
				await interaction.editReply({
					content:
						"❌ Ocurrió un error al obtener la información de la sugerencia.",
				});
			} else {
				await interaction.reply({
					content:
						"❌ Ocurrió un error al obtener la información de la sugerencia.",
					ephemeral: true,
				});
			}
		}
	},
};
