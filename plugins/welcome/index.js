const BasePlugin = require("../BasePlugin");

class WelcomePlugin extends BasePlugin {
	constructor(client) {
		super(client);

		// Información del plugin
		this.name = "welcome";
		this.version = "1.0.0";
		this.description = "Sistema de bienvenida para nuevos miembros";
		this.author = "ALDA#8939";

		// Configuración del plugin
		this.configSchema = {
			welcomeChannel: {
				type: "string",
				required: true,
				description: "ID del canal de bienvenida",
			},
			welcomeMessage: {
				type: "string",
				required: false,
				description: "Mensaje personalizado de bienvenida",
			},
			enabledWelcome: {
				type: "boolean",
				required: false,
				description: "Si está habilitado el sistema de bienvenida",
			},
		};
	}

	/**
	 * Se ejecuta cuando el plugin es cargado
	 */
	async onLoad() {
		this.log("Plugin de bienvenida cargado", "success");

		// Registrar evento de miembro nuevo
		this.registerEvent({
			name: "guildMemberAdd",
			execute: this.onMemberJoin.bind(this),
		});
	}

	/**
	 * Se ejecuta cuando el plugin es descargado
	 */
	async onUnload() {
		this.log("Plugin de bienvenida descargado", "warn");
	}

	/**
	 * Maneja cuando un nuevo miembro se une
	 */
	async onMemberJoin(member) {
		try {
			// Verificar si el plugin está habilitado en este servidor
			if (!(await this.isEnabled(member.guild.id))) {
				return;
			}

			// Obtener configuración del servidor
			const config = await this.getConfig(member.guild.id);

			if (!config.welcomeChannel) {
				return;
			}

			// Buscar el canal de bienvenida
			const welcomeChannel = member.guild.channels.cache.get(
				config.welcomeChannel,
			);

			if (!welcomeChannel) {
				this.log(
					`Canal de bienvenida no encontrado: ${config.welcomeChannel}`,
					"warn",
				);
				return;
			}

			// Crear mensaje de bienvenida
			const { EmbedBuilder } = require("discord.js");

			const defaultMessage =
				"¡Bienvenido {user} a **{server}**! 🎉\n\nEspero que disfrutes tu estadía aquí.";
			const welcomeMessage = config.welcomeMessage || defaultMessage;

			// Reemplazar variables
			const message = welcomeMessage
				.replace(/\{user\}/g, `<@${member.id}>`)
				.replace(/\{server\}/g, member.guild.name)
				.replace(/\{memberCount\}/g, member.guild.memberCount.toString());

			const embed = new EmbedBuilder()
				.setTitle("¡Nuevo Miembro!")
				.setDescription(message)
				.setColor("Green")
				.setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
				.setTimestamp()
				.setFooter({
					text: `Miembro #${member.guild.memberCount}`,
					iconURL: member.guild.iconURL({ dynamic: true }),
				});

			await welcomeChannel.send({ embeds: [embed] });

			this.log(`Mensaje de bienvenida enviado para ${member.user.tag}`, "info");
		} catch (error) {
			this.log(
				`Error al enviar mensaje de bienvenida: ${error.message}`,
				"error",
			);
		}
	}
}

module.exports = WelcomePlugin;
