const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const CLIENT_ID = '1500412614608551936';
const GUILD_ID = '1500373670990712852';

const commands = [
  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Enviar painel')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
  console.log('Comando registrado!');
})();
