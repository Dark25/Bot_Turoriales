const InvitationData = require("../schemas/InvitationData");
const InviteStats = require("../schemas/InviteStats");
const InviteConfig = require("../schemas/InviteConfig");

module.exports = {
	name: "guildMemberRemove",
	async execute(member, client, _plugin) {
		try {
			const guild = member.guild;

			// Buscar los datos de invitación del usuario que se fue
			const invitationData = await InvitationData.findOne({
				guildId: guild.id,
				userId: member.id,
			});

			if (invitationData && !invitationData.left) {
				// Marcar como que se fue
				invitationData.left = true;
				invitationData.leftAt = new Date();
				await invitationData.save();

				// Actualizar estadísticas del invitador si existe
				if (invitationData.invitedBy) {
					await this.updateInviterStats(
						guild.id,
						invitationData.invitedBy,
						"remove",
						invitationData.fake,
					);
				}

				// Enviar mensaje de despedida
				await this.sendLeaveMessage(member, invitationData, client, guild.id);
			}
		} catch (error) {
			console.error(
				"Error en guildMemberRemove del plugin Invitations:",
				error,
			);
		}
	},

	async updateInviterStats(guildId, userId, action, isFake = false) {
		try {
			const stats = await InviteStats.findOne({ guildId, userId });

			if (!stats) return; // No hay estadísticas para actualizar

			if (action === "remove") {
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

	async sendLeaveMessage(member, invitationData, client, guildId) {
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

			let inviterInfo = "";
			if (invitationData.invitedBy) {
				try {
					const inviter = await client.users.fetch(invitationData.invitedBy);
					inviterInfo = ` (invitado por ${inviter.tag})`;
				} catch (_error) {
					inviterInfo = " (invitador desconocido)";
				}
			}

			const timeInServer = Date.now() - invitationData.joinedAt.getTime();
			const days = Math.floor(timeInServer / (1000 * 60 * 60 * 24));
			const hours = Math.floor(
				(timeInServer % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
			);

			await welcomeChannel.send({
				content:
					`👋 **${member.user.tag}** se fue del servidor${inviterInfo}\n` +
					`⏰ Estuvo en el servidor: ${days} días y ${hours} horas\n` +
					`📊 Miembros actuales: ${member.guild.memberCount}`,
			});
		} catch (error) {
			console.error("Error enviando mensaje de despedida:", error);
		}
	},
};
