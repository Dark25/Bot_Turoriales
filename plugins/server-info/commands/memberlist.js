const {
	SlashCommandBuilder,
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");

const data = new SlashCommandBuilder()
	.setName("memberlist")
	.setDescription("Muestra una lista de miembros del servidor con filtros.")
	.addStringOption((option) =>
		option
			.setName("filtro")
			.setDescription("Filtrar miembros por estado o tipo.")
			.setRequired(false)
			.addChoices(
				{ name: "🟢 En línea", value: "online" },
				{ name: "🟡 Ausente", value: "idle" },
				{ name: "🔴 No molestar", value: "dnd" },
				{ name: "⚫ Desconectado", value: "offline" },
				{ name: "🤖 Solo bots", value: "bots" },
				{ name: "👤 Solo humanos", value: "humans" },
				{ name: "👑 Solo administradores", value: "admins" },
				{ name: "🆕 Miembros nuevos (últimos 7 días)", value: "new" },
			),
	)
	.addRoleOption((option) =>
		option
			.setName("rol")
			.setDescription("Filtrar miembros por rol específico.")
			.setRequired(false),
	)
	.addIntegerOption((option) =>
		option
			.setName("limite")
			.setDescription("Número máximo de miembros a mostrar (1-50).")
			.setRequired(false)
			.setMinValue(1)
			.setMaxValue(50),
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

			const filter = interaction.options.getString("filtro");
			const roleFilter = interaction.options.getRole("rol");
			const limit = interaction.options.getInteger("limite") || 20;

			// Obtener todos los miembros
			const members = interaction.guild.members.cache;
			let filteredMembers = members;
			let filterDescription = "Todos los miembros";

			// Aplicar filtros
			if (filter) {
				switch (filter) {
					case "online":
						filteredMembers = members.filter(
							(m) => m.presence?.status === "online",
						);
						filterDescription = "🟢 Miembros en línea";
						break;
					case "idle":
						filteredMembers = members.filter(
							(m) => m.presence?.status === "idle",
						);
						filterDescription = "🟡 Miembros ausentes";
						break;
					case "dnd":
						filteredMembers = members.filter(
							(m) => m.presence?.status === "dnd",
						);
						filterDescription = "🔴 Miembros en no molestar";
						break;
					case "offline":
						filteredMembers = members.filter(
							(m) => !m.presence || m.presence.status === "offline",
						);
						filterDescription = "⚫ Miembros desconectados";
						break;
					case "bots":
						filteredMembers = members.filter((m) => m.user.bot);
						filterDescription = "🤖 Solo bots";
						break;
					case "humans":
						filteredMembers = members.filter((m) => !m.user.bot);
						filterDescription = "👤 Solo humanos";
						break;
					case "admins":
						filteredMembers = members.filter((m) =>
							m.permissions.has("Administrator"),
						);
						filterDescription = "👑 Solo administradores";
						break;
					case "new": {
						const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
						filteredMembers = members.filter(
							(m) => m.joinedTimestamp && m.joinedTimestamp > oneWeekAgo,
						);
						filterDescription = "🆕 Miembros nuevos (últimos 7 días)";
						break;
					}
				}
			}

			// Filtrar por rol si se especifica
			if (roleFilter) {
				filteredMembers = filteredMembers.filter((m) =>
					m.roles.cache.has(roleFilter.id),
				);
				filterDescription += ` con rol ${roleFilter.name}`;
			}

			// Convertir a array y ordenar
			const membersArray = Array.from(filteredMembers.values());

			// Ordenar por fecha de unión (más recientes primero)
			membersArray.sort((a, b) => {
				if (!a.joinedTimestamp && !b.joinedTimestamp) return 0;
				if (!a.joinedTimestamp) return 1;
				if (!b.joinedTimestamp) return -1;
				return b.joinedTimestamp - a.joinedTimestamp;
			});

			const totalFiltered = membersArray.length;
			const displayMembers = membersArray.slice(0, limit);

			if (totalFiltered === 0) {
				return interaction.editReply({
					content:
						"❌ No se encontraron miembros que coincidan con los filtros especificados.",
				});
			}

			// Crear embed
			const embed = new EmbedBuilder()
				.setColor("#5865F2")
				.setTitle("👥 Lista de Miembros")
				.setDescription(
					`**Filtro:** ${filterDescription}\n**Total encontrados:** ${totalFiltered.toLocaleString()}\n**Mostrando:** ${Math.min(limit, totalFiltered)}`,
				)
				.setFooter({
					text: `Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})
				.setTimestamp();

			// Crear lista de miembros
			const memberList = displayMembers
				.map((member, index) => {
					const statusEmojis = {
						online: "🟢",
						idle: "🟡",
						dnd: "🔴",
						offline: "⚫",
					};

					const status = member.presence?.status || "offline";
					const statusEmoji = statusEmojis[status];
					const joinedDate = member.joinedTimestamp
						? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
						: "Desconocida";

					const highestRole =
						member.roles.highest.name !== "@everyone"
							? member.roles.highest.name
							: "Sin rol";

					return (
						`**${index + 1}.** ${statusEmoji} ${member.user.tag}${member.user.bot ? " 🤖" : ""}\n` +
						`└ Unido: ${joinedDate} • Rol: ${highestRole}`
					);
				})
				.join("\n\n");

			// Dividir en múltiples campos si es necesario
			if (memberList.length <= 1024) {
				embed.addFields({
					name: "📋 Miembros",
					value: memberList,
					inline: false,
				});
			} else {
				// Dividir en chunks de 1024 caracteres máximo
				const chunks = [];
				let currentChunk = "";
				const lines = memberList.split("\n\n");

				for (const line of lines) {
					if ((currentChunk + line).length > 1020) {
						if (currentChunk) chunks.push(currentChunk);
						currentChunk = line;
					} else {
						currentChunk += (currentChunk ? "\n\n" : "") + line;
					}
				}
				if (currentChunk) chunks.push(currentChunk);

				chunks.forEach((chunk, index) => {
					embed.addFields({
						name: index === 0 ? "📋 Miembros" : "📋 Miembros (continuación)",
						value: chunk,
						inline: false,
					});
				});
			}

			// Crear botones si hay más miembros para mostrar
			const components = [];
			if (totalFiltered > limit) {
				const timestamp = Date.now();
				const refreshButton = new ButtonBuilder()
					.setCustomId(`memberlist_refresh_${interaction.user.id}_${timestamp}`)
					.setLabel(`🔄 Ver más (${totalFiltered - limit} restantes)`)
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(false);

				const row = new ActionRowBuilder().addComponents(refreshButton);
				components.push(row);
			}

			await interaction.editReply({
				embeds: [embed],
				components: components,
			});
		} catch (error) {
			console.error("Error en comando memberlist:", error);
			const errorMsg = interaction.deferred
				? { content: "❌ Ocurrió un error al obtener la lista de miembros." }
				: {
						content: "❌ Ocurrió un error al obtener la lista de miembros.",
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
