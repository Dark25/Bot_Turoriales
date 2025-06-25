const { getInviteCache, setInviteCache } = require("../utils/inviteCache");

module.exports = {
	name: "inviteDelete",
	async execute(invite, _client) {
		try {
			// Remover del caché de invitaciones
			const guildInvites = getInviteCache(invite.guild.id);
			if (guildInvites.size > 0) {
				guildInvites.delete(invite.code);
				setInviteCache(invite.guild.id, guildInvites);
			}
		} catch (error) {
			console.error("Error en inviteDelete del plugin Invitations:", error);
		}
	},
};
