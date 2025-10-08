const afkData = new Map();

module.exports = {
  config: {
    name: "afk",
    version: "2.0",
    author: "D-Jukie | Convert: GPT",
    countDown: 5,
    role: 0,
    description: {
      vi: "Bật chế độ AFK trong nhóm",
      en: "Enable AFK mode in group"
    },
    category: "box chat",
    guide: {
      vi: "{pn} <lý do>",
      en: "{pn} <reason>"
    }
  },

  // Khi gọi lệnh afk
  onStart: async function ({ message, event, args }) {
    const { threadID, senderID } = event;
    if (!afkData.has(threadID)) afkData.set(threadID, []);
    const afkList = afkData.get(threadID);

    const reason = args.join(" ") || "Không có lý do";
    afkList.push({ userID: senderID, reason, isAfk: true, mentions: [] });

    afkData.set(threadID, afkList);
    return message.reply(`Bạn đã bật chế độ AFK\nLý do: ${reason}`);
  },

  // Xử lý khi có tin nhắn trong box
  onChat: async function ({ message, event, usersData }) {
    const { threadID, senderID, body, mentions } = event;
    if (!afkData.has(threadID)) return;
    const afkList = afkData.get(threadID);

    // Nếu ai đó bị tag và đang AFK
    if (mentions && Object.keys(mentions).length > 0) {
      for (const uid of Object.keys(mentions)) {
        const target = afkList.find(x => x.userID == uid && x.isAfk);
        if (target) {
          const name = await usersData.getName(uid);
          message.reply(
            `Người dùng ${name} hiện đang AFK\nLý do: ${target.reason}`
          );
          target.mentions.push({ from: senderID, content: body });
        }
      }
    }

    // Nếu chính người AFK gửi tin nhắn → thoát AFK
    const userAfk = afkList.find(x => x.userID == senderID && x.isAfk);
    if (userAfk) {
      userAfk.isAfk = false;
      let msg = `Chào mừng bạn đã trở lại!\n`;
      msg += `Có ${userAfk.mentions.length} người đã tag bạn khi AFK:\n\n`;

      for (const m of userAfk.mentions) {
        const name = await usersData.getName(m.from);
        msg += `- ${name}: ${m.content}\n`;
      }

      // Xoá người AFK khỏi danh sách
      const index = afkList.findIndex(x => x.userID == senderID);
      afkList.splice(index, 1);
      afkData.set(threadID, afkList);

      return message.reply(msg);
    }
  }
};