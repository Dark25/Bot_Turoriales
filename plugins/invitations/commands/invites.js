const { EmbedBuilder } = require("discord.js");
const InviteStats = require("../schemas/InviteStats");

module.exports = {
	name: "invites",
	description: "Muestra las estadísticas de invitaciones",
	options: [
		{
			name: "usuario",
			description: "Usuario del que ver las invitaciones",
			type: 6,
			required: false,
		},
	],

	async execute(_, interaction) {
		try {
			const targetUser =
				interaction.options.getUser("usuario") || interaction.user;
			const guildId = interaction.guild.id;

			// Buscar estadísticas del usuario
			let stats = await InviteStats.findOne({ guildId, userId: targetUser.id });

			if (!stats) {
				stats = {
					totalInvites: 0,
					validInvites: 0,
					fakeInvites: 0,
					leftInvites: 0,
					bonusInvites: 0,
				};
			}

			// Calcular invitaciones efectivas
			const effectiveInvites = stats.validInvites + stats.bonusInvites;

			const embed = new EmbedBuilder()
				.setColor("#5865f2")
				.setTitle("📊 Estadísticas de Invitaciones")
				.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
				.setDescription(`Estadísticas de **${targetUser.tag}**`)
				.addFields([
					{
						name: "📨 Total de invitaciones",
						value: `${stats.totalInvites}`,
						inline: true,
					},
					{
						name: "✅ Invitaciones válidas",
						value: `${stats.validInvites}`,
						inline: true,
					},
					{
						name: "⭐ Invitaciones bonus",
						value: `${stats.bonusInvites}`,
						inline: true,
					},
					{
						name: "❌ Invitaciones falsas",
						value: `${stats.fakeInvites}`,
						inline: true,
					},
					{
						name: "👋 Usuarios que se fueron",
						value: `${stats.leftInvites}`,
						inline: true,
					},
					{
						name: "🏆 Invitaciones efectivas",
						value: `${effectiveInvites}`,
						inline: true,
					},
				])
				.setTimestamp()
				.setFooter({
					text: `Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				});

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando invites:", error);
			await interaction.reply({
				content:
					"❌ Ocurrió un error al obtener las estadísticas de invitaciones.",
				ephemeral: true,
			});
		}
	},
};
