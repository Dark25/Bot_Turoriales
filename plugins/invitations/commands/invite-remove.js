const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const InviteStats = require("../schemas/InviteStats");

module.exports = {
	name: "invite-remove",
	description: "Remueve invitaciones bonus de un usuario",
	defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
	options: [
		{
			name: "usuario",
			description: "Usuario al que remover invitaciones",
			type: 6,
			required: true,
		},
		{
			name: "cantidad",
			description: "Cantidad de invitaciones a remover",
			type: 4,
			minValue: 1,
			maxValue: 1000,
			required: true,
		},
		{
			name: "razon",
			description: "Razón para remover las invitaciones",
			type: 3,
			required: false,
		},
	],

	async execute(_, interaction) {
		try {
			const targetUser = interaction.options.getUser("usuario");
			const amount = interaction.options.getInteger("cantidad");
			const reason =
				interaction.options.getString("razon") || "No especificada";
			const guildId = interaction.guild.id;

			// Verificar permisos
			if (
				!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)
			) {
				return await interaction.reply({
					content: "❌ No tienes permisos para usar este comando.",
					ephemeral: true,
				});
			}

			// Buscar estadísticas del usuario
			const stats = await InviteStats.findOne({
				guildId,
				userId: targetUser.id,
			});

			if (!stats) {
				return await interaction.reply({
					content: "❌ Este usuario no tiene estadísticas de invitaciones.",
					ephemeral: true,
				});
			}

			if (stats.bonusInvites < amount) {
				return await interaction.reply({
					content: `❌ Este usuario solo tiene ${stats.bonusInvites} invitaciones bonus. No se pueden remover ${amount}.`,
					ephemeral: true,
				});
			}

			const previousBonus = stats.bonusInvites;
			stats.bonusInvites = Math.max(0, stats.bonusInvites - amount);
			await stats.save();

			const embed = new EmbedBuilder()
				.setColor("#ff6b6b")
				.setTitle("❌ Invitaciones Removidas")
				.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
				.addFields([
					{
						name: "👤 Usuario",
						value: `${targetUser.tag}`,
						inline: true,
					},
					{
						name: "⭐ Invitaciones removidas",
						value: `${amount}`,
						inline: true,
					},
					{
						name: "🏆 Bonus anterior → actual",
						value: `${previousBonus} → ${stats.bonusInvites}`,
						inline: true,
					},
					{
						name: "📝 Razón",
						value: reason,
						inline: false,
					},
				])
				.setTimestamp()
				.setFooter({
					text: `Removido por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando invite-remove:", error);
			await interaction.reply({
				content: "❌ Ocurrió un error al remover las invitaciones.",
				ephemeral: true,
			});
		}
	},
};
