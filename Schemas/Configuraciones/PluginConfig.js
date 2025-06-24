const { Schema, model } = require("mongoose");

const PluginConfigSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	pluginName: {
		type: String,
		required: true,
	},
	enabled: {
		type: Boolean,
		default: true,
	},
	config: {
		type: Object,
		default: {},
	},
	installedAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

// Índice compuesto para evitar duplicados
PluginConfigSchema.index({ guildId: 1, pluginName: 1 }, { unique: true });

module.exports = model("PluginConfig", PluginConfigSchema);
