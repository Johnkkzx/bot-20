const {
  Client,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  EmbedBuilder,
  MessageFlags 
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

// 🔑 CONFIGURAÇÃO
const CARGO_APROVADO_5 = '1292571689946841218';
const CARGO_APROVADO_1 = '1292571689946841217';
const CARGO_APROVADO_2 = '1292571689946841213';
const CARGO_APROVADO_3 = '1292571689917354019';

// 📌 CANAIS
const CANAL_FORMULARIO = '1381735538121248820';
const CANAL_APROVACAO = '1502286435959443600';
const CANAL_APROVADOS = '1502286473381019809';
const CANAL_RECUSADOS = '1502286473381019809';


// 🚀 BOT ONLINE
client.once(Events.ClientReady, async () => {
  console.log(`✅ Online como ${client.user.tag}`);

  const canal = client.channels.cache.get(CANAL_FORMULARIO);
  if (!canal) return console.log('❌ Canal do formulário não encontrado');

  const embedPainel = new EmbedBuilder()
    .setTitle('REGISTRO PARA INCORPORAÇÃO')
    .setDescription(
      'Preencha corretamente.\n\n' +
      '⚠️ **AVISO IMPORTANTE:**\n' +
      '• Não faça sem ter sido aprovado\n' +
      '• Caso seja feito pode ser colocado em black-list \n' +
      '• Aguarde aprovação.'
    )
    .setColor(0x2b2d31);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abrir_formulario')
      .setLabel('Registro Policial')
      .setStyle(ButtonStyle.Secondary)
  );

  await canal.send({ embeds: [embedPainel], components: [row] });
});


// 📌 INTERAÇÕES
client.on(Events.InteractionCreate, async (interaction) => {

  try {

    // 🔥 ABRIR MODAL 
    if (interaction.isButton() && interaction.customId === 'abrir_formulario') {
      const modal = new ModalBuilder()
        .setCustomId('registroModal')
        .setTitle('Registro Policial');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('nome').setLabel('Nome de Guerra').setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('id_passaporte').setLabel('RG').setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('recrutador_nome').setLabel('Autorização').setStyle(TextInputStyle.Short)
        )
      );

      await interaction.showModal(modal);
      return; 
    }

    // 🔥 MODAL SUBMIT
    if (interaction.isModalSubmit() && interaction.customId === 'registroModal') {

      const nome = interaction.fields.getTextInputValue('nome');
      const idPass = interaction.fields.getTextInputValue('id_passaporte');
      const recNome = interaction.fields.getTextInputValue('recrutador_nome');

      await interaction.reply({
        content: `Confirma?\n\n👤 ${nome} | ${idPass}\n📌 ${recNome}`,
        flags: MessageFlags.Ephemeral,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`conf|${nome}|${idPass}|${recNome}`)
              .setLabel('Enviar')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('cancelar')
              .setLabel('Cancelar')
              .setStyle(ButtonStyle.Danger)
          )
        ]
      });

      return;
    }

    // 🔥 BOTÕES
    if (interaction.isButton()) {

      if (interaction.replied || interaction.deferred) return;

      const data = interaction.customId.split('|');
      const acao = data[0];

      if (acao === 'cancelar') {
        await interaction.update({ content: '❌ Cancelado.', components: [] });
        return;
      }

      // 📤 ENVIAR PRA STAFF
      if (acao === 'conf') {
        const [, nome, idPass, recNome] = data;

        await interaction.update({ content: '✅ Enviado para análise!', components: [] });

        const canalAprovacao = interaction.guild.channels.cache.get(CANAL_APROVACAO);

        const embedAnalise = new EmbedBuilder()
          .setTitle('📋 | Novo Registro')
          .setDescription(
            `👤 <@${interaction.user.id}>\n\n` +
            `**Nome de Guerra:** ${nome}\n**RG:** ${idPass}\n**Autorização:** ${recNome}`
          )
          .setColor(0x2b2d31);

        const botoesStaff = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`aprovar|${interaction.user.id}|${idPass}|${nome}`)
            .setLabel('Aceitar')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`negar|${interaction.user.id}|${idPass}|${nome}`)
            .setLabel('Negar')
            .setStyle(ButtonStyle.Danger)
        );

        await canalAprovacao.send({ embeds: [embedAnalise], components: [botoesStaff] });
        return;
      }

      // ✅ STAFF DECISÃO
      if (acao === 'aprovar' || acao === 'negar') {

        await interaction.deferUpdate(); // 🔥 evita timeout

        const candidatoId = data[1];
        const idPass = data[2];
        const nome = data[3];
        const aprovado = acao === 'aprovar';

        const canalLog = interaction.guild.channels.cache.get(
          aprovado ? CANAL_APROVADOS : CANAL_RECUSADOS
        );

        const embedLog = new EmbedBuilder()
          .setTitle(aprovado ? '✅ Registro Aprovado' : '❌ Registro Negado')
          .setColor(aprovado ? 0x00FF00 : 0xFF0000)
          .addFields(
            { name: 'Candidato:', value: `<@${candidatoId}> (RG: ${idPass})`, inline: true },
            { name: 'Staff:', value: `<@${interaction.user.id}>`, inline: true }
          )
          .setTimestamp();

        if (canalLog) await canalLog.send({ embeds: [embedLog] });

        if (aprovado) {
          const membro = await interaction.guild.members.fetch(candidatoId).catch(() => null);

          if (membro) {

            await membro.roles.add([
              CARGO_APROVADO_5,
              CARGO_APROVADO_1,
              CARGO_APROVADO_2,
              CARGO_APROVADO_3
            ]).catch(console.error);

            await membro.setNickname(`Soldado PM. ${nome} | ${idPass}`)
              .catch(console.error);
          }
        }

        await interaction.message.edit({
          content: `Ação realizada por <@${interaction.user.id}>!`,
          embeds: [],
          components: []
        });

        setTimeout(() => {
          interaction.message?.delete().catch(() => {});
        }, 2000);

        return;
      }
    }

  } catch (err) {
    console.error('❌ Erro geral:', err);
  }

});


// 🔥 ANTI-CRASH
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// 📊 LOGS
client.on('error', console.error);
client.on('warn', console.warn);

client.login(process.env.TOKEN);
