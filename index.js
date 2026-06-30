const {
  Client,
  GatewayIntentBits,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  REST,
  Routes,
  MessageFlags
} = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

const ID_DO_SERVIDOR = '1292571689841852426';
const CANAL_APROVACAO = '1502286435959443600';
const CANAL_APROVADOS = '1502286473381019809';
const CANAL_RECUSADOS = '1502286473381019809';

const CARGO_APROVADOR = '1521622560813351124';

const COMPANHIAS = {
  "1ª CIA": { cargo: "1510318457470714159" },
  "2ª CIA": { cargo: "1510318160010674379" }
};

const PATENTES = {
  "Coronel": { cargo: "1292571690018013276", emoji: "1518085181221769276" },
  "T.Coronel": { cargo: "1292571690018013275", emoji: "1518085261744013342" },
  "Major": { cargo: "1292571690018013274", emoji: "1518085342522245271" },
  "Capitão": { cargo: "1292571689963622610", emoji: "1518090001177645168" },
  "1° Tenente": { cargo: "1292571689963622609", emoji: "1518086107726876853" },
  "2° Tenente": { cargo: "1292571689963622608", emoji: "1518086151636779008" },
  "Aspirante": { cargo: "1292571689963622607", emoji: "1518086204891992216" },
  "Subtenente": { cargo: "1292571689963622604", emoji: "1518086267198242866" },
  "1° Sgt": { cargo: "1292571690018013273", emoji: "1518086321883713687" },
  "2° Sgt": { cargo: "1292571689963622602", emoji: "1518086366884397268" },
  "3° Sgt": { cargo: "1292571689963622601", emoji: "1518086419099156591" },
  "Cabo": { cargo: "1292571689946841219", emoji: "1518086482148196362" },
  "Soldado": { cargo: "1292571689946841218", emoji: "1518086550251114658" },
  "Al Soldado": { cargo: "1510135059800133695", emoji: "1518086550251114658" }
};

let registros = new Map();

if (fs.existsSync('./registros.json')) {
  try {
    const conteudo = fs.readFileSync('./registros.json', 'utf8');
    if (conteudo.trim()) {
      const dados = JSON.parse(conteudo);
      registros = new Map(Object.entries(dados));
    }
  } catch (err) {
    console.error("Erro ao carregar o arquivo de registros:", err);
  }
}

function salvarRegistros() {
  fs.writeFileSync(
    './registros.json',
    JSON.stringify(Object.fromEntries(registros), null, 2)
  );
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ ${client.user.tag} online`);

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
  try {
    console.log('🔄 Atualizando comandos / (slash) no servidor...');
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, ID_DO_SERVIDOR),
      { body: [{ name: 'painel', description: 'Envia o painel de registro policial.' }] }
    );
    console.log('✅ Comandos / registrados com sucesso no servidor!');
  } catch (error) {
    console.error('❌ Erro ao registrar comandos:', error.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // 1. COMANDO /PAINEL
    if (interaction.isChatInputCommand() && interaction.commandName === 'painel') {
      if (!interaction.member.roles.cache.has(CARGO_APROVADOR) && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({
          content: '❌ **Acesso Negado!** Apenas Oficiais e membros da Staff autorizados podem acionar o painel de registro.',
          flags: [MessageFlags.Ephemeral]
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('🛡️ SISTEMA DE INCORPORAÇÃO POLICIAL')
        .setDescription(`Seja bem-vindo ao departamento de cadastros.\n\nPara iniciar sua solicitação de incorporação e atualizar seus dados na corporação, clique no botão **Iniciar Registro** logo abaixo.`)
        .setColor('#1d4ed8')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: 'DIRETORIA DE RECRUTAMENTO E SELEÇÃO DE PESSOAL', iconURL: client.user.avatarURL() })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('abrir_registro')
          .setLabel('Iniciar Registro')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📝')
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // 2. CLICOU EM INICIAR REGISTRO -> ABRE MODAL
    if (interaction.isButton() && interaction.customId === 'abrir_registro') {
      const modal = new ModalBuilder()
        .setCustomId('modal_registro')
        .setTitle('Ficha de Registro Policial');

      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nome').setLabel('Nome de Guerra').setStyle(TextInputStyle.Short).setPlaceholder('Ex: A. Santos').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tiposanguineo').setLabel('Tipo Sanguíneo').setStyle(TextInputStyle.Short).setPlaceholder('Ex: AB-').setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('autorizacao').setLabel('Quem autorizou?').setStyle(TextInputStyle.Short).setPlaceholder('Ex: Cel. Roberto').setRequired(true)),
      );

      return interaction.showModal(modal);
    }

    // 3. ENVIOU O MODAL -> APRESENTA MENU DA COMPANHIA
    if (interaction.isModalSubmit() && interaction.customId === 'modal_registro') {
      registros.set(interaction.user.id, {
        nome: interaction.fields.getTextInputValue('nome'),
        tiposanguineo: interaction.fields.getTextInputValue('tiposanguineo').toUpperCase(),
        autorizacao: interaction.fields.getTextInputValue('autorizacao'),
      });
      salvarRegistros();

      const companhiaMenu = new StringSelectMenuBuilder()
        .setCustomId('selecionar_companhia')
        .setPlaceholder('Escolha a sua Companhia...')
        .addOptions(
