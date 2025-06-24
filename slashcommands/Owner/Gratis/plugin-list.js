const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
	name: "plugin-list",
	description: "Lista todos los plugins disponibles",
	default_member_permissions: PermissionFlagsBits.Administrator,

	async execute(_, interaction) {
		const pluginManager = interaction.client.pluginManager;

		if (!pluginManager) {
			return interaction.reply({
				content: "❌ Sistema de plugins no disponible",
				ephemeral: true,
			});
		}

		const plugins = pluginManager.listPlugins();

		if (plugins.length === 0) {
			return interaction.reply({
				content: "📦 No hay plugins cargados",
				ephemeral: true,
			});
		}

		const embed = new EmbedBuilder()
			.setTitle("📦 Plugins Disponibles")
			.setColor("Blue")
			.setTimestamp();

		let description = "";

		for (const plugin of plugins) {
			const isEnabled = await pluginManager.isPluginEnabled(
				interaction.guildId,
				plugin.name,
			);

			const status = isEnabled ? "🟢 Habilitado" : "🔴 Deshabilitado";

			description += `**${plugin.name}** v${plugin.version}\n`;
			description += `└ ${plugin.description}\n`;
			description += `└ Estado: ${status}\n`;
			description += `└ Autor: ${plugin.author}\n\n`;
		}

		embed.setDescription(description || "No hay plugins para mostrar");

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};

/*
╔═══════════════════════════════════════════════════╗
║  || - ||   Código por ALDA#8939/el_alda   || - |  ║
║     --|   https://discord.gg/JpKGJFZCzK    |--    ║
╚═══════════════════════════════════════════════════╝
*/
