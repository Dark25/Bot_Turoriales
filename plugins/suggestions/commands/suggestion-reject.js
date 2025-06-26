const {
	PermissionFlagsBits,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
} = require("discord.js");
const SuggestionData = require("../schemas/SuggestionData");

module.exports = {
	name: "suggestion-reject",
	description: "Rechaza una sugerencia",
	defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
	options: [
		{
			name: "id",
			description: "ID de la sugerencia a rechazar",
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

			// Verificar permisos
			const canApprove = await plugin.canApproveSuggestions(
				interaction.member,
				interaction.guild.id,
			);
			if (!canApprove) {
				return await interaction.reply({
					content: "❌ No tienes permisos para rechazar sugerencias.",
					ephemeral: true,
				});
			}

			const suggestionId = interaction.options.getInteger("id");

			// Buscar la sugerencia
			const suggestion = await SuggestionData.findOne({
				guildId: interaction.guild.id,
				suggestionId: suggestionId,
			});

			if (!suggestion) {
				return await interaction.reply({
					content: `❌ No se encontró la sugerencia #${suggestionId}.`,
					ephemeral: true,
				});
			}

			if (suggestion.status !== "pending") {
				return await interaction.reply({
					content: `❌ La sugerencia #${suggestionId} ya fue ${
						suggestion.status === "approved" ? "aprobada" : "rechazada"
					}.`,
					ephemeral: true,
				});
			}

			// Crear modal para nota del administrador (opcional)
			const modal = new ModalBuilder()
				.setCustomId(`reject_suggestion_${suggestionId}`)
				.setTitle(`Rechazar Sugerencia #${suggestionId}`);

			const noteInput = new TextInputBuilder()
				.setCustomId("admin_note")
				.setLabel("Razón del rechazo (recomendado)")
				.setStyle(TextInputStyle.Paragraph)
				.setPlaceholder("Explica por qué fue rechazada esta sugerencia...")
				.setRequired(false)
				.setMaxLength(500);

			const firstActionRow = new ActionRowBuilder().addComponents(noteInput);
			modal.addComponents(firstActionRow);

			await interaction.showModal(modal);
		} catch (error) {
			console.error("Error en suggestion-reject:", error);
			if (!interaction.replied && !interaction.deferred) {
				await interaction.reply({
					content: "❌ Ocurrió un error al procesar el rechazo.",
					ephemeral: true,
				});
			}
		}
	},
};
