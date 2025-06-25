const { model, Schema } = require("mongoose");

const invitationDataSchema = new Schema({
	guildId: {
		type: String,
		required: true,
	},
	userId: {
		type: String,
		required: true,
	},
	invitedBy: {
		type: String,
		default: null,
	},
	inviteCode: {
		type: String,
		default: null,
	},
	joinedAt: {
		type: Date,
		default: Date.now,
	},
	fake: {
		type: Boolean,
		default: false,
	},
	left: {
		type: Boolean,
		default: false,
	},
	leftAt: {
		type: Date,
		default: null,
	},
});

// Índice compuesto para optimizar consultas
invitationDataSchema.index({ guildId: 1, userId: 1 });

module.exports = model("InvitationData", invitationDataSchema);
