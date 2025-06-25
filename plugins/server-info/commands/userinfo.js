const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const data = new SlashCommandBuilder()
	.setName("userinfo")
	.setDescription("Muestra información sobre un usuario.")
	.addUserOption((option) =>
		option
			.setName("usuario")
			.setDescription("El usuario del que quieres obtener información.")
			.setRequired(false),
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

			const user = interaction.options.getUser("usuario") || interaction.user;
			const member = interaction.guild.members.cache.get(user.id);

			// Obtener información detallada del usuario
			const joinedTimestamp = member?.joinedTimestamp;
			const createdTimestamp = user.createdTimestamp;

			// Calcular días desde que se unió y creó la cuenta
			const daysSinceJoined = joinedTimestamp
				? Math.floor((Date.now() - joinedTimestamp) / (1000 * 60 * 60 * 24))
				: null;
			const daysSinceCreated = Math.floor(
				(Date.now() - createdTimestamp) / (1000 * 60 * 60 * 24),
			);

			// Obtener roles del usuario (excluyendo @everyone)
			const roles =
				member?.roles.cache
					.filter((role) => role.name !== "@everyone")
					.sort((a, b) => b.position - a.position)
					.map((role) => role.toString())
					.slice(0, 10) || [];

			// Determinar el estado de presencia
			const presence = member?.presence;
			const statusEmojis = {
				online: "🟢",
				idle: "🟡",
				dnd: "🔴",
				offline: "⚫",
			};
			const statusText = {
				online: "En línea",
				idle: "Ausente",
				dnd: "No molestar",
				offline: "Desconectado",
			};

			const userStatus = presence?.status || "offline";
			const statusDisplay = `${statusEmojis[userStatus]} ${statusText[userStatus]}`;

			// Obtener actividad actual
			const activity = presence?.activities?.[0];
			let activityText = "Ninguna";
			if (activity) {
				const activityTypes = {
					0: "🎮 Jugando",
					1: "📺 Transmitiendo",
					2: "🎵 Escuchando",
					3: "👀 Viendo",
					4: "✨ Personalizado",
					5: "🏆 Compitiendo",
				};
				activityText = `${activityTypes[activity.type] || "📱"} ${activity.name}`;
				if (activity.details) activityText += `\n${activity.details}`;
			}

			// Determinar permisos destacados
			const keyPermissions = [];
			if (member?.permissions.has("Administrator"))
				keyPermissions.push("👑 Administrador");
			if (member?.permissions.has("ManageGuild"))
				keyPermissions.push("⚙️ Gestionar servidor");
			if (member?.permissions.has("ManageChannels"))
				keyPermissions.push("📝 Gestionar canales");
			if (member?.permissions.has("ManageMessages"))
				keyPermissions.push("🗑️ Gestionar mensajes");
			if (member?.permissions.has("BanMembers"))
				keyPermissions.push("🔨 Banear miembros");
			if (member?.permissions.has("KickMembers"))
				keyPermissions.push("👢 Expulsar miembros");

			const embed = new EmbedBuilder()
				.setColor(member?.displayHexColor || user.hexAccentColor || "#5865F2")
				.setTitle(`👤 Información de ${user.username}`)
				.setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
				.addFields(
					{
						name: "🏷️ Tag completo",
						value: `${user.tag}\n\`${user.id}\``,
						inline: true,
					},
					{
						name: "📱 Estado",
						value: statusDisplay,
						inline: true,
					},
					{
						name: "🎯 Actividad",
						value: activityText,
						inline: true,
					},
					{
						name: "🎭 Apodo",
						value: member?.nickname || "Sin apodo",
						inline: true,
					},
					{
						name: "📅 Cuenta creada",
						value: `<t:${Math.floor(createdTimestamp / 1000)}:F>\n<t:${Math.floor(createdTimestamp / 1000)}:R>\n*(${daysSinceCreated} días)*`,
						inline: true,
					},
					{
						name: "📥 Se unió al servidor",
						value: joinedTimestamp
							? `<t:${Math.floor(joinedTimestamp / 1000)}:F>\n<t:${Math.floor(joinedTimestamp / 1000)}:R>\n*(${daysSinceJoined} días)*`
							: "No disponible",
						inline: true,
					},
				)
				.setFooter({
					text: `Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})
				.setTimestamp();

			// Agregar roles si los tiene
			if (roles.length > 0) {
				const roleText =
					roles.length > 10
						? `${roles.join(", ")} y ${member.roles.cache.size - 11} más...`
						: roles.join(", ");
				embed.addFields({
					name: `🎭 Roles (${member.roles.cache.size - 1})`,
					value: roleText || "Sin roles",
					inline: false,
				});
			}

			// Agregar permisos clave si los tiene
			if (keyPermissions.length > 0) {
				embed.addFields({
					name: "🔑 Permisos destacados",
					value: keyPermissions.join("\n"),
					inline: false,
				});
			}

			// Agregar avatar del servidor si es diferente al global
			if (
				member?.avatarURL() &&
				member.avatarURL() !== user.displayAvatarURL()
			) {
				embed.setImage(member.avatarURL({ dynamic: true, size: 512 }));
			}

			// Agregar banner si el usuario tiene uno
			if (user.bannerURL()) {
				embed.setImage(user.bannerURL({ dynamic: true, size: 1024 }));
			}

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error en comando userinfo:", error);
			const errorMsg = interaction.deferred
				? {
						content:
							"❌ Ocurrió un error al obtener la información del usuario.",
					}
				: {
						content:
							"❌ Ocurrió un error al obtener la información del usuario.",
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
