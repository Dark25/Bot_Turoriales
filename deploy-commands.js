const { Client, REST, Routes } = require("discord.js");
const { readdirSync } = require("node:fs");
require("colors");
require("dotenv").config();

// Verificar variables de entorno
if (!process.env.TOKEN) {
	console.error("❌ TOKEN no encontrado en el archivo .env".red);
	process.exit(1);
}

const client = new Client({ intents: [] }); // No necesitamos intents para registrar comandos
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

/**
 * Convierte BigInt a string para serialización
 */
function serializePermissions(permissions) {
	if (permissions === null || permissions === undefined) return null;
	if (typeof permissions === "bigint") return permissions.toString();
	if (typeof permissions === "string") return permissions;
	if (typeof permissions === "number") return permissions.toString();
	return null;
}

/**
 * Carga todos los comandos slash del bot
 */
function loadCommands() {
	const commands = [];

	console.log("📁 Cargando comandos slash...".cyan);

	// Cargar comandos normales
	for (const category of readdirSync("./slashcommands")) {
		for (const otherCategory of readdirSync(`./slashcommands/${category}`)) {
			const commandFiles = readdirSync(
				`./slashcommands/${category}/${otherCategory}`,
			).filter((file) => file.endsWith(".js"));

			for (const fileName of commandFiles) {
				try {
					// Limpiar cache del comando
					const commandPath = require("node:path").resolve(
						`./slashcommands/${category}/${otherCategory}/${fileName}`,
					);
					delete require.cache[commandPath];

					const command = require(
						`./slashcommands/${category}/${otherCategory}/${fileName}`,
					);

					if (!command.name || !command.description) {
						console.warn(
							`⚠️  Comando en ${fileName} no tiene name o description`.yellow,
						);
						continue;
					}

					const commandData = {
						name: command.name,
						description: command.description,
						options: command.options || [],
						default_member_permissions: serializePermissions(
							command.default_member_permissions,
						),
						dm_permission:
							command.dm_permission !== undefined
								? command.dm_permission
								: true,
						nsfw: command.nsfw || false,
					};

					commands.push(commandData);
					console.log(`✅ Comando cargado: ${command.name}`.green);
				} catch (error) {
					console.error(`❌ Error al cargar ${fileName}: ${error.message}`.red);
				}
			}
		}
	}

	return commands;
}

/**
 * Carga comandos de plugins
 */
function loadPluginCommands() {
	const commands = [];
	const pluginsDir = "./plugins";

	if (!require("node:fs").existsSync(pluginsDir)) {
		console.log("📦 No se encontró directorio de plugins".yellow);
		return commands;
	}

	console.log("🔌 Cargando comandos de plugins...".cyan);

	try {
		const pluginFolders = readdirSync(pluginsDir).filter((item) =>
			require("node:fs").statSync(`${pluginsDir}/${item}`).isDirectory(),
		);

		for (const folder of pluginFolders) {
			const commandsPath = `${pluginsDir}/${folder}/commands`;

			if (!require("node:fs").existsSync(commandsPath)) continue;

			const commandFiles = readdirSync(commandsPath).filter((file) =>
				file.endsWith(".js"),
			);

			for (const file of commandFiles) {
				try {
					// Limpiar cache
					const commandPath = require("node:path").resolve(
						`${commandsPath}/${file}`,
					);
					delete require.cache[commandPath];

					const command = require(commandPath);

					if (!command.name || !command.description) {
						console.warn(
							`⚠️  Comando de plugin en ${file} no tiene name o description`
								.yellow,
						);
						continue;
					}

					const commandData = {
						name: command.name,
						description: command.description,
						options: command.options || [],
						default_member_permissions: serializePermissions(
							command.default_member_permissions,
						),
						dm_permission:
							command.dm_permission !== undefined
								? command.dm_permission
								: true,
						nsfw: command.nsfw || false,
					};

					commands.push(commandData);
					console.log(
						`✅ Comando de plugin cargado: ${command.name} (${folder})`.green,
					);
				} catch (error) {
					console.error(
						`❌ Error al cargar comando de plugin ${file}: ${error.message}`
							.red,
					);
				}
			}
		}
	} catch (error) {
		console.error(
			`❌ Error al cargar comandos de plugins: ${error.message}`.red,
		);
	}

	return commands;
}

/**
 * Registra comandos globalmente
 */
async function deployGlobal(commands) {
	try {
		console.log(
			`🌍 Registrando ${commands.length} comandos globalmente...`.blue,
		);

		await rest.put(Routes.applicationCommands(client.user.id), {
			body: commands,
		});

		console.log(`✅ ${commands.length} comandos registrados globalmente`.green);
		console.log(
			"ℹ️  Los comandos globales pueden tardar hasta 1 hora en aparecer".yellow,
		);
	} catch (error) {
		console.error(
			`❌ Error al registrar comandos globalmente: ${error.message}`.red,
		);
		throw error;
	}
}

