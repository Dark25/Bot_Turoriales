const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
	name: "plugin-reload",
	description: "Recarga un plugin (solo para desarrolladores)",
	default_member_permissions: PermissionFlagsBits.Administrator,
	options: [
		{
			name: "plugin",
			description: "Nombre del plugin a recargar",
			type: 3, // STRING
			required: true,
		},
	],

	async execute(_, interaction) {
		// Verificar si el usuario es el owner del bot
		if (interaction.user.id !== process.env.OWNER_ID) {
			return interaction.reply({
				content: "❌ Solo el propietario del bot puede usar este comando",
				ephemeral: true,
			});
		}

		const pluginManager = interaction.client.pluginManager;
		const pluginName = interaction.options.getString("plugin");

		if (!pluginManager) {
			return interaction.reply({
				content: "❌ Sistema de plugins no disponible",
				ephemeral: true,
			});
		}

		await interaction.deferReply({ ephemeral: true });

		try {
			// Verificar si el plugin existe
			if (!pluginManager.plugins.has(pluginName)) {
				return interaction.editReply({
					content: `❌ Plugin '${pluginName}' no encontrado`,
				});
			}

			// Recargar el plugin
			await pluginManager.reloadPlugin(pluginName);

			const embed = new EmbedBuilder()
				.setTitle("🔄 Plugin Recargado")
				.setDescription(
					`El plugin **${pluginName}** ha sido recargado exitosamente`,
				)
				.setColor("Green")
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error al recargar plugin:", error);

			const embed = new EmbedBuilder()
				.setTitle("❌ Error al Recargar")
				.setDescription(
					`Error al recargar el plugin **${pluginName}**:\n\`\`\`${error.message}\`\`\``,
				)
				.setColor("Red")
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		}
	},
};

/*
╔═══════════════════════════════════════════════════╗
║  || - ||   Código por ALDA#8939/el_alda   || - |  ║
║     --|   https://discord.gg/JpKGJFZCzK    |--    ║
╚═══════════════════════════════════════════════════╝
*/
