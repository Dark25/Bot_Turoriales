const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const data = new SlashCommandBuilder()
	.setName("roleinfo")
	.setDescription("Muestra información detallada sobre un rol.")
	.addRoleOption((option) =>
		option
			.setName("rol")
			.setDescription("El rol del que quieres obtener información.")
			.setRequired(true),
	);

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

			const role = interaction.options.getRole("rol");

			if (!role) {
				return interaction.editReply({
					content: "❌ No se pudo encontrar el rol especificado.",
				});
			}

			// Obtener miembros con este rol
			const membersWithRole = interaction.guild.members.cache.filter((member) =>
				member.roles.cache.has(role.id),
			);

			// Permisos importantes del rol
			const importantPermissions = [
				"Administrator",
				"ManageGuild",
				"ManageRoles",
				"ManageChannels",
				"ManageMessages",
				"ManageNicknames",
				"ManageWebhooks",
				"ManageEmojisAndStickers",
				"KickMembers",
				"BanMembers",
				"MentionEveryone",
				"ViewAuditLog",
				"ModerateMembers",
			];

			const rolePermissions = importantPermissions.filter((perm) =>
				role.permissions.has(perm),
			);

			// Mapeo de nombres de permisos en español
			const permissionNames = {
				Administrator: "👑 Administrador",
				ManageGuild: "⚙️ Gestionar Servidor",
				ManageRoles: "🎭 Gestionar Roles",
				ManageChannels: "📋 Gestionar Canales",
				ManageMessages: "💬 Gestionar Mensajes",
				ManageNicknames: "🏷️ Gestionar Apodos",
				ManageWebhooks: "🔗 Gestionar Webhooks",
				ManageEmojisAndStickers: "😀 Gestionar Emojis",
				KickMembers: "👢 Expulsar Miembros",
				BanMembers: "🔨 Banear Miembros",
				MentionEveryone: "📢 Mencionar Everyone",
				ViewAuditLog: "📊 Ver Registro de Auditoría",
				ModerateMembers: "🛡️ Moderar Miembros",
			};

			const embed = new EmbedBuilder()
				.setColor(role.hexColor === "#000000" ? "#5865F2" : role.hexColor)
				.setTitle("🎭 Información del Rol")
				.setDescription(`**${role.name}** ${role.toString()}`)
				.addFields(
					{
						name: "🆔 ID del Rol",
						value: `\`${role.id}\``,
						inline: true,
					},
					{
						name: "🎨 Color",
						value: `\`${role.hexColor}\``,
						inline: true,
					},
					{
						name: "📅 Creado el",
						value: `<t:${Math.floor(role.createdTimestamp / 1000)}:F>\n<t:${Math.floor(role.createdTimestamp / 1000)}:R>`,
						inline: true,
					},
					{
						name: "👥 Miembros",
						value: membersWithRole.size.toLocaleString(),
						inline: true,
					},
					{
						name: "🔢 Posición",
						value: `${role.position} de ${interaction.guild.roles.cache.size}`,
						inline: true,
					},
					{
						name: "⚡ Hoisted",
						value: role.hoist ? "✅ Sí (se muestra por separado)" : "❌ No",
						inline: true,
					},
					{
						name: "🤖 Administrado por Bot",
						value: role.managed ? "✅ Sí" : "❌ No",
						inline: true,
					},
					{
						name: "🔗 Mencionable",
						value: role.mentionable ? "✅ Sí" : "❌ No",
						inline: true,
					},
				);

			// Agregar permisos importantes si los tiene
			if (rolePermissions.length > 0) {
				const permissionsText = rolePermissions
					.map((perm) => permissionNames[perm] || perm)
					.join("\n");

				embed.addFields({
					name: "🛡️ Permisos Importantes",
					value:
						permissionsText.length > 1024
							? `${permissionsText.substring(0, 1021)}...`
							: permissionsText,
					inline: false,
				});
			}

			// Si el rol tiene pocos miembros, mostrar algunos nombres
			if (membersWithRole.size > 0 && membersWithRole.size <= 20) {
				const memberNames = membersWithRole
					.map((member) => member.user.tag)
					.slice(0, 10)
					.join("\n");

				embed.addFields({
					name: `👤 Miembros con este rol ${membersWithRole.size > 10 ? `(mostrando 10 de ${membersWithRole.size})` : ""}`,
					value: memberNames,
					inline: false,
				});
			}

			// Información adicional si es un rol de bot
			if (role.managed && role.tags) {
				if (role.tags.botId) {
					const bot = interaction.guild.members.cache.get(role.tags.botId);
					if (bot) {
						embed.addFields({
							name: "🤖 Bot Asociado",
							value: `${bot.user.tag} (\`${bot.id}\`)`,
							inline: true,
						});
					}
				}

				if (role.tags.integrationId) {
					embed.addFields({
						name: "🔗 Integración",
						value: `ID: \`${role.tags.integrationId}\``,
						inline: true,
					});
				}

				if (role.tags.premiumSubscriberRole) {
					embed.addFields({
						name: "💎 Rol de Boost",
						value: "✅ Este es el rol de Server Boost",
						inline: true,
					});
				}
			}

			embed
				.setFooter({
					text: `Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando roleinfo:", error);
			const errorMsg = interaction.deferred
				? { content: "❌ Ocurrió un error al obtener la información del rol." }
				: {
						content: "❌ Ocurrió un error al obtener la información del rol.",
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
