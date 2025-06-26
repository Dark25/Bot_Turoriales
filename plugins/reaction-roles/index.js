const BasePlugin = require("../BasePlugin");
const path = require("node:path");
const { PermissionFlagsBits } = require("discord.js");

class ReactionRolesPlugin extends BasePlugin {
  constructor(client) {
	super(client);
	this.name = "ReactionRoles";
	this.version = "1.0.0";
	this.description = "Asignación de roles mediante reacciones, con soporte para múltiples mensajes, emojis personalizados, categorías y límites.";
	this.author = "Dark25";
	this.permissions = [
	  PermissionFlagsBits.ManageRoles,
	  PermissionFlagsBits.ManageMessages,
	];

	this.commands = [
	  path.join(__dirname, "commands", "reactionroles-setup.js"),
	  path.join(__dirname, "commands", "reactionroles-list.js"),
	  path.join(__dirname, "commands", "reactionroles-remove.js"),
	];

	this.events = [
	  path.join(__dirname, "events", "messageReactionAdd.js"),
	  path.join(__dirname, "events", "messageReactionRemove.js"),
	];
  }

  async onLoad() {
	// Listener local para autocompletado SOLO para comandos de este plugin
	this._autocompleteHandler = async (interaction) => {
	  if (!interaction.isAutocomplete()) return;
	  const commandName = interaction.commandName;
	  const commands = ["reactionroles-list", "reactionroles-remove"];
	  if (!commands.includes(commandName)) return;
	  // Cargar comando
	  let cmd;
	  try {
		cmd = require(path.join(__dirname, "commands", `${commandName}.js`));
	  } catch (e) { return; }
	  if (typeof cmd.autocomplete === "function") {
		await cmd.autocomplete(interaction);
	  }
	};
	this.client.on("interactionCreate", this._autocompleteHandler);

	// Al cargar el plugin, asegurar que todos los mensajes configurados tengan las reacciones necesarias
	const { getReactionRoles } = require("./utils/reactionRoleUtils");
	const allGuilds = this.client.guilds.cache;
	for (const [guildId, guild] of allGuilds) {
	  try {
		const configs = await getReactionRoles(guildId);
		for (const config of configs) {
		  const channel = guild.channels.cache.get(config.channelId);
		  if (!channel) continue;
		  let msg;
		  try {
			msg = await channel.messages.fetch(config.messageId);
		  } catch (e) { continue; }
		  for (const roleConfig of config.roles) {
			const emoji = roleConfig.emoji;
			const alreadyReacted = msg.reactions.cache.has(emoji) || msg.reactions.cache.some(r => r.emoji.name === emoji || r.emoji.toString() === emoji);
			if (!alreadyReacted) {
			  try { await msg.react(emoji); } catch (e) {}
			}
		  }
		}
	  } catch (e) { continue; }
	}
  }

  async onUnload() {
	// Limpieza del listener local
	if (this._autocompleteHandler) {
	  this.client.off("interactionCreate", this._autocompleteHandler);
	}
  }
}

module.exports = ReactionRolesPlugin;
