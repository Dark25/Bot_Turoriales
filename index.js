const { Client, Collection } = require("discord.js");
const mongoose = require("mongoose");
const client = new Client({ intents: 3276799 });
require("colors");
require("dotenv").config();
const { loadSlash } = require("./handlers/slashHandler");
const { loadEvents } = require("./handlers/eventHandler");
const PluginManager = require("./handlers/pluginManager");

client.slashCommands = new Collection();
client.pluginManager = new PluginManager(client);

// Función para verificar si MongoDB está conectado
function isMongoConnected() {
	return mongoose.connection.readyState === 1;
}

// Hacer la función disponible globalmente en el cliente
client.isMongoConnected = isMongoConnected;

(async () => {
	// Conectar a MongoDB
	if (process.env.MONGODB_URI) {
		try {
			await mongoose.connect(process.env.MONGODB_URI, {
				serverSelectionTimeoutMS: 5000, // Timeout de 5 segundos
			});
			console.log("» | Conectado a MongoDB".green);
		} catch (error) {
			console.error(`» | Error al conectar a MongoDB => ${error.message}`.red);
			console.log(
				"» | El bot continuará funcionando sin base de datos (funcionalidad limitada)"
					.yellow,
			);
		}
	} else {
		console.log(
			"» | MONGODB_URI no configurado - funcionando sin base de datos".yellow,
		);
	}

	await client
		.login(process.env.TOKEN)
		.catch((err) => console.error(`» | Error al iniciar el bot => ${err}`.red));
})();

loadEvents(client);

// Evento ready específico para carga de comandos y plugins
client.once("ready", async () => {
	// Cargar comandos base
	await loadSlash(client);

	// Cargar plugins
	try {
		await client.pluginManager.loadAllPlugins();
	} catch (error) {
		console.error(`» | Error al cargar plugins => ${error.message}`.red);
	}

	// Registrar todos los comandos en Discord (una sola vez)
	try {
		await client.pluginManager.refreshDiscordCommands();
	} catch (error) {
		console.error(
			`» | Error al registrar comandos en Discord => ${error.message}`.red,
		);
	}

	console.log(`» | Bot encendido con la cuenta de: ${client.user.tag}`.blue);
});

/*
╔═══════════════════════════════════════════════════╗
║  || - ||   Código por ALDA#8939/el_alda   || - |  ║
║     --|   https://discord.gg/JpKGJFZCzK    |--    ║
╚═══════════════════════════════════════════════════╝
*/
