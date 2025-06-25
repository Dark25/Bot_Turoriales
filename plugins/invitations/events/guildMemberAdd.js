const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const InvitationData = require("../schemas/InvitationData");
const InviteStats = require("../schemas/InviteStats");
const InviteConfig = require("../schemas/InviteConfig");
const { findUsedInvite, updateInviteCache } = require("../utils/inviteCache");

module.exports = {
	name: "guildMemberAdd",
	async execute(member, client) {
		try {
			const guild = member.guild;

			// Verificar permisos del bot
			if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) {
				return;
			}

			// Pequeño retraso para permitir que la API de Discord se actualice
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Actualizar caché y encontrar la invitación usada
			const usedInvite = await findUsedInvite(guild, client);
			await updateInviteCache(guild.id, client);

			let invitedBy = null;
			let inviteCode = null;
			let isFake = false;

			if (usedInvite?.inviter) {
				invitedBy = usedInvite.inviter.id;
				inviteCode = usedInvite.code;

				// Obtener configuración para verificar anti-fake
				const config = await InviteConfig.findOne({ guildId: guild.id });
				const antiFakeEnabled = config ? config.antiFake : true;

				if (antiFakeEnabled) {
					// Verificar si es una invitación falsa (cuenta muy nueva)
					const accountAge = Date.now() - member.user.createdTimestamp;
					const minAccountAge = 7 * 24 * 60 * 60 * 1000; // 7 días
					isFake = accountAge < minAccountAge;
				}
			} else {
			}

			// Guardar datos de la invitación
			const invitationData = new InvitationData({
				guildId: guild.id,
				userId: member.id,
				invitedBy: invitedBy,
				inviteCode: inviteCode,
				fake: isFake,
			});

			await invitationData.save();

			// Actualizar estadísticas del invitador
			if (invitedBy) {
				await this.updateInviterStats(guild.id, invitedBy, "add", isFake);
			}

			// Enviar mensaje de bienvenida con información de invitación
			await this.sendWelcomeMessage(
				member,
				usedInvite,
				isFake,
				client,
				guild.id,
			);
		} catch (error) {
			console.error("Error en guildMemberAdd del plugin Invitations:", error);
		}
	},

	async updateInviterStats(guildId, userId, action, isFake = false) {
		try {
			let stats = await InviteStats.findOne({ guildId, userId });

			if (!stats) {
				stats = new InviteStats({ guildId, userId });
			}

			if (action === "add") {
				stats.totalInvites += 1;
				if (isFake) {
					stats.fakeInvites += 1;
				} else {
					stats.validInvites += 1;
				}
			} else if (action === "remove") {
				if (isFake) {
					stats.fakeInvites = Math.max(0, stats.fakeInvites - 1);
				} else {
					stats.validInvites = Math.max(0, stats.validInvites - 1);
					stats.leftInvites += 1;
				}
			}

			await stats.save();
		} catch (error) {
			console.error("Error actualizando estadísticas del invitador:", error);
		}
	},

	async sendWelcomeMessage(member, usedInvite, isFake, _client, guildId) {
		try {
			// Obtener configuración del servidor
			const config = await InviteConfig.findOne({ guildId });
			let welcomeChannel = null;

			// Usar el canal configurado si existe
			if (config?.channelId) {
				welcomeChannel = member.guild.channels.cache.get(config.channelId);
			}

			// Si no hay canal configurado o no se encuentra, buscar uno por defecto
			if (!welcomeChannel) {
				const channels = member.guild.channels.cache.filter(
					(c) =>
						c.type === 0 && // Canal de texto
						(c.name.includes("general") ||
							c.name.includes("bienvenida") ||
							c.name.includes("welcome")),
				);
				welcomeChannel = channels.first() || member.guild.systemChannel;
			}

			if (!welcomeChannel) return;

			const embed = new EmbedBuilder()
				.setColor(isFake ? "#ff6b6b" : "#51cf66")
				.setTitle("¡Nuevo miembro!")
				.setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
				.addFields([
					{
						name: "👤 Usuario",
						value: `${member.user.tag} (${member.user.id})`,
						inline: true,
					},
					{
						name: "📅 Cuenta creada",
						value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
						inline: true,
					},
				])
				.setTimestamp()
				.setFooter({ text: `Miembro #${member.guild.memberCount}` });

			if (usedInvite?.inviter) {
				// Obtener estadísticas del invitador
				const stats = await InviteStats.findOne({
					guildId: member.guild.id,
					userId: usedInvite.inviter.id,
				});

				const totalInvites = stats
					? stats.validInvites + stats.bonusInvites
					: 1;

				embed.addFields([
					{
						name: "📨 Invitado por",
						value: `${usedInvite.inviter.tag}`,
						inline: true,
					},
					{
						name: "🔗 Código de invitación",
						value: `\`${usedInvite.code}\``,
						inline: true,
					},
					{
						name: "📊 Invitaciones totales",
						value: `${totalInvites} invitaciones`,
						inline: true,
					},
				]);

				if (isFake) {
					embed.addFields([
						{
							name: "⚠️ Posible invitación falsa",
							value: "Esta cuenta es muy nueva (menos de 7 días)",
							inline: false,
						},
					]);
				}
			} else {
				embed.addFields([
					{
						name: "❓ Forma de entrada",
						value: "No se pudo determinar cómo llegó al servidor",
						inline: false,
					},
				]);
			}

			await welcomeChannel.send({ embeds: [embed] });
		} catch (error) {
			console.error("Error enviando mensaje de bienvenida:", error);
		}
	},
};
