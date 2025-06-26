const { EmbedBuilder } = require("discord.js");
const SuggestionData = require("../schemas/SuggestionData");

module.exports = {
	name: "suggestion-stats",
	description: "Muestra estadísticas del sistema de sugerencias",
	options: [
		{
			name: "usuario",
			description: "Ver estadísticas de un usuario específico",
			type: 6, // USER
			required: false,
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

			const targetUser = interaction.options.getUser("usuario");

			if (targetUser) {
				// Estadísticas de usuario específico
				await this.showUserStats(interaction, targetUser, plugin);
			} else {
				// Estadísticas generales del servidor
				await this.showServerStats(interaction, plugin);
			}
		} catch (error) {
			console.error("Error en suggestion-stats:", error);
			if (interaction.deferred) {
				await interaction.editReply({
					content: "❌ Ocurrió un error al obtener las estadísticas.",
				});
			} else {
				await interaction.reply({
					content: "❌ Ocurrió un error al obtener las estadísticas.",
					ephemeral: true,
				});
			}
		}
	},

	async showUserStats(interaction, user, _plugin) {
		// Obtener estadísticas del usuario
		const userSuggestions = await SuggestionData.find({
			guildId: interaction.guild.id,
			authorId: user.id,
		});

		if (userSuggestions.length === 0) {
			return await interaction.editReply({
				content: `📊 ${user.username} no ha enviado ninguna sugerencia en este servidor.`,
			});
		}

		// Calcular estadísticas
		const stats = {
			total: userSuggestions.length,
			pending: userSuggestions.filter((s) => s.status === "pending").length,
			approved: userSuggestions.filter((s) => s.status === "approved").length,
			rejected: userSuggestions.filter((s) => s.status === "rejected").length,
			implemented: userSuggestions.filter((s) => s.status === "implemented")
				.length,
		};

		const totalVotes = userSuggestions.reduce(
			(acc, s) =>
				acc + (s.upvotes || 0) + (s.downvotes || 0) + (s.neutralVotes || 0),
			0,
		);
		const totalUpvotes = userSuggestions.reduce(
			(acc, s) => acc + (s.upvotes || 0),
			0,
		);
		const totalDownvotes = userSuggestions.reduce(
			(acc, s) => acc + (s.downvotes || 0),
			0,
		);
		const avgVotesPerSuggestion =
			stats.total > 0 ? (totalVotes / stats.total).toFixed(1) : 0;

		// Encontrar la sugerencia más exitosa
		const mostSuccessful = userSuggestions.reduce((max, current) => {
			const currentScore = (current.upvotes || 0) - (current.downvotes || 0);
			const maxScore = (max.upvotes || 0) - (max.downvotes || 0);
			return currentScore > maxScore ? current : max;
		}, userSuggestions[0]);

		const embed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle(`📊 Estadísticas de Sugerencias - ${user.username}`)
			.setThumbnail(user.displayAvatarURL())
			.addFields([
				{
					name: "📋 Resumen General",
					value: `**Total:** ${stats.total} sugerencias\n⏳ **Pendientes:** ${stats.pending}\n✅ **Aprobadas:** ${stats.approved}\n❌ **Rechazadas:** ${stats.rejected}\n🎉 **Implementadas:** ${stats.implemented}`,
					inline: true,
				},
				{
					name: "📊 Estadísticas de Votos",
					value: `**Total de votos recibidos:** ${totalVotes}\n👍 **Votos positivos:** ${totalUpvotes}\n👎 **Votos negativos:** ${totalDownvotes}\n📈 **Promedio por sugerencia:** ${avgVotesPerSuggestion}`,
					inline: true,
				},
			])
			.setTimestamp();

		// Agregar información de la sugerencia más exitosa
		if (mostSuccessful) {
			const successScore =
				(mostSuccessful.upvotes || 0) - (mostSuccessful.downvotes || 0);
			embed.addFields([
				{
					name: "🏆 Sugerencia Más Exitosa",
					value: `**#${
						mostSuccessful.suggestionId
					}** (Puntuación: ${successScore})\n${mostSuccessful.content.substring(
						0,
						100,
					)}${mostSuccessful.content.length > 100 ? "..." : ""}`,
					inline: false,
				},
			]);
		}

		// Calcular tasas de éxito
		const successRate =
			stats.total > 0
				? (((stats.approved + stats.implemented) / stats.total) * 100).toFixed(
						1,
					)
				: 0;
		const rejectionRate =
			stats.total > 0 ? ((stats.rejected / stats.total) * 100).toFixed(1) : 0;

		embed.addFields([
			{
				name: "📈 Tasas de Éxito",
				value: `✅ **Tasa de aprobación:** ${successRate}%\n❌ **Tasa de rechazo:** ${rejectionRate}%`,
				inline: true,
			},
		]);

		await interaction.editReply({ embeds: [embed] });
	},

	async showServerStats(interaction, _plugin) {
		// Obtener todas las sugerencias del servidor
		const allSuggestions = await SuggestionData.find({
			guildId: interaction.guild.id,
		});

		if (allSuggestions.length === 0) {
			return await interaction.editReply({
				content: "📊 No hay sugerencias en este servidor aún.",
			});
		}

		// Calcular estadísticas generales
		const stats = {
			total: allSuggestions.length,
			pending: allSuggestions.filter((s) => s.status === "pending").length,
			approved: allSuggestions.filter((s) => s.status === "approved").length,
			rejected: allSuggestions.filter((s) => s.status === "rejected").length,
			implemented: allSuggestions.filter((s) => s.status === "implemented")
				.length,
		};

		// Estadísticas de votos
		const totalVotes = allSuggestions.reduce(
			(acc, s) =>
				acc + (s.upvotes || 0) + (s.downvotes || 0) + (s.neutralVotes || 0),
			0,
		);
		const totalUpvotes = allSuggestions.reduce(
			(acc, s) => acc + (s.upvotes || 0),
			0,
		);
		const totalDownvotes = allSuggestions.reduce(
			(acc, s) => acc + (s.downvotes || 0),
			0,
		);

		// Top autores
		const authorStats = {};
		for (const s of allSuggestions) {
			if (!authorStats[s.authorId]) {
				authorStats[s.authorId] = 0;
			}
			authorStats[s.authorId]++;
		}

		const topAuthors = Object.entries(authorStats)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 5);

		// Estadísticas por categoría si están habilitadas
		const categoryStats = {};
		for (const s of allSuggestions) {
			if (s.category) {
				if (!categoryStats[s.category]) {
					categoryStats[s.category] = 0;
				}
				categoryStats[s.category]++;
			}
		}

		const embed = new EmbedBuilder()
			.setColor(0x0099ff)
			.setTitle(`📊 Estadísticas del Servidor - ${interaction.guild.name}`)
			.setThumbnail(interaction.guild.iconURL())
			.addFields([
				{
					name: "📋 Resumen General",
					value: `**Total:** ${stats.total} sugerencias\n⏳ **Pendientes:** ${stats.pending}\n✅ **Aprobadas:** ${stats.approved}\n❌ **Rechazadas:** ${stats.rejected}\n🎉 **Implementadas:** ${stats.implemented}`,
					inline: true,
				},
				{
					name: "📊 Estadísticas de Votos",
					value: `**Total:** ${totalVotes} votos\n👍 **Positivos:** ${totalUpvotes}\n👎 **Negativos:** ${totalDownvotes}\n📈 **Promedio:** ${(
						totalVotes / stats.total
					).toFixed(1)} por sugerencia`,
					inline: true,
				},
			])
			.setTimestamp();

		// Agregar top autores
		if (topAuthors.length > 0) {
			const topAuthorsText = await Promise.all(
				topAuthors.map(async ([userId, count], index) => {
					const user = await interaction.client.users
						.fetch(userId)
						.catch(() => null);
					const username = user ? user.username : "Usuario desconocido";
					return `${index + 1}. **${username}**: ${count} sugerencias`;
				}),
			);

			embed.addFields([
				{
					name: "🏆 Top Autores",
					value: topAuthorsText.join("\n"),
					inline: false,
				},
			]);
		}

		// Agregar estadísticas por categoría
		if (Object.keys(categoryStats).length > 0) {
			const categoryText = Object.entries(categoryStats)
				.sort(([, a], [, b]) => b - a)
				.map(([category, count]) => `**${category}**: ${count}`)
				.join("\n");

			embed.addFields([
				{
					name: "🏷️ Por Categoría",
					value: categoryText,
					inline: true,
				},
			]);
		}

		// Calcular tasas
		const successRate = (
			((stats.approved + stats.implemented) / stats.total) *
			100
		).toFixed(1);
		const rejectionRate = ((stats.rejected / stats.total) * 100).toFixed(1);
		const pendingRate = ((stats.pending / stats.total) * 100).toFixed(1);

		embed.addFields([
			{
				name: "📈 Tasas del Servidor",
				value: `✅ **Aprobación:** ${successRate}%\n❌ **Rechazo:** ${rejectionRate}%\n⏳ **Pendientes:** ${pendingRate}%`,
				inline: true,
			},
		]);

		// Sugerencia más popular
		const mostPopular = allSuggestions.reduce((max, current) => {
			const currentVotes =
				(current.upvotes || 0) +
				(current.downvotes || 0) +
				(current.neutralVotes || 0);
			const maxVotes =
				(max.upvotes || 0) + (max.downvotes || 0) + (max.neutralVotes || 0);
			return currentVotes > maxVotes ? current : max;
		}, allSuggestions[0]);

		if (mostPopular) {
			const popularVotes =
				(mostPopular.upvotes || 0) +
				(mostPopular.downvotes || 0) +
				(mostPopular.neutralVotes || 0);
			embed.addFields([
				{
					name: "🔥 Sugerencia Más Popular",
					value: `**#${
						mostPopular.suggestionId
					}** (${popularVotes} votos totales)\n${mostPopular.content.substring(
						0,
						100,
					)}${mostPopular.content.length > 100 ? "..." : ""}`,
					inline: false,
				},
			]);
		}

		await interaction.editReply({ embeds: [embed] });
	},
};
