const { Events } = require("discord.js");
const ReactionRole = require("../schemas/ReactionRole");

module.exports = {
  name: Events.MessageReactionRemove,
  /**
   * @param {import('discord.js').MessageReaction} reaction
   * @param {import('discord.js').User} user
   * @param {import('discord.js').Client} client
   */
  async execute(reaction, user, client) {
    if (user.bot) return;
    const { message, emoji } = reaction;
    const data = await ReactionRole.findOne({
      guildId: message.guildId,
      messageId: message.id,
    });
    if (!data) return;
    // Comparación robusta de emojis (soporta estándar, personalizados y animados)
    function emojiCompare(a, b) {
      if (!a || !b) return false;
      const posibles = [];
      if (b.id) {
        posibles.push(b.identifier);
        posibles.push(b.id);
        posibles.push(`<:${b.name}:${b.id}>`);
        posibles.push(`<a:${b.name}:${b.id}>`);
      }
      if (b.name) posibles.push(b.name);
      posibles.push(b.toString());
      return posibles.includes(a);
    }
    const roleData = data.roles.find(r => emojiCompare(r.emoji, emoji));
    if (!roleData) return;
    const member = await message.guild.members.fetch(user.id);
    await member.roles.remove(roleData.roleId).catch(() => {});
  },
};
