const { readdirSync, existsSync, statSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { Collection } = require("discord.js");
const PluginConfig = require("../Schemas/Configuraciones/PluginConfig");
require("colors");

class PluginManager {
	constructor(client) {
		this.client = client;
		this.plugins = new Collection();
		this.pluginCommands = new Collection();
		this.pluginEvents = new Collection();
		this.pluginsPath = resolve(__dirname, "../plugins");

		// Cache en memoria para configuraciones cuando MongoDB no está disponible
		this.configCache = new Map();

		// Flag para evitar carga múltiple
		this.isLoaded = false;

		// Inicializar colecciones en el cliente si no existen
		if (!this.client.plugins) this.client.plugins = new Collection();
		if (!this.client.pluginCommands)
			this.client.pluginCommands = new Collection();
	}

	/**
	 * Verifica si MongoDB está disponible
	 */
	isMongoAvailable() {
		try {
			const mongoose = require("mongoose");
			return mongoose.connection.readyState === 1;
		} catch (error) {
			console.warn(
				`» | Error al verificar estado de MongoDB: ${error.message}`.yellow,
			);
			return false;
		}
	}

	/**
	 * Carga todos los plugins disponibles
	 */
	async loadAllPlugins() {
		if (this.isLoaded) {
			console.log("» | Plugins ya cargados, omitiendo...".yellow);
			return;
		}

		if (!existsSync(this.pluginsPath)) {
			console.log(
				"» | Directorio de plugins no encontrado, creándolo...".yellow,
			);
			return;
		}

		const pluginFolders = readdirSync(this.pluginsPath).filter((item) => {
			const itemPath = join(this.pluginsPath, item);
			return statSync(itemPath).isDirectory();
		});

		console.log(`» | Cargando ${pluginFolders.length} plugin(s)...`.cyan);

		for (const folder of pluginFolders) {
			try {
				await this.loadPlugin(folder);
			} catch (error) {
				console.error(
					`» | Error al cargar plugin '${folder}': ${error.message}`.red,
				);
			}
		}

		this.isLoaded = true;
		console.log(`» | Plugins cargados: ${this.plugins.size}`.green);
	}

	/**
	 * Carga un plugin específico
	 */
	async loadPlugin(pluginName) {
		const pluginPath = join(this.pluginsPath, pluginName);

		if (!existsSync(pluginPath)) {
			throw new Error(`Plugin '${pluginName}' no encontrado`);
		}

		// Verificar si existe el archivo principal del plugin
		const mainFile = join(pluginPath, "index.js");
		if (!existsSync(mainFile)) {
			throw new Error(`Plugin '${pluginName}' no tiene archivo index.js`);
		}

		// Limpiar cache si ya existe
		delete require.cache[require.resolve(mainFile)];

		// Cargar el plugin
		const PluginClass = require(mainFile);

		if (typeof PluginClass !== "function") {
			throw new Error(`Plugin '${pluginName}' debe exportar una clase`);
		}

		const plugin = new PluginClass(this.client);

		// Validar estructura del plugin
		if (!plugin.name || !plugin.version || !plugin.description) {
			throw new Error(
				`Plugin '${pluginName}' debe tener name, version y description`,
			);
		}

		// Inicializar el plugin
		if (typeof plugin.onLoad === "function") {
			await plugin.onLoad();
		}

		// Cargar comandos del plugin
		await this.loadPluginCommands(plugin, pluginPath);

		// Cargar eventos del plugin
		await this.loadPluginEvents(plugin, pluginPath);

		// Registrar el plugin
		this.plugins.set(plugin.name, plugin);
		this.client.plugins.set(plugin.name, plugin);

		console.log(`✅ Plugin '${plugin.name}' v${plugin.version} cargado`.green);
		return plugin;
	}

	/**
	 * Carga los comandos de un plugin
	 */
	async loadPluginCommands(plugin, pluginPath) {
		const commandsPath = join(pluginPath, "commands");

		if (!existsSync(commandsPath)) return;

		const commandFiles = readdirSync(commandsPath).filter((file) =>
			file.endsWith(".js"),
		);

		for (const file of commandFiles) {
			const commandPath = join(commandsPath, file);
			delete require.cache[require.resolve(commandPath)];

			const command = require(commandPath);

			if (!command.name || !command.execute) {
				console.warn(
					`» | Comando '${file}' del plugin '${plugin.name}' no válido`.yellow,
				);
				continue;
			}

			// Agregar metadatos del plugin al comando
			command.plugin = plugin.name;
			command.pluginVersion = plugin.version;

			// Guardar comando en colección de plugins
			const commandKey = `${plugin.name}:${command.name}`;
			this.pluginCommands.set(commandKey, command);
			this.client.pluginCommands.set(commandKey, command);

			// Verificar si ya existe un comando con el mismo nombre
			const existingCommand = this.client.slashCommands.get(command.name);
			if (existingCommand) {
				if (existingCommand.plugin) {
					console.warn(
						`» | Comando '${command.name}' ya existe en plugin '${existingCommand.plugin}', sobrescribiendo...`
							.yellow,
					);
				} else {
					console.warn(
						`» | Comando '${command.name}' ya existe como comando normal, sobrescribiendo...`
							.yellow,
					);
				}
			}

			// Agregar a la colección principal
			this.client.slashCommands.set(command.name, command);
			console.log(
				`» | Comando de plugin cargado: ${command.name} (${plugin.name})`.green,
			);
		}
	}

	/**
	 * Carga los eventos de un plugin
	 */
	async loadPluginEvents(plugin, pluginPath) {
		const eventsPath = join(pluginPath, "events");

		if (!existsSync(eventsPath)) return;

		const eventFiles = readdirSync(eventsPath).filter((file) =>
			file.endsWith(".js"),
		);

		for (const file of eventFiles) {
			const eventPath = join(eventsPath, file);
			delete require.cache[require.resolve(eventPath)];

			const event = require(eventPath);

			if (!event.name || !event.execute) {
				console.warn(
					`» | Evento '${file}' del plugin '${plugin.name}' no válido`.yellow,
				);
				continue;
			}

			// Agregar metadatos del plugin al evento
			event.plugin = plugin.name;
			event.pluginVersion = plugin.version;

			// Registrar evento
			const eventKey = `${plugin.name}:${event.name}`;
			this.pluginEvents.set(eventKey, event);

			// Crear listener del evento
			const listener = (...args) => event.execute(...args, this.client);

			if (event.once) {
				this.client.once(event.name, listener);
			} else {
				this.client.on(event.name, listener);
			}
			//evemto con emoiji
			console.log(
				`» | Evento de plugin cargado: ${event.name} (${plugin.name})`.green,
			);
		}
	}

	/**
	 * Descarga un plugin
	 */
	async unloadPlugin(pluginName) {
		const plugin = this.plugins.get(pluginName);

		if (!plugin) {
			throw new Error(`Plugin '${pluginName}' no encontrado`);
		}

		// Ejecutar cleanup del plugin
		if (typeof plugin.onUnload === "function") {
			await plugin.onUnload();
		}

		// Remover comandos del plugin
		const commandsToRemove = Array.from(this.pluginCommands.keys()).filter(
			(key) => key.startsWith(`${pluginName}:`),
		);

		for (const commandKey of commandsToRemove) {
			const command = this.pluginCommands.get(commandKey);
			this.pluginCommands.delete(commandKey);
			this.client.pluginCommands.delete(commandKey);

			// Remover de la colección principal si era del plugin
			if (
				command &&
				this.client.slashCommands.get(command.name)?.plugin === pluginName
			) {
				this.client.slashCommands.delete(command.name);
			}
		}

		// Remover eventos del plugin (nota: no podemos remover listeners fácilmente)
		const eventsToRemove = Array.from(this.pluginEvents.keys()).filter((key) =>
			key.startsWith(`${pluginName}:`),
		);

		for (const eventKey of eventsToRemove) {
			this.pluginEvents.delete(eventKey);
		}

		// Remover plugin
		this.plugins.delete(pluginName);
		this.client.plugins.delete(pluginName);

		// Limpiar cache
		const pluginPath = join(this.pluginsPath, pluginName);
		for (const key of Object.keys(require.cache)) {
			if (key.startsWith(pluginPath)) {
				delete require.cache[key];
			}
		}

		console.log(`» | Plugin '${pluginName}' descargado`.yellow);
	}

	/**
	 * Recarga un plugin
	 */
	async reloadPlugin(pluginName) {
		await this.unloadPlugin(pluginName);
		await this.loadPlugin(pluginName);
	}

	/**
	 * Habilita un plugin para un servidor
	 */
	async enablePlugin(guildId, pluginName) {
		if (!this.plugins.has(pluginName)) {
			throw new Error(`Plugin '${pluginName}' no está cargado`);
		}

		if (this.isMongoAvailable()) {
			try {
				await PluginConfig.findOneAndUpdate(
					{ guildId, pluginName },
					{ enabled: true, updatedAt: new Date() },
					{ upsert: true, new: true },
				);
			} catch (error) {
				console.warn(
					`» | Error al actualizar MongoDB para plugin ${pluginName}: ${error.message}`
						.yellow,
				);
				// Usar cache como fallback
				const key = `${guildId}:${pluginName}`;
				const config = this.configCache.get(key) || {};
				config.enabled = true;
				this.configCache.set(key, config);
			}
		} else {
			// Usar cache en memoria
			const key = `${guildId}:${pluginName}`;
			const config = this.configCache.get(key) || {};
			config.enabled = true;
			this.configCache.set(key, config);
		}

		return true;
	}

	/**
	 * Deshabilita un plugin para un servidor
	 */
	async disablePlugin(guildId, pluginName) {
		if (this.isMongoAvailable()) {
			try {
				await PluginConfig.findOneAndUpdate(
					{ guildId, pluginName },
					{ enabled: false, updatedAt: new Date() },
					{ upsert: true, new: true },
				);
			} catch (error) {
				console.warn(
					`» | Error al actualizar MongoDB para plugin ${pluginName}: ${error.message}`
						.yellow,
				);
				// Usar cache como fallback
				const key = `${guildId}:${pluginName}`;
				const config = this.configCache.get(key) || {};
				config.enabled = false;
				this.configCache.set(key, config);
			}
		} else {
			// Usar cache en memoria
			const key = `${guildId}:${pluginName}`;
			const config = this.configCache.get(key) || {};
			config.enabled = false;
			this.configCache.set(key, config);
		}

		return true;
	}

	/**
	 * Verifica si un plugin está habilitado para un servidor
	 */
	async isPluginEnabled(guildId, pluginName) {
		if (this.isMongoAvailable()) {
			const config = await PluginConfig.findOne({ guildId, pluginName });
			return config ? config.enabled : true; // Por defecto habilitado
		}
		// Usar cache en memoria
		const key = `${guildId}:${pluginName}`;
		const config = this.configCache.get(key);
		return config ? config.enabled : true; // Por defecto habilitado
	}

	/**
	 * Obtiene la configuración de un plugin para un servidor
	 */
	async getPluginConfig(guildId, pluginName) {
		if (this.isMongoAvailable()) {
			const config = await PluginConfig.findOne({ guildId, pluginName });
			return config ? config.config : {};
		}
		// Usar cache en memoria
		const key = `${guildId}:${pluginName}`;
		const config = this.configCache.get(key);
		return config ? config.config || {} : {};
	}

	/**
	 * Actualiza la configuración de un plugin para un servidor
	 */
	async updatePluginConfig(guildId, pluginName, newConfig) {
		if (this.isMongoAvailable()) {
			try {
				await PluginConfig.findOneAndUpdate(
					{ guildId, pluginName },
					{
						config: newConfig,
						updatedAt: new Date(),
					},
					{ upsert: true, new: true },
				);
			} catch (error) {
				console.warn(
					`» | Error al actualizar MongoDB para plugin ${pluginName}: ${error.message}`
						.yellow,
				);
				// Usar cache como fallback
				const key = `${guildId}:${pluginName}`;
				const config = this.configCache.get(key) || {};
				config.config = newConfig;
				this.configCache.set(key, config);
			}
		} else {
			// Usar cache en memoria
			const key = `${guildId}:${pluginName}`;
			const config = this.configCache.get(key) || {};
			config.config = newConfig;
			this.configCache.set(key, config);
		}

		return true;
	}

	/**
	 * Registra todos los comandos (normales + plugins) en Discord
	 */
	async refreshDiscordCommands() {
		try {
			// Combinar comandos normales y de plugins
			const allCommands = Array.from(this.client.slashCommands.values());

			// Crear array de comandos para Discord
			const commandsData = allCommands.map((cmd) => ({
				name: cmd.name,
				description: cmd.description,
				options: cmd.options || [],
				default_member_permissions: cmd.default_member_permissions
					? cmd.default_member_permissions.toString()
					: null,
				dm_permission:
					cmd.dm_permission !== undefined ? cmd.dm_permission : true,
				nsfw: cmd.nsfw || false,
			}));

			// Registrar en Discord
			await this.client.application.commands.set(commandsData);

			console.log(
				`» | ${commandsData.length} comandos registrados en Discord`.green,
			);
		} catch (error) {
			console.error(
				`» | Error al registrar comandos en Discord: ${error.message}`.red,
			);
		}
	}

	/**
	 * Lista todos los plugins
	 */
	listPlugins() {
		return Array.from(this.plugins.values()).map((plugin) => ({
			name: plugin.name,
			version: plugin.version,
			description: plugin.description,
			author: plugin.author || "Desconocido",
			loaded: true,
		}));
	}

	/**
	 * Obtiene información de un plugin específico
	 */
	getPluginInfo(pluginName) {
		const plugin = this.plugins.get(pluginName);
		if (!plugin) return null;

		return {
			name: plugin.name,
			version: plugin.version,
			description: plugin.description,
			author: plugin.author || "Desconocido",
			loaded: true,
			commands: Array.from(this.pluginCommands.keys())
				.filter((key) => key.startsWith(`${pluginName}:`))
				.map((key) => this.pluginCommands.get(key).name),
			events: Array.from(this.pluginEvents.keys())
				.filter((key) => key.startsWith(`${pluginName}:`))
				.map((key) => this.pluginEvents.get(key).name),
		};
	}
}

module.exports = PluginManager;
