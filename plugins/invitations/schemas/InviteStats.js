const { model, Schema } = require("mongoose");

const inviteStatsSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	userId: {
		type: String,
		required: true,
	},
	totalInvites: {
		type: Number,
		default: 0,
	},
	validInvites: {
		type: Number,
		default: 0,
	},
	fakeInvites: {
		type: Number,
		default: 0,
	},
	leftInvites: {
		type: Number,
		default: 0,
	},
	bonusInvites: {
		type: Number,
		default: 0,
	},
});

// Índice compuesto para optimizar consultas
inviteStatsSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model("InviteStats", inviteStatsSchema);
