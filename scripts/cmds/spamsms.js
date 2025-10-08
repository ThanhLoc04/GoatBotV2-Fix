const axios = require("axios");

let isSpamming = false;

module.exports = {
  config: {
    name: "spamsms",
    version: "4.1.4",
    author: "Vũ Minh Nghĩa (convert by ChatGPT)",
    countDown: 0,
    role: 0,
    shortDescription: "Spam SMS",
    longDescription: "Spam SMS đến số điện thoại",
    category: "Tiện ích",
    guide: "{p}spamsms [số điện thoại] [số lần]\n{p}spamsms stop",
	money: 500000000000000000000000
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, senderID, messageID } = event;
    const PREFIX = global.GoatBot.config.prefix;

    // Lấy tiền user
    const userData = await usersData.get(senderID);
    let moneyUser = userData.money || 0;

    // Kiểm tra stop
    if (args[0] === "stop") {
      if (isSpamming) {
        isSpamming = false;
        return api.sendMessage("✅ Đã dừng spam thành công", threadID, messageID);
      } else {
        return api.sendMessage("⚠️ Bot hiện không trong quá trình spam", threadID, messageID);
      }
    }

    const phoneNumber = args[0];
    const numberOfSpams = parseInt(args[1], 10);

    if (!phoneNumber || !numberOfSpams) {
      return api.sendMessage(
        `💰 Bạn cần 500,000,000,000,000,000,000,000$ để spam!`,
        threadID,
        messageID
      );
    }

    if (numberOfSpams > 100 || numberOfSpams < 1) {
      return api.sendMessage("❌ Số lần spam phải từ 1 đến 100", threadID, messageID);
    }

    if (this.config.author !== "Vũ Minh Nghĩa (convert by ChatGPT)") {
      return api.sendMessage("⚠️ Credits đã bị thay đổi", threadID, messageID);
    }

    if (moneyUser < 500000000000000000000000) {
      return api.sendMessage("💰 Bạn cần 500,000,000,000,000,000,000,000$ để spam!", threadID, messageID);
    }

    // Trừ tiền
    await usersData.set(senderID, { money: moneyUser - 500000000000000000000000 });

    api.sendMessage(
      `💸 Đã trừ  500,000,000,000,000,000,000,000$ để spam ${numberOfSpams} lần cho số điện thoại: ${phoneNumber}`,
      threadID
    );

    isSpamming = true;
    let spamCount = 0, errorCount = 0;

    for (let i = 0; i < numberOfSpams && isSpamming; i++) {
      await delay(2000);
      try {
        await axios.get(`https://spam.niio-zic.repl.co/?phone=${phoneNumber}`);
        spamCount++;
      } catch (err) {
        console.log(err);
        errorCount++;
      }
    }

    isSpamming = false;
    api.sendMessage(`✅ Spam thành công ${spamCount} lần`, threadID);
    if (errorCount > 0) {
      api.sendMessage(`⚠️ Có ${errorCount} lỗi xảy ra khi spam`, threadID);
    }
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}