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

// Lista unificada para limpar os cargos do usuário ao atualizar/promover
const TODOS_OS_CARGOS_MILITARES = [
  ...Object.values(COMPANHIAS).map(c => c.cargo),
  ...Object.values(PATENTES).map(p => p.cargo),
  '1292571689946841217',
  '1292571689946841213',
  '1292571689917354019',
  '1292571689917354020',
  '1292571689946841215',
  '1292571689917354021',
  '1521632259478651020'
];

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
          Object.keys(COMPANHIAS).map(cia => ({ label: cia, value: cia }))
        );

      return interaction.reply({
        content: '↳ **Etapa 2/4:** Selecione a sua companhia abaixo:',
        flags: [MessageFlags.Ephemeral],
        components: [new ActionRowBuilder().addComponents(companhiaMenu)]
      });
    }

    // 4. SELECIONOU COMPANHIA -> APRESENTA MENU DE PATENTE
    if (interaction.isStringSelectMenu() && interaction.customId === 'selecionar_companhia') {
      const ciaSelecionada = interaction.values[0];
      const dados = registros.get(interaction.user.id);

      if (!dados) return interaction.reply({ content: '❌ Seus dados de registro não foram encontrados. Tente novamente.', flags: [MessageFlags.Ephemeral] });

      dados.companhia = ciaSelecionada;
      salvarRegistros();

      const patenteMenu = new StringSelectMenuBuilder()
        .setCustomId('selecionar_patente')
        .setPlaceholder('Escolha a sua Patente...');

      Object.keys(PATENTES).forEach(patente => {
        const opt = { label: patente, value: patente };
        if (PATENTES[patente].emoji) opt.emoji = { id: PATENTES[patente].emoji };
        patenteMenu.addOptions(opt);
      });

      return interaction.update({
        content: '↳ **Etapa 3/4:** Selecione a sua Patente abaixo:',
        components: [new ActionRowBuilder().addComponents(patenteMenu)]
      });
    }

    // 5. SELECIONOU PATENTE -> TELA DE REVISÃO
    if (interaction.isStringSelectMenu() && interaction.customId === 'selecionar_patente') {
      const patenteSelecionada = interaction.values[0];
      const dados = registros.get(interaction.user.id);

      if (!dados) return interaction.reply({ content: '❌ Seus dados de registro não foram encontrados. Tente novamente.', flags: [MessageFlags.Ephemeral] });

      dados.patente = patenteSelecionada;
      salvarRegistros();

      return interaction.update({
        content: `📋 **Tudo pronto!** Revise as informações principais:\n• Companhia: **${dados.companhia}**\n• Patente: **${patenteSelecionada}**\n\nClique no botão abaixo para despachar sua ficha para a banca avaliadora.`,
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('confirmar_registro')
              .setLabel('Enviar Ficha para Análise')
              .setStyle(ButtonStyle.Success)
              .setEmoji('✅')
          )
        ]
      });
    }

    // 6. CONFIRMAR E ENVIAR PARA APROVAÇÃO
    if (interaction.isButton() && interaction.customId === 'confirmar_registro') {
      const dados = registros.get(interaction.user.id);

      if (!dados) return interaction.reply({ content: '❌ Seus dados de registro não foram encontrados.', flags: [MessageFlags.Ephemeral] });

      const canal = interaction.guild.channels.cache.get(CANAL_APROVACAO);
      if (!canal) return interaction.reply({ content: '❌ Canal administrativo de aprovação não foi encontrado.', flags: [MessageFlags.Ephemeral] });

      const embed = new EmbedBuilder()
        .setTitle('⏳ AGUARDANDO APROVAÇÃO')
        .setDescription(`Uma nova ficha de incorporação foi enviada e necessita de validação imediata.`)
        .setColor('#eab308')
        .addFields(
          { name: '👤 Policial:', value: `<@${interaction.user.id}> (\`${interaction.user.id}\`)` },
          { name: '🪪 Nome de Guerra:', value: dados.nome, inline: true },
          { name: '🩸 Tipo Sanguíneo:', value: dados.tiposanguineo, inline: true },
          { name: '🔑 Autorizado por:', value: dados.autorizacao, inline: true },
          { name: '🛡️ Companhia:', value: dados.companhia, inline: true },
          { name: '🎖️ Patente Solicitada:', value: dados.patente, inline: true }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`aprovar_${interaction.user.id}`).setLabel('Aprovar Registro').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setCustomId(`negar_${interaction.user.id}`).setLabel('Recusar Registro').setStyle(ButtonStyle.Danger).setEmoji('❌')
      );

      await canal.send({ embeds: [embed], components: [row] });
      return interaction.update({ content: '✅ **Sua ficha foi enviada com sucesso!** Aguarde a avaliação dos Oficiais Superiores.', components: [] });
    }

    // 7. BOTÃO DE APROVAR
    if (interaction.isButton() && interaction.customId.startsWith('aprovar_')) {
      if (!interaction.member.roles.cache.has(CARGO_APROVADOR) && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ Você não tem a atribuição necessária para validar este registro.', flags: [MessageFlags.Ephemeral] });
      }

      const userId = interaction.customId.split('_')[1];
      const dados = registros.get(userId);

      if (!dados) return interaction.reply({ content: '❌ Dados cadastrais limpos do cache ou inválidos.', flags: [MessageFlags.Ephemeral] });

      try {
        const membro = await interaction.guild.members.fetch(userId);
        
        // Remove todos os cargos antigos do mapeamento para evitar duplicidade ou acúmulo
        const cargosParaRemover = TODOS_OS_CARGOS_MILITARES.filter(id => membro.roles.cache.has(id));
        if (cargosParaRemover.length > 0) {
          await membro.roles.remove(cargosParaRemover);
        }

        const rolesParaAdicionar = [];
        
        if (COMPANHIAS[dados.companhia]?.cargo) rolesParaAdicionar.push(COMPANHIAS[dados.companhia].cargo);
        if (PATENTES[dados.patente]?.cargo) rolesParaAdicionar.push(PATENTES[dados.patente].cargo);

        rolesParaAdicionar.push('1292571689946841217');

        const p = dados.patente;
        const deSoldadoAtuSubtenente = ["Soldado", "Cabo", "3° Sgt", "2° Sgt", "1° Sgt", "Subtenente"];
        const deSgtAtuSubtenente = ["3° Sgt", "2° Sgt", "1° Sgt", "Subtenente"];
        const deAspiranteAtuCoronel = ["Aspirante", "2° Tenente", "1° Tenente", "Capitão", "Major", "T.Coronel", "Coronel"];

        if (deSoldadoAtuSubtenente.includes(p)) {
          rolesParaAdicionar.push('1292571689946841213');
          rolesParaAdicionar.push('1292571689917354019');
        }

        if (deSgtAtuSubtenente.includes(p)) {
          rolesParaAdicionar.push('1292571689917354020');
        }

        if (deAspiranteAtuCoronel.includes(p)) {
          rolesParaAdicionar.push('1292571689946841215');
          rolesParaAdicionar.push('1292571689917354021');
        }

        if (p === "Al Soldado") {
          rolesParaAdicionar.push('1521632259478651020');
        }

        const cargosFiltrados = rolesParaAdicionar.filter(id => id && id.trim() !== "");
        if (cargosFiltrados.length > 0) {
          await membro.roles.add(cargosFiltrados);
        }

        const nick = `${dados.patente} PM. ${dados.nome} ${dados.tiposanguineo}`;
        await membro.setNickname(nick);
      } catch (err) {
        console.error("Erro ao aplicar cargos ou apelido:", err.message);
      }

      const canalAprovados = interaction.guild.channels.cache.get(CANAL_APROVADOS);
      if (canalAprovados) {
        const embedAprovado = new EmbedBuilder()
          .setTitle('✅ CORPORAÇÃO ATUALIZADA - INCORPORADO')
          .setColor('#22c55e')
          .setDescription(`O cidadão faz parte oficialmente do departamento militar.`)
          .addFields(
            { name: '👤 Operador:', value: `<@${userId}>` },
            { name: '🩸 Tipo Sanguíneo:', value: `\`${dados.tiposanguineo}\``, inline: true },
            { name: '🛡️ Companhia:', value: `**${dados.companhia}**`, inline: true },
            { name: '🎖️ Patente/Cargo:', value: `\`${dados.patente}\``, inline: true }
          )
          .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
          .setFooter({ text: `Aprovado por: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        await canalAprovados.send({ embeds: [embedAprovado] });
      }

      // Deleta o registro temporário para liberar nova criação limpa no futuro
      registros.delete(userId);
      salvarRegistros();

      return interaction.update({ content: `✅ O registro de <@${userId}> foi **aprovado**!`, components: [] });
    }

    // 8. BOTÃO DE NEGAR
    if (interaction.isButton() && interaction.customId.startsWith('negar_')) {
      if (!interaction.member.roles.cache.has(CARGO_APROVADOR) && !interaction.member.permissions.has('Administrator')) {
        return interaction.reply({ content: '❌ Você não tem autorização para recusar este registro.', flags: [MessageFlags.Ephemeral] });
      }

      const userId = interaction.customId.split('_')[1];
      const dados = registros.get(userId);

      const canalRecusados = interaction.guild.channels.cache.get(CANAL_RECUSADOS);
      if (canalRecusados && dados) {
        const embedRecusado = new EmbedBuilder()
          .setTitle('❌ SOLICITAÇÃO RECUSADA')
          .setColor('#ef4444')
          .setDescription(`A ficha de incorporação enviada não atende aos parâmetros exigidos.`)
          .addFields(
            { name: '👤 Candidato reprovado:', value: `<@${userId}>` },
            { name: '🪪 Nome enviado:', value: dados.nome, inline: true },
            { name: '🩸 Tipo Sanguíneo informado:', value: `\`${dados.tiposanguineo}\``, inline: true }
          )
          .setFooter({ text: `Recusado por: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp();

        await canalRecusados.send({ embeds: [embedRecusado] });
      }

      registros.delete(userId);
      salvarRegistros();
      return interaction.update({ content: `❌ O registro de <@${userId}> foi **recusado**.`, components: [] });
    }

  } catch (error) {
    console.error("Erro na execução da interação:", error);
  }
});

process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

client.login(process.env.TOKEN);
