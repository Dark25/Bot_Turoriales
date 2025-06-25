const BasePlugin = require("../BasePlugin");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");
const { initializeAllInviteCaches } = require("./utils/inviteCache");

class InvitationsPlugin extends BasePlugin {
	constructor(client) {
		super(client);
		this.name = "Invitations";
		this.version = "1.0.0";
		this.description =
			"Sistema completo de seguimiento de invitaciones con estadísticas detalladas.";
		this.author = "Dark25";
		this.permissions = [
			PermissionFlagsBits.ViewAuditLog,
			PermissionFlagsBits.ManageGuild,
		];

		this.commands = [
			path.join(__dirname, "commands", "invites.js"),
			path.join(__dirname, "commands", "invite-leaderboard.js"),
			path.join(__dirname, "commands", "invite-add.js"),
			path.join(__dirname, "commands", "invite-remove.js"),
			path.join(__dirname, "commands", "invite-reset.js"),
			path.join(__dirname, "commands", "invite-setup.js"),
			path.join(__dirname, "commands", "invite-config.js"),
			path.join(__dirname, "commands", "invite-reset-config.js"),
		];

		this.events = [
			path.join(__dirname, "events", "guildMemberAdd.js"),
			path.join(__dirname, "events", "guildMemberRemove.js"),
			path.join(__dirname, "events", "inviteCreate.js"),
			path.join(__dirname, "events", "inviteDelete.js"),
		];
	}

	async onLoad() {
		try {
			// Inicializar caché de invitaciones para todos los servidores
			await initializeAllInviteCaches(this.client);
		} catch (error) {
			console.error(`❌ Error cargando plugin ${this.name}:`, error.message);
			throw error;
		}
	}

	async onUnload() {
		try {
			console.log(`🔄 Descargando plugin ${this.name}...`);
		} catch (error) {
			console.error(`❌ Error descargando plugin ${this.name}:`, error.message);
		}
	}
}

module.exports = InvitationsPlugin;
