const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");

const data = new SlashCommandBuilder()
	.setName("server-stats")
	.setDescription("Muestra estadísticas detalladas y gráficos del servidor.");

module.exports = {
	name: data.name,
	description: data.description,
	data,
	async execute(_client, interaction, _args) {
		if (!interaction || !interaction.guild) {
			return interaction?.reply?.({
				content: "❌ Este comando solo puede usarse en un servidor.",
				ephemeral: true,
			});
		}

		try {
			await interaction.deferReply();

			const guild = interaction.guild;

			// Obtener estadísticas detalladas
			const allMembers = guild.members.cache;
			const totalMembers = guild.memberCount;

			// Estadísticas de miembros
			const humanMembers = allMembers.filter((m) => !m.user.bot);
			const botMembers = allMembers.filter((m) => m.user.bot);

			// Estadísticas de estado
			const onlineMembers = allMembers.filter(
				(m) => m.presence?.status === "online",
			);
			const idleMembers = allMembers.filter(
				(m) => m.presence?.status === "idle",
			);
			const dndMembers = allMembers.filter((m) => m.presence?.status === "dnd");
			const offlineMembers = allMembers.filter(
				(m) => !m.presence || m.presence.status === "offline",
			);

			// Estadísticas de canales
			const allChannels = guild.channels.cache;
			const textChannels = allChannels.filter((c) => c.type === 0);
			const voiceChannels = allChannels.filter((c) => c.type === 2);
			const categoryChannels = allChannels.filter((c) => c.type === 4);
			const stageChannels = allChannels.filter((c) => c.type === 13);
			const forumChannels = allChannels.filter((c) => c.type === 15);

			// Estadísticas de roles
			const allRoles = guild.roles.cache;
			const managedRoles = allRoles.filter((r) => r.managed);
			const hoistedRoles = allRoles.filter((r) => r.hoist);
			const mentionableRoles = allRoles.filter((r) => r.mentionable);

			// Calcular miembros nuevos (última semana)
			const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
			const newMembers = allMembers.filter(
				(m) => m.joinedTimestamp && m.joinedTimestamp > oneWeekAgo,
			);

			// Calcular miembros recientes (último mes)
			const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
			const recentMembers = allMembers.filter(
				(m) => m.joinedTimestamp && m.joinedTimestamp > oneMonthAgo,
			);

			// Estadísticas de boost
			const boostLevel = guild.premiumTier;
			const boostCount = guild.premiumSubscriptionCount || 0;
			const boostersCount = guild.members.cache.filter(
				(m) => m.premiumSince,
			).size;

			// Top 5 roles más populares (excluyendo @everyone)
			const roleStats = allRoles
				.filter((role) => role.name !== "@everyone")
				.map((role) => ({
					name: role.name,
					memberCount: allMembers.filter((m) => m.roles.cache.has(role.id))
						.size,
					color: role.hexColor,
				}))
				.sort((a, b) => b.memberCount - a.memberCount)
				.slice(0, 5);

			// Crear barra de progreso visual para estados
			const createProgressBar = (current, total, length = 10) => {
				const percentage = Math.round((current / total) * 100);
				const filled = Math.round((percentage / 100) * length);
				const empty = length - filled;
				return `${"█".repeat(filled)}${"░".repeat(empty)} ${percentage}%`;
			};

			const embed = new EmbedBuilder()
				.setColor("#5865F2")
				.setTitle(`📊 Estadísticas Detalladas de ${guild.name}`)
				.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
				.setDescription("*Análisis completo del servidor*")
				.addFields(
					{
						name: "👥 Análisis de Miembros",
						value: [
							`**Total:** ${totalMembers.toLocaleString()} miembros`,
							`**Humanos:** ${humanMembers.size.toLocaleString()} (${Math.round((humanMembers.size / totalMembers) * 100)}%)`,
							`**Bots:** ${botMembers.size.toLocaleString()} (${Math.round((botMembers.size / totalMembers) * 100)}%)`,
							`**Nuevos (7 días):** ${newMembers.size.toLocaleString()}`,
							`**Recientes (30 días):** ${recentMembers.size.toLocaleString()}`,
						].join("\n"),
						inline: false,
					},
					{
						name: "🟢 Estados de Presencia",
						value: [
							`🟢 **En línea:** ${onlineMembers.size.toLocaleString()}`,
							`${createProgressBar(onlineMembers.size, allMembers.size)}`,
							`🟡 **Ausente:** ${idleMembers.size.toLocaleString()}`,
							`${createProgressBar(idleMembers.size, allMembers.size)}`,
							`🔴 **No molestar:** ${dndMembers.size.toLocaleString()}`,
							`${createProgressBar(dndMembers.size, allMembers.size)}`,
							`⚫ **Desconectado:** ${offlineMembers.size.toLocaleString()}`,
							`${createProgressBar(offlineMembers.size, allMembers.size)}`,
						].join("\n"),
						inline: false,
					},
					{
						name: "📋 Estadísticas de Canales",
						value: [
							`**Total:** ${allChannels.size} canales`,
							`💬 **Texto:** ${textChannels.size}`,
							`🔊 **Voz:** ${voiceChannels.size}`,
							`📁 **Categorías:** ${categoryChannels.size}`,
							`🎭 **Escenarios:** ${stageChannels.size}`,
							`💭 **Foros:** ${forumChannels.size}`,
						].join("\n"),
						inline: true,
					},
					{
						name: "🎭 Estadísticas de Roles",
						value: [
							`**Total:** ${allRoles.size} roles`,
							`🤖 **Administrados:** ${managedRoles.size}`,
							`⬆️ **Hoisted:** ${hoistedRoles.size}`,
							`📢 **Mencionables:** ${mentionableRoles.size}`,
						].join("\n"),
						inline: true,
					},
					{
						name: "💎 Estadísticas de Boost",
						value: [
							`**Nivel:** ${boostLevel}/3`,
							`**Boosts:** ${boostCount}`,
							`**Boosters:** ${boostersCount}`,
							`**Progreso:** ${createProgressBar(boostCount, [2, 7, 14][boostLevel] || 14)}`,
						].join("\n"),
						inline: true,
					},
				);

			// Agregar top roles si hay datos
			if (roleStats.length > 0) {
				const topRolesText = roleStats
					.map(
						(role, index) =>
							`**${index + 1}.** ${role.name} - ${role.memberCount.toLocaleString()} miembros`,
					)
					.join("\n");

				embed.addFields({
					name: "🏆 Top 5 Roles Más Populares",
					value: topRolesText,
					inline: false,
				});
			}

			// Estadísticas adicionales de actividad
			let activityStats = "";
			try {
				// Calcular ratio de actividad (miembros con presencia vs total)
				const activeMembers = allMembers.filter((m) => m.presence).size;
				const activityRatio = Math.round(
					(activeMembers / allMembers.size) * 100,
				);

				activityStats = [
					`**Ratio de Actividad:** ${activityRatio}%`,
					`**Crecimiento Semanal:** +${newMembers.size} miembros`,
					`**Densidad de Roles:** ${Math.round((allRoles.size / totalMembers) * 1000) / 1000} roles/miembro`,
				].join("\n");

				embed.addFields({
					name: "📈 Métricas de Actividad",
					value: activityStats,
					inline: false,
				});
			} catch (error) {
				// Si hay error calculando métricas, continuar sin ellas
				console.log("Error calculando métricas de actividad:", error);
			}

			// Información de antigüedad del servidor
			const serverAge = Math.floor(
				(Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24),
			);
			const avgMembersPerDay =
				Math.round((totalMembers / serverAge) * 100) / 100;

			embed.addFields({
				name: "⏰ Datos Temporales",
				value: [
					`**Edad del servidor:** ${serverAge.toLocaleString()} días`,
					`**Promedio miembros/día:** ${avgMembersPerDay}`,
					`**Último boost:** ${guild.premiumSubscriptionCount > 0 ? "Activo" : "Sin boosts"}`,
				].join("\n"),
				inline: false,
			});

			embed
				.setFooter({
					text: `Estadísticas generadas • Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})
				.setTimestamp();

			// Crear botón para actualizar estadísticas con timestamp
			const timestamp = Date.now();
			const refreshButton = new ButtonBuilder()
				.setCustomId(`stats_refresh_${interaction.user.id}_${timestamp}`)
				.setLabel("🔄 Actualizar Estadísticas")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(false);

			const row = new ActionRowBuilder().addComponents(refreshButton);

			await interaction.editReply({
				embeds: [embed],
				components: [row],
			});
		} catch (error) {
			console.error("Error en comando server-stats:", error);
			const errorMsg = interaction.deferred
				? {
						content:
							"❌ Ocurrió un error al generar las estadísticas del servidor.",
					}
				: {
						content:
							"❌ Ocurrió un error al generar las estadísticas del servidor.",
						ephemeral: true,
					};

			if (interaction.deferred) {
				await interaction.editReply(errorMsg);
			} else {
				await interaction.reply(errorMsg);
			}
		}
	},
};
