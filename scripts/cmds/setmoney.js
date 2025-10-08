module.exports = {
  config: {
    name: "setmoney",
    version: "1.0.1",
    author: "ntkiendz",
    countDown: 5,
    role: 2, // 🔒 Chỉ admin bot mới dùng được
    shortDescription: "Set số tiền cho người dùng",
    longDescription: "Admin bot có thể chỉnh số tiền của bản thân hoặc người khác (tag/reply).",
    category: "owner",
    guide: {
      en: "{p}setmoney <số tiền> [tag | reply]"
    }
  },

  onStart: async function ({ event, args, usersData, message }) {
    const { senderID, mentions, messageReply } = event;

    if (!args[0]) {
      return message.reply("⚡ Dùng: setmoney <số tiền> [tag hoặc reply]");
    }

    // --- Parse số tiền ---
    function parseMoney(input) {
      const units = {
        k: 10n ** 12n,
        m: 10n ** 15n,
        b: 10n ** 18n,
        kb: 10n ** 21n,
        mb: 10n ** 24n,
        gb: 10n ** 27n,
        g: 10n ** 36n
      };
      if (!isNaN(input)) return BigInt(input);
      let match = input.match(/^(\d+)([a-z]+)?$/i);
      if (!match) return null;
      let amount = BigInt(match[1]);
      let unit = match[2]?.toLowerCase();
      if (unit && units[unit]) amount *= units[unit];
      return amount;
    }

    let money = parseMoney(args[0]);
    if (!money || money < 0n) {
      return message.reply("⚡ Vui lòng nhập số tiền hợp lệ!");
    }

    // --- Xác định target ---
    let targetID = senderID;
    if (Object.keys(mentions).length > 0) {
      targetID = Object.keys(mentions)[0];
    } else if (messageReply) {
      targetID = messageReply.senderID;
    }

    // --- Set tiền ---
    let userData = await usersData.get(targetID);
    await usersData.set(targetID, {
      ...userData,
      money: Number(money)
    });

    let name = await usersData.getName(targetID);

    return message.reply(
      `✅ Admin đã set tiền của ${name} thành: ${money.toLocaleString("en-US")}$`
    );
  }
};