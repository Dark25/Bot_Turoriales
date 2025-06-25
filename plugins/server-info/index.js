const BasePlugin = require("../BasePlugin");
const path = require("node:path");

module.exports = class ServerInfoPlugin extends BasePlugin {
	constructor(client) {
		super(client);
		this.name = "Server Info";
		this.version = "1.0.0";
		this.description =
			"Muestra información detallada sobre el servidor y los usuarios.";
		this.author = "Dark25";
		this.commands = [
			path.join(__dirname, "commands", "serverinfo.js"),
			path.join(__dirname, "commands", "userinfo.js"),
			path.join(__dirname, "commands", "channelinfo.js"),
			path.join(__dirname, "commands", "roleinfo.js"),
			path.join(__dirname, "commands", "memberlist.js"),
			path.join(__dirname, "commands", "server-stats.js"),
		];

		// Variable para rastrear si los eventos están registrados
		this.eventsRegistered = false;
	}

	async onLoad() {
		try {
			// Solo registrar eventos si no están ya registrados
			if (!this.eventsRegistered) {
				// Registrar el manejador de eventos para los botones manualmente
				const buttonHandler = require("./events/buttonHandler");

				// Registrar directamente en el cliente
				this.client.on("interactionCreate", async (interaction) => {
					try {
						// Solo procesar botones de este plugin
						if (!interaction.isButton()) return;

						const buttonId = interaction.customId;
						if (
							buttonId.startsWith("stats_refresh_") ||
							buttonId.startsWith("memberlist_refresh_")
						) {
							await buttonHandler.execute(interaction, this.client);
						}
					} catch (error) {
						console.error(`Error en evento de ${this.name}:`, error);
					}
				});

				this.eventsRegistered = true;
			}
		} catch (error) {
			console.error(`❌ Error cargando plugin ${this.name}:`, error.message);
			throw error;
		}
	}

	async onUnload() {
		try {
			console.log(`🔄 Descargando plugin ${this.name}...`);
			this.eventsRegistered = false;
			// Los eventos se mantendrán hasta que se reinicie el bot
		} catch (error) {
			console.error(`❌ Error descargando plugin ${this.name}:`, error.message);
		}
	}
};
