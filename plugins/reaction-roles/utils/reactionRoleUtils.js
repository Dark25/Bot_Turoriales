// Utilidad para obtener y actualizar configuraciones de roles por reacción
const ReactionRole = require("../schemas/ReactionRole");

async function getReactionRoles(guildId) {
  return ReactionRole.find({ guildId });
}

async function addReactionRole(data) {
  return ReactionRole.create(data);
}

async function removeReactionRole(guildId, messageId, roleId) {
  return ReactionRole.updateOne(
    { guildId, messageId },
    { $pull: { roles: { roleId } } }
  );
}

module.exports = {
  getReactionRoles,
  addReactionRole,
  removeReactionRole,
};
