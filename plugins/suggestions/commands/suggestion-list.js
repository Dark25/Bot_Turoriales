const { EmbedBuilder } = require("discord.js");
const SuggestionData = require("../schemas/SuggestionData");

module.exports = {
	name: "suggestion-list",
	description: "Lista las sugerencias del servidor",
	options: [
		{
			name: "estado",
			description: "Filtrar por estado",
			type: 3, // STRING
			required: false,
			choices: [
				{ name: "⏳ Pendientes", value: "pending" },
				{ name: "✅ Aprobadas", value: "approved" },
				{ name: "❌ Rechazadas", value: "rejected" },
				{ name: "🎉 Implementadas", value: "implemented" },
			],
		},
		{
			name: "autor",
			description: "Filtrar por autor",
			type: 6, // USER
			required: false,
		},
		{
			name: "categoria",
			description: "Filtrar por categoría",
			type: 3, // STRING
			required: false,
			choices: [
				{ name: "💭 General", value: "general" },
				{ name: "✨ Características", value: "features" },
				{ name: "🐛 Errores", value: "bugs" },
				{ name: "📈 Mejoras", value: "improvements" },
			],
		},
		{
			name: "pagina",
			description: "Número de página (por defecto: 1)",
			type: 4, // INTEGER
			min_value: 1,
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

			// Obtener filtros
			const status = interaction.options.getString("estado");
			const author = interaction.options.getUser("autor");
			const category = interaction.options.getString("categoria");
			const page = interaction.options.getInteger("pagina") || 1;

			// Construir filtro de búsqueda
			const filter = { guildId: interaction.guild.id };
			if (status) filter.status = status;
			if (author) filter.authorId = author.id;
			if (category) filter.category = category;

			// Configuración de paginación
			const itemsPerPage = 5;
			const skip = (page - 1) * itemsPerPage;

			// Buscar sugerencias
			const [suggestions, totalCount] = await Promise.all([
				SuggestionData.find(filter)
					.sort({ createdAt: -1 })
					.skip(skip)
					.limit(itemsPerPage),
				SuggestionData.countDocuments(filter),
			]);

			if (totalCount === 0) {
				return await interaction.editReply({
					content: "📭 No se encontraron sugerencias con esos filtros.",
				});
			}

			const totalPages = Math.ceil(totalCount / itemsPerPage);

			// Crear embed
			const embed = new EmbedBuilder()
				.setColor(0x0099ff)
				.setTitle("📋 Lista de Sugerencias")
				.setFooter({
					text: `Página ${page} de ${totalPages} • Total: ${totalCount} sugerencias`,
				})
				.setTimestamp();

			// Agregar información de filtros si están activos
			const filterInfo = [];
			if (status) filterInfo.push(`Estado: ${plugin.getStatusText(status)}`);
			if (author) filterInfo.push(`Autor: ${author.username}`);
			if (category) filterInfo.push(`Categoría: ${category}`);

			if (filterInfo.length > 0) {
				embed.setDescription(
					`**Filtros activos:** ${filterInfo.join(" | ")}\n\u200b`,
				);
			}

			// Agregar sugerencias al embed
			for (const suggestion of suggestions) {
				const author = await interaction.client.users
					.fetch(suggestion.authorId)
					.catch(() => null);
				const authorName = author ? author.username : "Usuario desconocido";

				let fieldValue = `**Autor:** ${authorName}\n`;
				fieldValue += `**Estado:** ${plugin.getStatusText(
					suggestion.status,
				)}\n`;

				if (suggestion.category) {
					fieldValue += `**Categoría:** ${suggestion.category}\n`;
				}

				fieldValue += `**Votos:** 👍 ${suggestion.upvotes || 0} | 👎 ${
					suggestion.downvotes || 0
				}\n`;
				fieldValue += `**Creada:** <t:${Math.floor(
					suggestion.createdAt.getTime() / 1000,
				)}:R>\n`;

				// Truncar contenido si es muy largo
				let content = suggestion.content;
				if (content.length > 100) {
					content = `${content.substring(0, 97)}...`;
				}
				fieldValue += `**Contenido:** ${content}`;

				embed.addFields([
					{
						name: `💡 Sugerencia #${suggestion.suggestionId}`,
						value: fieldValue,
						inline: false,
					},
				]);
			}

			// Agregar instrucciones de navegación si hay múltiples páginas
			if (totalPages > 1) {
				embed.addFields([
					{
						name: "📖 Navegación",
						value: `Usa \`/suggestion-list pagina:${
							page + 1
						}\` para ver la siguiente página.`,
						inline: false,
					},
				]);
			}

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en suggestion-list:", error);
			if (interaction.deferred) {
				await interaction.editReply({
					content: "❌ Ocurrió un error al obtener la lista de sugerencias.",
				});
			} else {
				await interaction.reply({
					content: "❌ Ocurrió un error al obtener la lista de sugerencias.",
					ephemeral: true,
				});
			}
		}
	},
};
