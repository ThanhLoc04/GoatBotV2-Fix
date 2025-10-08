const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

module.exports = {
  config: {
    name: "help",
    version: "2.0",
    author: "Custom",
    countDown: 5,
    role: 0,
    description: {
      vi: "Xem danh sách lệnh theo nhóm",
      en: "View command list by category"
    },
    category: "info",
    guide: {
      vi: "{pn} [trống | <tên lệnh>]",
      en: "{pn} [empty | <command name>]"
    }
  },

  langs: {
    vi: {
      list: "Danh sách lệnh:\n\n%1\n\nHiện tại có tổng cộng %2 lệnh.\nGõ: %3help <tên lệnh> để xem chi tiết.",
      commandNotFound: "Không tìm thấy lệnh \"%1\"",
      commandInfo: "Tên lệnh: %1\nMô tả: %2\nTên khác: %3\nPhiên bản: %4\nQuyền hạn: %5\nThời gian chờ: %6s\nCách dùng:\n%7"
    },
    en: {
      list: "Command list:\n\n%1\n\nCurrently, there are %2 commands.\nType: %3help <command name> to view details.",
      commandNotFound: "Command \"%1\" not found",
      commandInfo: "Name: %1\nDescription: %2\nAlias: %3\nVersion: %4\nRole: %5\nCooldown: %6s\nUsage:\n%7"
    }
  },

  onStart: async function ({ message, args, event, threadsData, getLang }) {
    const langCode = await threadsData.get(event.threadID, "data.lang") || global.GoatBot.config.language;
    const prefix = getPrefix(event.threadID);

    const commandName = (args[0] || "").toLowerCase();
    let command = commands.get(commandName) || commands.get(aliases.get(commandName));

    // Nếu không có tên lệnh => hiện danh sách theo nhóm
    if (!commandName) {
      const categories = {};
      for (const [, cmd] of commands) {
        if (!categories[cmd.config.category]) {
          categories[cmd.config.category] = [];
        }
        categories[cmd.config.category].push(cmd.config.name);
      }

      let msg = "";
      for (const category in categories) {
        msg += `== ${category.toUpperCase()} ==\n${categories[category].sort().join(", ")}\n\n`;
      }

      return message.reply(getLang("list", msg.trim(), commands.size, prefix));
    }

    // Nếu có tên lệnh => hiện chi tiết
    if (!command) return message.reply(getLang("commandNotFound", commandName));

    const config = command.config;
    const aliasesStr = config.aliases ? config.aliases.join(", ") : "Không có";

    return message.reply(getLang(
      "commandInfo",
      config.name,
      config.description?.[langCode] || config.description?.en || "Không có",
      aliasesStr,
      config.version,
      config.role,
      config.countDown || 1,
      (config.guide?.[langCode] || config.guide?.en || "").replace(/\{pn\}/g, prefix + config.name)
    ));
  }
};