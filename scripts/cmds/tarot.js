const axios = require("axios");

module.exports.config = {
  name: "tarot",
  version: "0.0.1",
  credits: "Raiku ? (convert: GPT)",
  description: "Bói bài tarot",
  commandCategory: "box chat",
  cooldown: 5,
  nopre: true,
  category: "box chat"
};

module.exports.onStart = async function ({ message, args }) {
  try {
    // Lấy dữ liệu tarot từ GitHub
    const c = (await axios.get("https://raw.githubusercontent.com/ThanhAli-Official/tarot/main/data.json")).data;

    // Nếu có args[0] thì lấy theo số, nếu không thì random
    let k;
    if (!args[0]) {
      k = Math.floor(Math.random() * c.length);
    } else {
      if (isNaN(args[0]) || args[0] >= c.length) {
        return message.reply("❌ Không thể vượt quá số lá bài trong hệ thống dữ liệu.");
      }
      k = parseInt(args[0]);
    }

    const x = c[k];

    // Tải ảnh
    const t = (await axios.get(x.image, { responseType: "stream" })).data;

    // Soạn tin nhắn
    const msg = {
      body:
        `━━━━━━ [ Bói bài tarot ] ━━━━━━\n\n` +
        `→ Tên lá bài: ${x.name}\n` +
        `→ Thuộc bộ: ${x.suite}\n` +
        `→ Mô tả: ${x.vi.description}\n` +
        `→ Diễn dịch: ${x.vi.interpretation}\n` +
        `→ Bài ngược: ${x.vi.reversed}`,
      attachment: t
    };

    return message.reply(msg);
  } catch (e) {
    return message.reply("⚠️ Đã xảy ra lỗi: " + e.message);
  }
};