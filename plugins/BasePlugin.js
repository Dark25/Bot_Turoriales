/**
 * Clase base para todos los plugins
 * Todos los plugins deben extender esta clase
 */
class BasePlugin {
	constructor(client) {
		this.client = client;

		// Propiedades requeridas (deben ser sobrescritas)
		this.name = null;
		this.version = null;
		this.description = null;
		this.author = null;

		// Propiedades opcionales
		this.dependencies = []; // Otros plugins requeridos
		this.permissions = []; // Permisos requeridos
		this.configSchema = {}; // Esquema de configuración
	}

	/**
	 * Se ejecuta cuando el plugin es cargado
	 * Sobrescribir en plugins específicos
	 */
	async onLoad() {
		// Implementación por defecto vacía
	}

	/**
	 * Se ejecuta cuando el plugin es descargado
	 * Sobrescribir en plugins específicos
	 */
	async onUnload() {
		// Implementación por defecto vacía
	}

	/**
	 * Obtiene la configuración del plugin para un servidor
	 */
	async getConfig(guildId) {
		const pluginManager = this.client.pluginManager;
		if (!pluginManager) return {};

		return await pluginManager.getPluginConfig(guildId, this.name);
	}

	/**
	 * Actualiza la configuración del plugin para un servidor
	 */
	async updateConfig(guildId, config) {
		const pluginManager = this.client.pluginManager;
		if (!pluginManager) return false;

		return await pluginManager.updatePluginConfig(guildId, this.name, config);
	}

	/**
	 * Verifica si el plugin está habilitado en un servidor
	 */
	async isEnabled(guildId) {
		const pluginManager = this.client.pluginManager;
		if (!pluginManager) return true;

		return await pluginManager.isPluginEnabled(guildId, this.name);
	}

	/**
	 * Registra un comando de slash personalizado
	 */
	registerSlashCommand(command) {
		if (!command.name || !command.execute) {
			throw new Error("El comando debe tener 'name' y 'execute'");
		}

		command.plugin = this.name;
		command.pluginVersion = this.version;

		this.client.slashCommands.set(command.name, command);
	}

	/**
	 * Registra un evento personalizado
	 */
	registerEvent(event) {
		if (!event.name || !event.execute) {
			throw new Error("El evento debe tener 'name' y 'execute'");
		}

		event.plugin = this.name;
		event.pluginVersion = this.version;

		const listener = (...args) => event.execute(...args, this.client);

		if (event.once) {
			this.client.once(event.name, listener);
		} else {
			this.client.on(event.name, listener);
		}
	}

	/**
	 * Utilidad para logging del plugin
	 */
	log(message, type = "info") {
		const _colors = require("colors");
		const prefix = `[${this.name}]`;

		switch (type) {
			case "info":
				console.log(`${prefix} ${message}`.blue);
				break;
			case "warn":
				console.log(`${prefix} ${message}`.yellow);
				break;
			case "error":
				console.log(`${prefix} ${message}`.red);
				break;
			case "success":
				console.log(`${prefix} ${message}`.green);
				break;
			default:
				console.log(`${prefix} ${message}`);
		}
	}

	/**
	 * Valida la configuración contra el schema
	 */
	validateConfig(config) {
		// Implementación básica de validación
		// Los plugins pueden sobrescribir esto para validación más compleja
		if (Object.keys(this.configSchema).length === 0) return true;

		for (const [key, schema] of Object.entries(this.configSchema)) {
			if (schema.required && !(key in config)) {
				throw new Error(
					`Campo requerido '${key}' faltante en la configuración`,
				);
			}
			if (key in config && schema.type) {
				const value = config[key];
				const expectedType = schema.type;

				// Validación de tipos usando switch para evitar el problema de useValidTypeof
				let isValidType = false;
				switch (expectedType) {
					case "string":
						isValidType = typeof value === "string";
						break;
					case "number":
						isValidType = typeof value === "number";
						break;
					case "boolean":
						isValidType = typeof value === "boolean";
						break;
					case "object":
						isValidType = typeof value === "object";
						break;
					case "function":
						isValidType = typeof value === "function";
						break;
					case "undefined":
						isValidType = typeof value === "undefined";
						break;
					case "symbol":
						isValidType = typeof value === "symbol";
						break;
					case "bigint":
						isValidType = typeof value === "bigint";
						break;
				}

				if (!isValidType) {
					throw new Error(`Campo '${key}' debe ser de tipo ${expectedType}`);
				}
			}
		}

		return true;
	}
}

module.exports = BasePlugin;
