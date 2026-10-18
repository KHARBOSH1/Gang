require("dotenv").config();
const { Client, GatewayIntentBits, Collection } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { initLogger, logInfo, logError } = require("./utils/logger");
const { checkBadWords } = require("./core/badWords");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

initLogger(client);

client.commands = new Collection();

const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const mod = require(path.join(__dirname, "commands", file));

  // يدعم الملفات التي تصدر أمراً واحداً (data + execute)
  if (mod.data && mod.execute) {
    client.commands.set(mod.data.name, mod);
  }

  // يدعم الملفات التي تصدر عدة أوامر (commands: [])
  if (mod.commands && Array.isArray(mod.commands)) {
    for (const cmd of mod.commands) {
      if (cmd.data && cmd.execute) {
        client.commands.set(cmd.data.name, cmd);
      }
    }
  }
}

client.once("ready", () => {
  logInfo(
    `البوت متصل: ${client.user.tag} | عدد السيرفرات: ${client.guilds.cache.size}`
  );
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  await checkBadWords(message);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    logError(`خطأ في الأمر ${interaction.commandName}: ${err.message}`);
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({ content: "حدث خطأ أثناء التنفيذ.", ephemeral: true })
        .catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);