const {
	EmbedBuilder,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
} = require("discord.js");

// Sistema de tracking de interacciones mejorado para evitar duplicados absolutos
const processedButtons = new Set();
const activeProcessing = new Map();

module.exports = {
	name: "interactionCreate",
	plugin: "Server Info", // Identificador del plugin

	async execute(interaction, _client) {
		try {
			// Solo manejar botones del plugin server-info
			if (!interaction.isButton()) return;

			const buttonId = interaction.customId;

			// Verificar que el botón pertenece a este plugin
			if (
				!buttonId.startsWith("stats_refresh_") &&
				!buttonId.startsWith("memberlist_refresh_")
			) {
				return; // No es un botón de este plugin
			}

			// Verificar edad de la interacción ANTES de procesarla
			const interactionAge = Date.now() - interaction.createdTimestamp;
			const FOURTEEN_MINUTES = 14 * 60 * 1000;

			if (interactionAge > FOURTEEN_MINUTES) {
				console.log("⚠️ Interacción muy antigua detectada, ignorando...", {
					buttonId,
					age: `${Math.round(interactionAge / 1000 / 60)}min`,
				});
				return; // No procesar interacciones muy antiguas
			}

			// Crear claves específicas para prevenir duplicados
			const userButtonKey = `${interaction.user.id}_${buttonId}`;

			// VERIFICACIÓN CRÍTICA: Prevenir procesamiento simultáneo
			if (activeProcessing.has(userButtonKey)) {
				console.log(`🚫 DUPLICADO BLOQUEADO: ${userButtonKey}`);

				// Respuesta silenciosa para evitar errores solo si es seguro
				if (
					!interaction.replied &&
					!interaction.deferred &&
					interactionAge < FOURTEEN_MINUTES
				) {
					try {
						await interaction.reply({
							content: "⏳ Procesando solicitud...",
							ephemeral: true,
						});
					} catch (_error) {
						// Ignorar errores silenciosamente
					}
				}
				return;
			}

			// Marcar como procesándose INMEDIATAMENTE
			activeProcessing.set(userButtonKey, Date.now());
			processedButtons.add(buttonId);

			// Limpiar registros antiguos
			this.cleanupOldRecords();
			try {
				// Manejar botones del plugin server-info
				if (buttonId.startsWith("stats_refresh_")) {
					await this.handleStatsRefresh(interaction);
				} else if (buttonId.startsWith("memberlist_refresh_")) {
					await this.handleMemberListRefresh(interaction);
				}
			} finally {
				// SIEMPRE limpiar el procesamiento activo
				activeProcessing.delete(userButtonKey);
			}
		} catch (globalError) {
			// Limpiar procesamiento activo en caso de error
			const userButtonKey = `${interaction.user.id}_${interaction.customId}`;
			activeProcessing.delete(userButtonKey);

			// Verificar si es un error de interacción desconocida o expirada
			const isInteractionError =
				globalError.code === 10062 ||
				globalError.message?.includes("Unknown interaction") ||
				globalError.message?.includes(
					"Interaction has already been acknowledged",
				);

			if (isInteractionError) {
				return; // No intentar responder a interacciones inválidas
			}

			// Solo intentar responder si la interacción parece válida
			try {
				// Verificar el estado actual de la interacción
				if (interaction.replied || interaction.deferred) {
					// Si ya está procesada, no hacer nada más
					return;
				}

				// Verificar que la interacción aún sea válida (no más de 14 minutos)
				const interactionAge = Date.now() - interaction.createdTimestamp;
				const FOURTEEN_MINUTES = 14 * 60 * 1000;

				if (interactionAge > FOURTEEN_MINUTES) {
					console.log("⚠️ Interacción muy antigua, omitiendo respuesta");
					return;
				}

				// Intentar respuesta de emergencia solo si es seguro
				await interaction.reply({
					content: "❌ Ocurrió un error inesperado.",
					ephemeral: true,
				});
			} catch (_finalError) {
				// Registrar el error pero no propagar
				console.log(
					"⚠️ No se pudo enviar respuesta de error (normal si la interacción expiró)",
				);
			}
		}
	},

	// Función para limpiar registros antiguos
	cleanupOldRecords() {
		const FIVE_MINUTES = 5 * 60 * 1000;
		const now = Date.now();

		// Limpiar procesamiento activo que lleve mucho tiempo (más de 5 minutos)
		let cleanedCount = 0;
		for (const [key, timestamp] of activeProcessing.entries()) {
			if (now - timestamp > FIVE_MINUTES) {
				activeProcessing.delete(key);
				cleanedCount++;
			}
		}

		if (cleanedCount > 0) {
			console.log(
				`🧹 Limpiados ${cleanedCount} procesamientos activos antiguos`,
			);
		}

		// Mantener solo las últimas 1000 interacciones procesadas para evitar memory leaks
		if (processedButtons.size > 1000) {
			const interactionsArray = Array.from(processedButtons);
			const toKeep = interactionsArray.slice(-500); // Mantener las últimas 500
			processedButtons.clear();
			for (const id of toKeep) {
				processedButtons.add(id);
			}
			console.log(
				"🧹 Limpieza de memoria completada para interacciones procesadas",
			);
		}
	},

	async handleStatsRefresh(interaction) {
		const parts = interaction.customId.split("_");
		const userId = parts[2];
		const timestamp = parts[3] ? Number.parseInt(parts[3]) : Date.now();

		// Verificar que el usuario que hace clic es el mismo que ejecutó el comando
		if (interaction.user.id !== userId) {
			if (!interaction.replied && !interaction.deferred) {
				return interaction.reply({
					content:
						"❌ Solo el usuario que ejecutó el comando puede actualizar las estadísticas.",
					flags: 64,
				});
			}
			return;
		}

		// Verificar si el botón ha expirado (10 minutos)
		const TEN_MINUTES = 10 * 60 * 1000;
		if (Date.now() - timestamp > TEN_MINUTES) {
			if (!interaction.replied && !interaction.deferred) {
				return interaction.reply({
					content:
						"⏰ Este botón ha expirado. Por favor, ejecuta el comando nuevamente.",
					flags: 64,
				});
			}
			return;
		}

		// Manejo ultra-robusto del deferUpdate
		try {
			// Verificar que la interacción aún sea válida
			const interactionAge = Date.now() - interaction.createdTimestamp;
			const FOURTEEN_MINUTES = 14 * 60 * 1000;

			if (interactionAge > FOURTEEN_MINUTES) {
				console.log("⚠️ Interacción expirada, cancelando...");
				return;
			}

			// Verificación múltiple del estado
			if (interaction.replied) {
				console.log("⚠️ Interacción ya respondida, cancelando...");
				return;
			}
			if (interaction.deferred) {
				console.log("⚠️ Interacción ya diferida, cancelando...");
				return;
			}

			// Intentar deferUpdate de forma atómica
			await interaction.deferUpdate();
		} catch (error) {
			// Si es error de interacción desconocida o ya procesada, cancelar silenciosamente
			if (
				error.code === 10062 ||
				error.message?.includes("Unknown interaction") ||
				error.message?.includes("already been acknowledged")
			) {
				return;
			}

			// Para otros errores, relanzar
			throw error;
		}

		try {
			const guild = interaction.guild;

			// Regenerar todas las estadísticas
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
				.setDescription("*Análisis completo del servidor - Actualizado*")
				.addFields(
					{
						name: "👥 Análisis de Miembros",
						value: [
							`**Total:** ${totalMembers.toLocaleString()} miembros`,
							`**Humanos:** ${humanMembers.size.toLocaleString()} (${Math.round(
								(humanMembers.size / totalMembers) * 100,
							)}%)`,
							`**Bots:** ${botMembers.size.toLocaleString()} (${Math.round(
								(botMembers.size / totalMembers) * 100,
							)}%)`,
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
							`**Progreso:** ${createProgressBar(
								boostCount,
								[2, 7, 14][boostLevel] || 14,
							)}`,
						].join("\n"),
						inline: true,
					},
				);

			// Agregar top roles si hay datos
			if (roleStats.length > 0) {
				const topRolesText = roleStats
					.map(
						(role, index) =>
							`**${index + 1}.** ${
								role.name
							} - ${role.memberCount.toLocaleString()} miembros`,
					)
					.join("\n");

				embed.addFields({
					name: "🏆 Top 5 Roles Más Populares",
					value: topRolesText,
					inline: false,
				});
			}

			// Estadísticas adicionales de actividad
			try {
				const activeMembers = allMembers.filter((m) => m.presence).size;
				const activityRatio = Math.round(
					(activeMembers / allMembers.size) * 100,
				);

				const activityStats = [
					`**Ratio de Actividad:** ${activityRatio}%`,
					`**Crecimiento Semanal:** +${newMembers.size} miembros`,
					`**Densidad de Roles:** ${
						Math.round((allRoles.size / totalMembers) * 1000) / 1000
					} roles/miembro`,
				].join("\n");

				embed.addFields({
					name: "📈 Métricas de Actividad",
					value: activityStats,
					inline: false,
				});
			} catch (error) {
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
					`**Último boost:** ${
						guild.premiumSubscriptionCount > 0 ? "Activo" : "Sin boosts"
					}`,
				].join("\n"),
				inline: false,
			});

			embed
				.setFooter({
					text: `Estadísticas actualizadas • Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})
				.setTimestamp();

			// Recrear el botón con nuevo timestamp
			const newTimestamp = Date.now();
			const refreshButton = new ButtonBuilder()
				.setCustomId(`stats_refresh_${interaction.user.id}_${newTimestamp}`)
				.setLabel("🔄 Actualizar Estadísticas")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(false);

			const row = new ActionRowBuilder().addComponents(refreshButton);

			// Verificar estado final antes de editar
			if (!interaction.deferred || interaction.replied) {
				console.log(
					"⚠️ Interacción no está en estado válido para editReply (stats)",
				);
				return;
			}

			// Verificar edad una vez más antes de editar
			const finalAge = Date.now() - interaction.createdTimestamp;
			const FOURTEEN_MINUTES = 14 * 60 * 1000;
			if (finalAge > FOURTEEN_MINUTES) {
				console.log("⚠️ Interacción expiró antes de editReply (stats)");
				return;
			}

			await interaction.editReply({
				embeds: [embed],
				components: [row],
			});
		} catch (error) {
			console.error("❌ Error actualizando estadísticas:", error);

			// Verificar si es un error de interacción inválida
			const isInteractionError =
				error.code === 10062 ||
				error.message?.includes("Unknown interaction") ||
				error.message?.includes("Interaction has already been acknowledged");

			if (isInteractionError) {
				console.log(
					"⚠️ Error de interacción inválida en stats, omitiendo editReply",
				);
				return;
			}

			// Solo intentar editar si la interacción está en estado deferred válido
			if (interaction.deferred && !interaction.replied) {
				try {
					// Verificar edad de interacción antes de editar
					const interactionAge = Date.now() - interaction.createdTimestamp;
					const FOURTEEN_MINUTES = 14 * 60 * 1000;

					if (interactionAge > FOURTEEN_MINUTES) {
						console.log("⚠️ Interacción muy antigua para editReply");
						return;
					}

					await interaction.editReply({
						content:
							"❌ Error al actualizar las estadísticas. Inténtalo nuevamente.",
						embeds: [],
						components: [],
					});
				} catch (_editError) {
					console.log(
						"⚠️ No se pudo editar respuesta tras error (interacción posiblemente expirada)",
					);
				}
			}
		}
	},

	async handleMemberListRefresh(interaction) {
		const parts = interaction.customId.split("_");
		const userId = parts[2];
		const timestamp = parts[3] ? Number.parseInt(parts[3]) : Date.now();

		// Verificar que el usuario que hace clic es el mismo que ejecutó el comando
		if (interaction.user.id !== userId) {
			if (!interaction.replied && !interaction.deferred) {
				return interaction.reply({
					content:
						"❌ Solo el usuario que ejecutó el comando puede actualizar la lista.",
					flags: 64,
				});
			}
			return;
		}

		// Verificar si el botón ha expirado (10 minutos)
		const TEN_MINUTES = 10 * 60 * 1000;
		if (Date.now() - timestamp > TEN_MINUTES) {
			if (!interaction.replied && !interaction.deferred) {
				return interaction.reply({
					content:
						"⏰ Este botón ha expirado. Por favor, ejecuta el comando nuevamente.",
					flags: 64,
				});
			}
			return;
		}

		// Manejo ultra-robusto del deferUpdate
		try {
			// Verificar que la interacción aún sea válida
			const interactionAge = Date.now() - interaction.createdTimestamp;
			const FOURTEEN_MINUTES = 14 * 60 * 1000;

			if (interactionAge > FOURTEEN_MINUTES) {
				console.log("⚠️ Interacción expirada para memberlist, cancelando...");
				return;
			}

			// Verificación múltiple del estado
			if (interaction.replied) {
				console.log("❌ Interacción ya respondida, cancelando memberlist...");
				return;
			}
			if (interaction.deferred) {
				console.log("❌ Interacción ya diferida, cancelando memberlist...");
				return;
			}

			// Intentar deferUpdate de forma atómica
			await interaction.deferUpdate();
		} catch (error) {
			console.log(
				"❌ Error en deferUpdate para memberlist:",
				error.code,
				error.message,
			);

			// Si es error de interacción desconocida o ya procesada, cancelar silenciosamente
			if (
				error.code === 10062 ||
				error.message?.includes("Unknown interaction") ||
				error.message?.includes("already been acknowledged")
			) {
				return;
			}

			// Si falla deferUpdate por otra razón, no podemos continuar de forma segura
			return;
		}

		try {
			// Funcionalidad básica de actualización de lista de miembros
			const guild = interaction.guild;
			const allMembers = guild.members.cache;

			// Aumentar el límite actual (simplificado)
			const newLimit = 40; // Mostrar más miembros
			const membersArray = Array.from(allMembers.values())
				.sort((a, b) => {
					if (!a.joinedTimestamp && !b.joinedTimestamp) return 0;
					if (!a.joinedTimestamp) return 1;
					if (!b.joinedTimestamp) return -1;
					return b.joinedTimestamp - a.joinedTimestamp;
				})
				.slice(0, newLimit);

			const embed = new EmbedBuilder()
				.setColor("#5865F2")
				.setTitle("👥 Lista de Miembros Actualizada")
				.setDescription(
					`**Total:** ${allMembers.size.toLocaleString()}\n**Mostrando:** ${Math.min(
						newLimit,
						allMembers.size,
					)}`,
				)
				.setFooter({
					text: `Lista actualizada • Solicitado por ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
				})
				.setTimestamp();

			// Crear lista simplificada de miembros
			const memberList = membersArray
				.slice(0, 15)
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

					return `**${index + 1}.** ${statusEmoji} ${member.user.tag}${
						member.user.bot ? " 🤖" : ""
					}\n└ Unido: ${joinedDate}`;
				})
				.join("\n\n");

			embed.addFields({
				name: "📋 Miembros Recientes",
				value: memberList,
				inline: false,
			});

			// Botón para nueva actualización
			const newTimestamp = Date.now();
			const refreshButton = new ButtonBuilder()
				.setCustomId(
					`memberlist_refresh_${interaction.user.id}_${newTimestamp}`,
				)
				.setLabel("🔄 Actualizar Lista")
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(false);

			const row = new ActionRowBuilder().addComponents(refreshButton);

			// Verificar estado final antes de editar
			if (!interaction.deferred || interaction.replied) {
				console.log(
					"⚠️ Interacción no está en estado válido para editReply (memberlist)",
				);
				return;
			}

			// Verificar edad una vez más antes de editar
			const finalAge = Date.now() - interaction.createdTimestamp;
			const FOURTEEN_MINUTES = 14 * 60 * 1000;
			if (finalAge > FOURTEEN_MINUTES) {
				console.log("⚠️ Interacción expiró antes de editReply (memberlist)");
				return;
			}

			await interaction.editReply({
				embeds: [embed],
				components: [row],
			});
		} catch (error) {
			console.error("❌ Error actualizando lista de miembros:", error);

			// Verificar si es un error de interacción inválida
			const isInteractionError =
				error.code === 10062 ||
				error.message?.includes("Unknown interaction") ||
				error.message?.includes("Interaction has already been acknowledged");

			if (isInteractionError) {
				console.log(
					"⚠️ Error de interacción inválida en memberlist, omitiendo editReply",
				);
				return;
			}

			// Solo intentar editar si la interacción está en estado deferred válido
			if (interaction.deferred && !interaction.replied) {
				try {
					// Verificar edad de interacción antes de editar
					const interactionAge = Date.now() - interaction.createdTimestamp;
					const FOURTEEN_MINUTES = 14 * 60 * 1000;

					if (interactionAge > FOURTEEN_MINUTES) {
						console.log("⚠️ Interacción muy antigua para editReply memberlist");
						return;
					}

					await interaction.editReply({
						content:
							"❌ Error al actualizar la lista de miembros. Inténtalo nuevamente.",
						embeds: [],
						components: [],
					});
				} catch (_editError) {
					console.log(
						"⚠️ No se pudo editar respuesta tras error memberlist (interacción posiblemente expirada)",
					);
				}
			}
		}
	},
};
