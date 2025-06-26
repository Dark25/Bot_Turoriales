const mongoose = require("mongoose");

const suggestionDataSchema = new mongoose.Schema({
	guildId: {
		type: String,
		required: true,
		index: true,
	},
	suggestionId: {
		type: Number,
		required: true,
	},
	authorId: {
		type: String,
		required: true,
	},
	content: {
		type: String,
		required: true,
		maxlength: 2000,
	},
	category: {
		type: String,
		default: null,
	},
	status: {
		type: String,
		enum: ["pending", "approved", "rejected", "implemented"],
		default: "pending",
	},
	messageId: {
		type: String,
		default: null,
	},
	channelId: {
		type: String,
		default: null,
	},
	upvotes: {
		type: Number,
		default: 0,
	},
	downvotes: {
		type: Number,
		default: 0,
	},
	neutralVotes: {
		type: Number,
		default: 0,
	},
	voters: [
		{
			userId: String,
			vote: {
				type: String,
				enum: ["upvote", "downvote", "neutral"],
			},
		},
	],
	approvedBy: {
		type: String,
		default: null,
	},
	rejectedBy: {
		type: String,
		default: null,
	},
	adminNote: {
		type: String,
		default: null,
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

// Índice compuesto para búsquedas eficientes
suggestionDataSchema.index({ guildId: 1, suggestionId: 1 }, { unique: true });
suggestionDataSchema.index({ guildId: 1, status: 1 });
suggestionDataSchema.index({ guildId: 1, authorId: 1 });

// Middleware para actualizar updatedAt
suggestionDataSchema.pre("save", function (next) {
	this.updatedAt = new Date();
	next();
});

module.exports = mongoose.model("SuggestionData", suggestionDataSchema);
