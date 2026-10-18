require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandFiles = fs
  .readdirSync(path.join(__dirname, "commands"))
  .filter((f) => f.endsWith(".js"));

for (const file of commandFiles) {
  const mod = require(path.join(__dirname, "commands", file));

  // ملف يصدر أمراً واحداً
  if (mod.data) {
    commands.push(mod.data.toJSON());
  }

  // ملف يصدر عدة أوامر
  if (mod.commands && Array.isArray(mod.commands)) {
    for (const cmd of mod.commands) {
      if (cmd.data) {
        commands.push(cmd.data.toJSON());
      }
    }
  }
}

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
      body: commands,
    });
    console.log("تم تسجيل الأوامر العامة بنجاح (قد تستغرق المزامنة بعض الوقت)");
  } catch (err) {
    console.error(err);
  }
})();