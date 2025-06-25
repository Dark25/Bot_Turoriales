const { PermissionFlagsBits } = require("discord.js");

// Caché de invitaciones por servidor (compartido entre todos los eventos)
const inviteCache = new Map();

/**
 * Actualiza el caché de invitaciones de un servidor
 */
async function updateInviteCache(guildId, client) {
	try {
		const guild = client.guilds.cache.get(guildId);
		if (
			!guild ||
			!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)
		)
			return;

		const invites = await guild.invites.fetch();
		inviteCache.set(
			guildId,
			new Map(invites.map((invite) => [invite.code, invite.uses])),
		);
	} catch (error) {
		console.error("Error actualizando caché de invitaciones:", error);
	}
}

/**
 * Encuentra qué invitación fue usada comparando el caché
 */
async function findUsedInvite(guild, _client) {
	try {
		if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return null;
		}

		const currentInvites = await guild.invites.fetch();
		const cachedInvites = inviteCache.get(guild.id) || new Map();

		// Encontrar la invitación que aumentó en usos
		for (const [code, currentUses] of currentInvites.map((invite) => [
			invite.code,
			invite.uses,
		])) {
			const cachedUses = cachedInvites.get(code) || 0;
			if (currentUses > cachedUses) {
				const usedInvite = currentInvites.find(
					(invite) => invite.code === code,
				);
				return usedInvite;
			}
		}

		return null;
	} catch (error) {
		console.error("Error encontrando invitación usada:", error);
		return null;
	}
}

/**
 * Inicializa el caché de invitaciones para un servidor
 */
async function initializeInviteCache(guild) {
	try {
		if (guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
			const invites = await guild.invites.fetch();
			const inviteMap = new Map(
				invites.map((invite) => [invite.code, invite.uses]),
			);
			inviteCache.set(guild.id, inviteMap);
		} else {
			console.log(
				`[Invitations] Sin permisos para inicializar caché en ${guild.name}`,
			);
		}
	} catch (error) {
		console.error(
			`Error inicializando caché de invitaciones para ${guild.name}:`,
			error,
		);
	}
}

/**
 * Obtiene el caché de invitaciones de un servidor
 */
function getInviteCache(guildId) {
	return inviteCache.get(guildId) || new Map();
}

/**
 * Establece el caché de invitaciones para un servidor
 */
function setInviteCache(guildId, cache) {
	inviteCache.set(guildId, cache);
}

/**
 * Inicializa el caché para todos los servidores
 */
async function initializeAllInviteCaches(client) {
	for (const guild of client.guilds.cache.values()) {
		await initializeInviteCache(guild);
	}
}

module.exports = {
	updateInviteCache,
	findUsedInvite,
	initializeInviteCache,
	getInviteCache,
	setInviteCache,
	initializeAllInviteCaches,
};
