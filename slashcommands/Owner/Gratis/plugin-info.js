const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
	name: "plugin-info",
	description: "Muestra información detallada de un plugin",
	default_member_permissions: PermissionFlagsBits.Administrator,
	options: [
		{
			name: "plugin",
			description: "Nombre del plugin",
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

		const pluginInfo = pluginManager.getPluginInfo(pluginName);

		if (!pluginInfo) {
			return interaction.reply({
				content: `❌ Plugin '${pluginName}' no encontrado`,
				ephemeral: true,
			});
		}

		const isEnabled = await pluginManager.isPluginEnabled(
			interaction.guildId,
			pluginName,
		);

		const embed = new EmbedBuilder()
			.setTitle(`📦 ${pluginInfo.name}`)
			.setColor("Blue")
			.setTimestamp()
			.addFields(
				{
					name: "📋 Información Básica",
					value: [
						`**Versión:** ${pluginInfo.version}`,
						`**Autor:** ${pluginInfo.author}`,
						`**Estado:** ${isEnabled ? "🟢 Habilitado" : "🔴 Deshabilitado"}`,
					].join("\n"),
					inline: false,
				},
				{
					name: "📝 Descripción",
					value: pluginInfo.description || "Sin descripción",
					inline: false,
				},
			);

		if (pluginInfo.commands.length > 0) {
			embed.addFields({
				name: "⚡ Comandos",
				value: pluginInfo.commands.map((cmd) => `\`/${cmd}\``).join(", "),
				inline: false,
			});
		}

		if (pluginInfo.events.length > 0) {
			embed.addFields({
				name: "🎯 Eventos",
				value: pluginInfo.events.map((event) => `\`${event}\``).join(", "),
				inline: false,
			});
		}

		await interaction.reply({ embeds: [embed], ephemeral: true });
	},
};

/*
╔═══════════════════════════════════════════════════╗
║  || - ||   Código por ALDA#8939/el_alda   || - |  ║
║     --|   https://discord.gg/JpKGJFZCzK    |--    ║
╚═══════════════════════════════════════════════════╝
*/
