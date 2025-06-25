const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const InviteStats = require("../schemas/InviteStats");

module.exports = {
	name: "invite-add",
	description: "Añade invitaciones bonus a un usuario",
	defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
	options: [
		{
			name: "usuario",
			description: "Usuario al que añadir invitaciones",
			type: 6,
			required: true,
		},
		{
			name: "cantidad",
			description: "Cantidad de invitaciones a añadir",
			type: 4,
			minValue: 1,
			maxValue: 1000,
			required: true,
		},
		{
			name: "razon",
			description: "Razón para añadir las invitaciones",
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

			// Buscar o crear estadísticas del usuario
			let stats = await InviteStats.findOne({ guildId, userId: targetUser.id });

			if (!stats) {
				stats = new InviteStats({
					guildId,
					userId: targetUser.id,
					bonusInvites: amount,
				});
			} else {
				stats.bonusInvites += amount;
			}

			await stats.save();

			const embed = new EmbedBuilder()
				.setColor("#51cf66")
				.setTitle("✅ Invitaciones Añadidas")
				.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
				.addFields([
					{
						name: "👤 Usuario",
						value: `${targetUser.tag}`,
						inline: true,
					},
					{
						name: "⭐ Invitaciones añadidas",
						value: `${amount}`,
						inline: true,
					},
					{
						name: "🏆 Total de bonus",
						value: `${stats.bonusInvites}`,
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
					text: `Añadido por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando invite-add:", error);
			await interaction.reply({
				content: "❌ Ocurrió un error al añadir las invitaciones.",
				ephemeral: true,
			});
		}
	},
};
