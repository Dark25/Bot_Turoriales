const { Events } = require("discord.js");
const ReactionRole = require("../schemas/ReactionRole");

module.exports = {
  name: Events.MessageReactionAdd,
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
    const emojiCompare = (a, b) => {
      if (!a || !b) return false;
      // Todas las representaciones posibles del emoji de Discord
      const posibles = [];
      if (b.id) {
        // Emoji personalizado (estático o animado)
        posibles.push(b.identifier); // nombre:id o a:nombre:id
        posibles.push(b.id);
        posibles.push(`<:${b.name}:${b.id}>`);
        posibles.push(`<a:${b.name}:${b.id}>`);
      }
      if (b.name) posibles.push(b.name);
      posibles.push(b.toString());
      // Comparar contra todas las variantes
      return posibles.includes(a);
    };
    const roleData = data.roles.find(r => emojiCompare(r.emoji, emoji));
    if (!roleData) return;
    const member = await message.guild.members.fetch(user.id);


    // Si es único, quitar otros roles de la misma categoría
    if (roleData.unique && roleData.category) {
      for (const r of data.roles) {
        if (r.category === roleData.category && r.roleId !== roleData.roleId) {
          await member.roles.remove(r.roleId).catch(() => {});
        }
      }
    }
    // Limite de usuarios por rol
    if (roleData.limit) {
      const count = (await message.guild.members.fetch()).filter(m => m.roles.cache.has(roleData.roleId)).size;
      if (count >= roleData.limit) return;
    }
    await member.roles.add(roleData.roleId).catch(() => {});
  },
};