/**
 * Registra comandos en un servidor específico
 */
async function deployGuild(commands, guildId) {
	try {
		console.log(
			`🏠 Registrando ${commands.length} comandos en el servidor ${guildId}...`
				.blue,
		);

		await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
			body: commands,
		});

		console.log(
			`✅ ${commands.length} comandos registrados en el servidor`.green,
		);
		console.log("ℹ️  Los comandos del servidor aparecen inmediatamente".green);
	} catch (error) {
		console.error(
			`❌ Error al registrar comandos en el servidor: ${error.message}`.red,
		);
		throw error;
	}
}

/**
 * Elimina todos los comandos
 */
async function clearCommands(guildId = null) {
	try {
		if (guildId) {
			console.log(`🗑️  Eliminando comandos del servidor ${guildId}...`.red);
			await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
				body: [],
			});
			console.log("✅ Comandos del servidor eliminados".green);
		} else {
			console.log("🗑️  Eliminando comandos globales...".red);
			await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
			console.log("✅ Comandos globales eliminados".green);
		}
	} catch (error) {
		console.error(`❌ Error al eliminar comandos: ${error.message}`.red);
		throw error;
	}
}

/**
 * Función principal
 */
async function main() {
	const args = process.argv.slice(2);
	const command = args[0];
	const guildId = args[1];

	try {
		// Inicializar cliente para obtener ID de aplicación
		await client.login(process.env.TOKEN);
		console.log(`🤖 Bot conectado como: ${client.user.tag}`.blue);

		// Cargar todos los comandos
		const normalCommands = loadCommands();
		const pluginCommands = loadPluginCommands();
		const allCommands = [...normalCommands, ...pluginCommands];

		console.log(`📊 Total de comandos cargados: ${allCommands.length}`.cyan);

		// Debug: mostrar algunos comandos y sus permisos
		console.log("\n🔍 Muestra de comandos cargados:".cyan);
		for (const cmd of allCommands.slice(0, 3)) {
			console.log(
				`  /${cmd.name} - Permisos: ${cmd.default_member_permissions || "ninguno"}`,
			);
		}

		switch (command) {
			case "global":
				await deployGlobal(allCommands);
				break;

			case "guild":
				if (!guildId) {
					console.error(
						"❌ Debes proporcionar un ID de servidor para comandos de guild"
							.red,
					);
					console.log("Uso: node deploy-commands.js guild [GUILD_ID]".yellow);
					process.exit(1);
				}
				await deployGuild(allCommands, guildId);
				break;

			case "clear":
				await clearCommands(guildId);
				break;

			case "list":
				console.log("\n📋 Comandos cargados:".cyan);
				allCommands.forEach((cmd, index) => {
					const perms = cmd.default_member_permissions
						? `(Permisos: ${cmd.default_member_permissions})`
						: "(Sin permisos especiales)";
					console.log(
						`${index + 1}. /${cmd.name} - ${cmd.description} ${perms}`,
					);
				});
				break;

			default:
				console.log(
					`
🚀 Script de Despliegue de Comandos Discord

Uso:
  node deploy-commands.js <comando> [opciones]

Comandos disponibles:
  global              Despliega comandos globalmente (tardan 1 hora)
  guild <GUILD_ID>    Despliega comandos en un servidor específico (inmediato)
  clear               Elimina todos los comandos globales
  clear <GUILD_ID>    Elimina todos los comandos de un servidor
  list                Lista todos los comandos cargados

Ejemplos:
  node deploy-commands.js global
  node deploy-commands.js guild 123456789012345678
  node deploy-commands.js clear
  node deploy-commands.js clear 123456789012345678
  node deploy-commands.js list

🔧 Scripts de npm disponibles:
  npm run deploy:global    - Despliega globalmente
  npm run deploy:guild     - Requiere ID de servidor como argumento
  npm run deploy:clear     - Limpia comandos globales
  npm run deploy:list      - Lista comandos
  npm run quick-deploy     - Despliegue rápido para desarrollo
				`.trim(),
				);
		}
	} catch (error) {
		console.error(`💥 Error fatal: ${error.message}`.red);
		if (error.stack) {
			console.error("Stack trace:".red, error.stack);
		}
		process.exit(1);
	} finally {
		client.destroy();
		process.exit(0);
	}
}

// Manejar errores no capturados
process.on("unhandledRejection", (error) => {
	console.error("💥 Error no manejado:", error);
	process.exit(1);
});

// Ejecutar script
main();
