const mongoose = require("mongoose");

const suggestionConfigSchema = new mongoose.Schema({
	guildId: {
		type: String,
		required: true,
		unique: true,
	},
	suggestionsChannel: {
		type: String,
		required: true,
	},
	approvalChannel: {
		type: String,
		default: null,
	},
	rejectedChannel: {
		type: String,
		default: null,
	},
	enabledSuggestions: {
		type: Boolean,
		default: true,
	},
	requiredRole: {
		type: String,
		default: null,
	},
	approverRole: {
		type: String,
		default: null,
	},
	autoApprovalVotes: {
		type: Number,
		default: 10,
		min: 1,
	},
	autoRejectionVotes: {
		type: Number,
		default: 5,
		min: 1,
	},
	enableCategories: {
		type: Boolean,
		default: false,
	},
	allowedCategories: {
		type: Map,
		of: {
			name: String,
			description: String,
			emoji: String,
		},
		default: new Map([
			[
				"general",
				{ name: "General", description: "Sugerencias generales", emoji: "💭" },
			],
			[
				"features",
				{
					name: "Características",
					description: "Nuevas características",
					emoji: "✨",
				},
			],
			[
				"bugs",
				{ name: "Errores", description: "Reportes de errores", emoji: "🐛" },
			],
			[
				"improvements",
				{
					name: "Mejoras",
					description: "Mejoras a funciones existentes",
					emoji: "📈",
				},
			],
		]),
	},
	dmNotifications: {
		type: Boolean,
		default: true,
	},
	allowAnonymous: {
		type: Boolean,
		default: false,
	},
	cooldownTime: {
		type: Number,
		default: 300, // 5 minutos en segundos
		min: 0,
	},
	maxSuggestionsPerUser: {
		type: Number,
		default: 3, // Máximo de sugerencias pendientes por usuario
		min: 1,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

// Middleware para actualizar updatedAt
suggestionConfigSchema.pre("save", function (next) {
	this.updatedAt = new Date();
	next();
});

module.exports = mongoose.model("SuggestionConfig", suggestionConfigSchema);
