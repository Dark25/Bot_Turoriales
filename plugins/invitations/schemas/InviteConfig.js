const { model, Schema } = require("mongoose");

const inviteConfigSchema = new Schema({
	guildId: {
		type: String,
		required: true,
		unique: true,
	},
	channelId: {
		type: String,
		default: null,
	},
	antiFake: {
		type: Boolean,
		default: true,
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

module.exports = model("InviteConfig", inviteConfigSchema);
