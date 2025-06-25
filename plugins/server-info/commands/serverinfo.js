const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const data = new SlashCommandBuilder()
	.setName("serverinfo")
	.setDescription("Muestra información sobre el servidor.");

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
			const owner = await guild.fetchOwner();

			// Obtener estadísticas detalladas
			const textChannels = guild.channels.cache.filter(
				(c) => c.type === 0,
			).size;
			const voiceChannels = guild.channels.cache.filter(
				(c) => c.type === 2,
			).size;
			const categories = guild.channels.cache.filter((c) => c.type === 4).size;

			const onlineMembers = guild.members.cache.filter(
				(m) => m.presence?.status !== "offline",
			).size;
			const botCount = guild.members.cache.filter((m) => m.user.bot).size;
			const humanCount = guild.memberCount - botCount;

			// Calcular boost info
			const boostTier = guild.premiumTier;
			const boostCount = guild.premiumSubscriptionCount || 0;
			const boostEmoji = boostTier > 0 ? "💎" : "📈";

			// Nivel de verificación
			const verificationLevels = {
				0: "🔓 Ninguno",
				1: "📧 Email verificado",
				2: "⏰ Registrado por más de 5 minutos",
				3: "⏳ Miembro por más de 10 minutos",
				4: "📱 Teléfono verificado",
			};

			const embed = new EmbedBuilder()
				.setColor(guild.members.me?.displayHexColor || "#5865F2")
				.setTitle(`📊 Información de ${guild.name}`)
				.setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
				.setDescription(
					`*${guild.description || "Sin descripción disponible"}*`,
				)
				.addFields(
					{
						name: "👑 Propietario",
						value: `${owner.user.tag}\n\`${owner.id}\``,
						inline: true,
					},
					{
						name: "🆔 ID del Servidor",
						value: `\`${guild.id}\``,
						inline: true,
					},
					{
						name: "📅 Creado el",
						value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`,
						inline: true,
					},
					{
						name: "👥 Miembros",
						value: `**Total:** ${guild.memberCount.toLocaleString()}\n**Humanos:** ${humanCount.toLocaleString()}\n**Bots:** ${botCount.toLocaleString()}\n**En línea:** ${onlineMembers.toLocaleString()}`,
						inline: true,
					},
					{
						name: "💬 Canales",
						value: `**Total:** ${guild.channels.cache.size}\n**Texto:** ${textChannels}\n**Voz:** ${voiceChannels}\n**Categorías:** ${categories}`,
						inline: true,
					},
					{
						name: "🎭 Roles",
						value: `**Total:** ${guild.roles.cache.size}\n**Más alto:** ${guild.roles.highest.name}`,
						inline: true,
					},
					{
						name: `${boostEmoji} Nivel de Boost`,
						value: `**Nivel:** ${boostTier}\n**Boosts:** ${boostCount}`,
						inline: true,
					},
					{
						name: "🛡️ Verificación",
						value: verificationLevels[guild.verificationLevel] || "Desconocido",
						inline: true,
					},
					{
						name: "🌍 Región",
						value: guild.preferredLocale || "No especificada",
						inline: true,
					},
				)
				.setFooter({
					text: `Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})
				.setTimestamp();

			// Crear componentes para mostrar logo del servidor
			const components = [];
			if (guild.iconURL()) {
				const {
					ActionRowBuilder,
					ButtonBuilder,
					ButtonStyle,
				} = require("discord.js");
				const logoButton = new ButtonBuilder()
					.setLabel("🖼️ Ver Logo del Servidor")
					.setStyle(ButtonStyle.Link)
					.setURL(guild.iconURL({ dynamic: true, size: 1024 }));

				const row = new ActionRowBuilder().addComponents(logoButton);
				components.push(row);
			}

			await interaction.editReply({
				embeds: [embed],
				components: components,
			});
		} catch (error) {
			console.error("Error en comando serverinfo:", error);
			const errorMsg = interaction.deferred
				? {
						content:
							"❌ Ocurrió un error al obtener la información del servidor.",
					}
				: {
						content:
							"❌ Ocurrió un error al obtener la información del servidor.",
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
