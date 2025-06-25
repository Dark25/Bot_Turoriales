const { getInviteCache, setInviteCache } = require("../utils/inviteCache");

module.exports = {
	name: "inviteCreate",
	async execute(invite, _client) {
		try {
			// Actualizar el caché de invitaciones
			const guildInvites = getInviteCache(invite.guild.id);
			guildInvites.set(invite.code, invite.uses || 0);
			setInviteCache(invite.guild.id, guildInvites);
		} catch (error) {
			console.error("Error en inviteCreate del plugin Invitations:", error);
		}
	},
};
