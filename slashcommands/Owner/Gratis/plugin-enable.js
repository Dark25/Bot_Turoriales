const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
	name: "plugin-enable",
	description: "Habilita un plugin en este servidor",
	default_member_permissions: PermissionFlagsBits.Administrator,
	options: [
		{
			name: "plugin",
			description: "Nombre del plugin a habilitar",
			type: 3, // STRING
			required: true,
		},
	],

	async execute(_, interaction) {
		const pluginManager = interaction.client.pluginManager;
		const pluginName = interaction.options.getString("plugin");

		if (!pluginManager) {
			return interaction.reply({
				content: "❌ Sistema de plugins no disponible",
				ephemeral: true,
			});
		}

		try {
			// Verificar si el plugin existe
			if (!pluginManager.plugins.has(pluginName)) {
				return interaction.reply({
					content: `❌ Plugin '${pluginName}' no encontrado`,
					ephemeral: true,
				});
			}

			// Verificar si ya está habilitado
			const isEnabled = await pluginManager.isPluginEnabled(
				interaction.guildId,
				pluginName,
			);

			if (isEnabled) {
				return interaction.reply({
					content: `⚠️ Plugin '${pluginName}' ya está habilitado`,
					ephemeral: true,
				});
			}

			// Habilitar el plugin
			await pluginManager.enablePlugin(interaction.guildId, pluginName);

			const embed = new EmbedBuilder()
				.setTitle("✅ Plugin Habilitado")
				.setDescription(
					`El plugin **${pluginName}** ha sido habilitado en este servidor`,
				)
				.setColor("Green")
				.setTimestamp();

			await interaction.reply({ embeds: [embed], ephemeral: true });
		} catch (error) {
			console.error("Error al habilitar plugin:", error);

			await interaction.reply({
				content: `❌ Error al habilitar el plugin: ${error.message}`,
				ephemeral: true,
			});
		}
	},
};

/*
╔═══════════════════════════════════════════════════╗
║  || - ||   Código por ALDA#8939/el_alda   || - |  ║
║     --|   https://discord.gg/JpKGJFZCzK    |--    ║
╚═══════════════════════════════════════════════════╝
*/
