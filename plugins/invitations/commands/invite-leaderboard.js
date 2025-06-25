const { EmbedBuilder } = require("discord.js");
const InviteStats = require("../schemas/InviteStats");

module.exports = {
	name: "invite-leaderboard",
	description: "Muestra el ranking de usuarios con más invitaciones",
	options: [
		{
			name: "limite",
			description: "Número de usuarios a mostrar (máximo 20)",
			type: 4,
			minValue: 1,
			maxValue: 20,
			required: false,
		},
	],

	async execute(_, interaction) {
		try {
			const limit = interaction.options.getInteger("limite") || 10;
			const guildId = interaction.guild.id;

			// Buscar los usuarios con más invitaciones
			const topInvites = await InviteStats.find({ guildId })
				.sort({ validInvites: -1, bonusInvites: -1 })
				.limit(limit);

			if (topInvites.length === 0) {
				return await interaction.reply({
					content: "❌ No hay estadísticas de invitaciones en este servidor.",
					ephemeral: true,
				});
			}

			const embed = new EmbedBuilder()
				.setColor("#ffd43b")
				.setTitle("🏆 Ranking de Invitaciones")
				.setDescription(`Top ${limit} usuarios con más invitaciones`)
				.setTimestamp()
				.setFooter({
					text: `${interaction.guild.name} • ${topInvites.length} usuarios`,
					iconURL: interaction.guild.iconURL({ dynamic: true }),
				});

			let description = "";
			const medals = ["🥇", "🥈", "🥉"];

			for (let i = 0; i < topInvites.length; i++) {
				const stats = topInvites[i];
				const effectiveInvites = stats.validInvites + stats.bonusInvites;

				try {
					const user = await interaction.client.users.fetch(stats.userId);
					const medal = medals[i] || `**${i + 1}.**`;

					description += `${medal} **${user.tag}**\n`;
					description += `   ✅ ${stats.validInvites} válidas`;
					if (stats.bonusInvites > 0) {
						description += ` + ⭐ ${stats.bonusInvites} bonus`;
					}
					description += ` = 🏆 ${effectiveInvites} total\n`;
					if (stats.fakeInvites > 0 || stats.leftInvites > 0) {
						description += `   ❌ ${stats.fakeInvites} falsas • 👋 ${stats.leftInvites} se fueron\n`;
					}
					description += "\n";
				} catch (_error) {}
			}

			if (description.length > 4096) {
				description = `${description.substring(0, 4093)}...`;
			}

			embed.setDescription(description);

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando invite-leaderboard:", error);
			await interaction.reply({
				content: "❌ Ocurrió un error al obtener el ranking de invitaciones.",
				ephemeral: true,
			});
		}
	},
};
