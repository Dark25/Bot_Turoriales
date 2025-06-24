const {
	EmbedBuilder,
	PermissionFlagsBits,
	ChannelType,
} = require("discord.js");

module.exports = {
	name: "welcome-setup",
	description: "Configura el sistema de bienvenida",
	default_member_permissions: PermissionFlagsBits.ManageGuild,
	options: [
		{
			name: "canal",
			description: "Canal donde se enviarán los mensajes de bienvenida",
			type: 7, // CHANNEL
			required: true,
			channel_types: [ChannelType.GuildText],
		},
		{
			name: "mensaje",
			description:
				"Mensaje personalizado (usa {user}, {server}, {memberCount})",
			type: 3, // STRING
			required: false,
		},
	],

	async execute(_, interaction) {
		const plugin = interaction.client.plugins.get("welcome");

		if (!plugin) {
			return interaction.reply({
				content: "❌ Plugin de bienvenida no disponible",
				ephemeral: true,
			});
		}

		// Verificar si el plugin está habilitado
		if (!(await plugin.isEnabled(interaction.guildId))) {
			return interaction.reply({
				content:
					"❌ El plugin de bienvenida está deshabilitado. Usa `/plugin-enable welcome` para habilitarlo.",
				ephemeral: true,
			});
		}

		const channel = interaction.options.getChannel("canal");
		const customMessage = interaction.options.getString("mensaje");

		try {
			// Obtener configuración actual
			const currentConfig = await plugin.getConfig(interaction.guildId);

			// Actualizar configuración
			const newConfig = {
				...currentConfig,
				welcomeChannel: channel.id,
				enabledWelcome: true,
			};

			if (customMessage) {
				newConfig.welcomeMessage = customMessage;
			}

			// Validar y guardar configuración
			plugin.validateConfig(newConfig);
			await plugin.updateConfig(interaction.guildId, newConfig);

			const embed = new EmbedBuilder()
				.setTitle("✅ Bienvenida Configurada")
				.setColor("Green")
				.addFields(
					{
						name: "Canal",
						value: `${channel}`,
						inline: true,
					},
					{
						name: "Mensaje",
						value: customMessage ? "Personalizado" : "Por defecto",
						inline: true,
					},
				)
				.setTimestamp();

			if (customMessage) {
				embed.addFields({
					name: "Vista Previa del Mensaje",
					value: customMessage
						.replace(/\{user\}/g, `<@${interaction.user.id}>`)
						.replace(/\{server\}/g, interaction.guild.name)
						.replace(
							/\{memberCount\}/g,
							interaction.guild.memberCount.toString(),
						),
					inline: false,
				});
			}

			await interaction.reply({ embeds: [embed], ephemeral: true });
		} catch (error) {
			console.error("Error al configurar bienvenida:", error);

			await interaction.reply({
				content: `❌ Error al configurar bienvenida: ${error.message}`,
				ephemeral: true,
			});
		}
	},
};
