const { readdirSync } = require("node:fs");

module.exports = {
	async loadSlash(client) {
		console.log("📁 Cargando comandos slash...".cyan);

		for (const category of readdirSync("./slashcommands")) {
			for (const otherCategory of readdirSync(`./slashcommands/${category}`)) {
				for (const fileName of readdirSync(
					`./slashcommands/${category}/${otherCategory}`,
				).filter((file) => file.endsWith(".js"))) {
					try {
						// Limpiar cache
						const commandPath = require.resolve(
							`../slashcommands/${category}/${otherCategory}/${fileName}`,
						);
						delete require.cache[commandPath];

						const command = require(
							`../slashcommands/${category}/${otherCategory}/${fileName}`,
						);

						if (!command.name || !command.description) {
							console.warn(
								`⚠️ Comando ${fileName} no tiene name o description`.yellow,
							);
							continue;
						}

						client.slashCommands.set(command.name, command);
						console.log(`✅ Comando cargado: ${command.name}`.green);
					} catch (error) {
						console.error(
							`❌ Error al cargar ${fileName}: ${error.message}`.red,
						);
					}
				}
			}
		}

		console.log(`📊 ${client.slashCommands.size} comandos base cargados`.blue);

		// No registrar automáticamente en Discord aquí
		// Eso se hará después de cargar plugins
	},
};

/*
╔═══════════════════════════════════════════════════╗
║  || - ||   Código por ALDA#8939/el_alda   || - |  ║
║     --|   https://discord.gg/JpKGJFZCzK    |--    ║
╚═══════════════════════════════════════════════════╝
*/
