const { Schema, model } = require("mongoose");

const ReactionRoleSchema = new Schema({
  guildId: { type: String, required: true },
  messageId: { type: String, required: true },
  channelId: { type: String, required: true },
  roles: [
    {
      roleId: { type: String, required: true },
      emoji: { type: String, required: true },
      category: { type: String },
      unique: { type: Boolean, default: false },
      limit: { type: Number },
      requirements: { type: Object },
    },
  ],
});

module.exports = model("ReactionRole", ReactionRoleSchema);
