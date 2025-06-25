const {
	SlashCommandBuilder,
	EmbedBuilder,
	ChannelType,
} = require("discord.js");

const data = new SlashCommandBuilder()
	.setName("channelinfo")
	.setDescription("Muestra información detallada sobre un canal.")
	.addChannelOption((option) =>
		option
			.setName("canal")
			.setDescription("El canal del que quieres obtener información.")
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

			const channel =
				interaction.options.getChannel("canal") || interaction.channel;

			// Mapeo de tipos de canales
			const channelTypes = {
				[ChannelType.GuildText]: "💬 Canal de Texto",
				[ChannelType.GuildVoice]: "🔊 Canal de Voz",
				[ChannelType.GuildCategory]: "📁 Categoría",
				[ChannelType.GuildAnnouncement]: "📢 Canal de Anuncios",
				[ChannelType.GuildStageVoice]: "🎭 Canal de Escenario",
				[ChannelType.GuildForum]: "💭 Canal de Foro",
				[ChannelType.GuildDirectory]: "📋 Directorio",
				[ChannelType.PublicThread]: "🧵 Hilo Público",
				[ChannelType.PrivateThread]: "🔒 Hilo Privado",
			};

			const embed = new EmbedBuilder()
				.setColor("#5865F2")
				.setTitle("📋 Información del Canal")
				.setDescription(`**${channel.name}** ${channel.toString()}`)
				.addFields(
					{
						name: "🆔 ID del Canal",
						value: `\`${channel.id}\``,
						inline: true,
					},
					{
						name: "📝 Tipo",
						value: channelTypes[channel.type] || "Desconocido",
						inline: true,
					},
					{
						name: "📅 Creado el",
						value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>\n<t:${Math.floor(channel.createdTimestamp / 1000)}:R>`,
						inline: true,
					},
				);

			// Información específica del tipo de canal
			if (
				channel.type === ChannelType.GuildText ||
				channel.type === ChannelType.GuildAnnouncement
			) {
				// Canal de texto
				if (channel.topic) {
					embed.addFields({
						name: "📄 Descripción",
						value:
							channel.topic.length > 1024
								? `${channel.topic.substring(0, 1021)}...`
								: channel.topic,
						inline: false,
					});
				}

				if (channel.rateLimitPerUser > 0) {
					embed.addFields({
						name: "⏱️ Modo Lento",
						value: `${channel.rateLimitPerUser} segundos`,
						inline: true,
					});
				}

				embed.addFields({
					name: "🔞 NSFW",
					value: channel.nsfw ? "✅ Sí" : "❌ No",
					inline: true,
				});
			} else if (
				channel.type === ChannelType.GuildVoice ||
				channel.type === ChannelType.GuildStageVoice
			) {
				// Canal de voz
				embed.addFields({
					name: "👥 Límite de Usuarios",
					value:
						channel.userLimit === 0
							? "Sin límite"
							: channel.userLimit.toString(),
					inline: true,
				});

				embed.addFields({
					name: "🔊 Calidad de Audio",
					value: channel.bitrate
						? `${channel.bitrate / 1000}kbps`
						: "Desconocida",
					inline: true,
				});

				const connectedUsers = channel.members?.size || 0;
				embed.addFields({
					name: "🎧 Usuarios Conectados",
					value: connectedUsers.toString(),
					inline: true,
				});
			} else if (channel.type === ChannelType.GuildCategory) {
				// Categoría
				const childChannels = channel.children.cache;
				const textChannels = childChannels.filter(
					(c) => c.type === ChannelType.GuildText,
				).size;
				const voiceChannels = childChannels.filter(
					(c) => c.type === ChannelType.GuildVoice,
				).size;

				embed.addFields({
					name: "📊 Canales Hijos",
					value: `**Total:** ${childChannels.size}\n**Texto:** ${textChannels}\n**Voz:** ${voiceChannels}`,
					inline: true,
				});
			}

			// Información de permisos
			if (channel.parent) {
				embed.addFields({
					name: "📁 Categoría Padre",
					value: channel.parent.name,
					inline: true,
				});
			}

			embed.addFields({
				name: "🔢 Posición",
				value: (channel.position + 1).toString(),
				inline: true,
			});

			// Verificar permisos del bot para obtener más información
			if (
				channel
					.permissionsFor?.(interaction.guild.members.me)
					?.has("ViewChannel")
			) {
				if (
					channel.type === ChannelType.GuildText &&
					channel
						.permissionsFor(interaction.guild.members.me)
						?.has("ReadMessageHistory")
				) {
					try {
						// Intentar obtener el último mensaje (si existe)
						const messages = await channel.messages.fetch({ limit: 1 });
						if (messages.size > 0) {
							const lastMessage = messages.first();
							embed.addFields({
								name: "💌 Último Mensaje",
								value: `<t:${Math.floor(lastMessage.createdTimestamp / 1000)}:R> por ${lastMessage.author.tag}`,
								inline: false,
							});
						}
					} catch (_error) {
						// Si no se puede obtener el último mensaje, continuar sin error
					}
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
			console.error("Error en comando channelinfo:", error);
			const errorMsg = interaction.deferred
				? {
						content: "❌ Ocurrió un error al obtener la información del canal.",
					}
				: {
						content: "❌ Ocurrió un error al obtener la información del canal.",
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
