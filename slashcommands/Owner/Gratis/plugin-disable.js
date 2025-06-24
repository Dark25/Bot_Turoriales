const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
	name: "plugin-disable",
	description: "Deshabilita un plugin en este servidor",
	default_member_permissions: PermissionFlagsBits.Administrator,
	options: [
		{
			name: "plugin",
			description: "Nombre del plugin a deshabilitar",
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

			// Verificar si ya está deshabilitado
			const isEnabled = await pluginManager.isPluginEnabled(
				interaction.guildId,
				pluginName,
			);

			if (!isEnabled) {
				return interaction.reply({
					content: `⚠️ Plugin '${pluginName}' ya está deshabilitado`,
					ephemeral: true,
				});
			}

			// Deshabilitar el plugin
			await pluginManager.disablePlugin(interaction.guildId, pluginName);

			const embed = new EmbedBuilder()
				.setTitle("🔴 Plugin Deshabilitado")
				.setDescription(
					`El plugin **${pluginName}** ha sido deshabilitado en este servidor`,
				)
				.setColor("Red")
				.setTimestamp();

			await interaction.reply({ embeds: [embed], ephemeral: true });
		} catch (error) {
			console.error("Error al deshabilitar plugin:", error);

			await interaction.reply({
				content: `❌ Error al deshabilitar el plugin: ${error.message}`,
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
