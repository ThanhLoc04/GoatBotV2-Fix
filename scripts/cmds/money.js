module.exports = {
  config: {
    name: "money",
    version: "1.0.0",
    author: "ntkiendz ",
    countDown: 5,
    role: 0,
    shortDescription: "Xem số tiền",
    longDescription: "Kiểm tra số tiền của bản thân hoặc người được tag/reply",
    category: "bank",
    guide: "{p}money [tag | reply]"
  },

  // Hàm định dạng tiền
  formatMoney(money) {
    try {
      let m = BigInt(money || 0);
      const units = [
        { value: 36n, label: "g" },
        { value: 27n, label: "gb" },
        { value: 24n, label: "mb" },
        { value: 21n, label: "kb" },
        { value: 18n, label: "b" },
        { value: 15n, label: "m" },
        { value: 12n, label: "k" }
      ];

      const full = m.toLocaleString("en-US");
      for (let u of units) {
        if (m >= 10n ** u.value) {
          return `${full}$ (${u.label})`;
        }
      }
      return `${full}$`;
    } catch {
      return "0$";
    }
  },

  onStart: async function ({ message, event, usersData, currenciesData }) {
    const { senderID, messageReply, mentions, threadID } = event;
    const mentionIDs = Object.keys(mentions || {});
    let targetID;

    // Reply → lấy người bị reply
    if (messageReply) {
      targetID = messageReply.senderID;
    }
    // Mention → lấy người được tag
    else if (mentionIDs.length === 1) {
      targetID = mentionIDs[0];
    }
    // Không có → chính mình
    else {
      targetID = senderID;
    }

    try {
      // Lấy tên
      let name = await usersData.getName(targetID);

      // Lấy tiền (usersData hoặc currenciesData)
      let data = {};
      if (currenciesData?.get) data = await currenciesData.get(targetID);
      else if (usersData?.get) data = await usersData.get(targetID);
      let money = data?.money ?? 0;

      // Format
      const formatted = this.formatMoney(money);

      // Trả kết quả
      if (targetID === senderID) {
        return message.reply(`💰 Số tiền bạn đang có: ${formatted}`);
      } else {
        return message.reply({
          body: `💰 Số tiền của ${name} hiện đang có: ${formatted}`,
          mentions: [{ tag: name, id: targetID }]
        });
      }
    } catch (e) {
      console.error(e);
      return message.reply("❎ Không thể lấy thông tin tiền!");
    }
  }
};