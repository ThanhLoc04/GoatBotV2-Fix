const fs = require("fs");
const path = require("path");
const axios = require("axios");

const dataPath = path.join(__dirname, "data", "dataResend.json");

// Hàm đọc file JSON
function readData() {
  try {
    return JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    return {}; // nếu file trống hoặc chưa tồn tại
  }
}

// Hàm ghi file JSON
function writeData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

module.exports = {
  config: {
    name: "resend",
    version: "6.0",
    author: "ntkiendz",
    countDown: 1,
    role: 2,
    shortDescription: {
      vi: "Chống thu hồi, lưu dữ liệu ra file JSON"
    },
    longDescription: {
      vi: "Bật/tắt chống thu hồi. Lưu tin nhắn + file đính kèm vào dataResend.json để không mất dữ liệu khi restart bot."
    },
    category: "Qtv",
    guide: {
      vi: "{pn}\nVí dụ: -resend"
    },
    envConfig: { deltaNext: 5 }
  },

  onStart: async function ({ api, message, event, threadsData }) {
    let current = await threadsData.get(event.threadID, "settings.reSend");
    if (current === undefined) current = false;

    const newState = !current;
    await threadsData.set(event.threadID, newState, "settings.reSend");

    // Đảm bảo có trường trong file JSON
    const data = readData();
    if (!data[event.threadID]) data[event.threadID] = [];
    writeData(data);

    return message.reply(
      newState
        ? "✅ Đã BẬT chế độ chống thu hồi."
        : "❌ Đã TẮT chế độ chống thu hồi."
    );
  },

  onChat: async function ({ api, threadsData, usersData, event }) {
    const resend = await threadsData.get(event.threadID, "settings.reSend");
    if (!resend) return;

    const data = readData();

    // Nếu có tin nhắn mới: lưu body + attachments
    if (event.type === "message") {
      if (!data[event.threadID]) data[event.threadID] = [];

      data[event.threadID].push({
        messageID: event.messageID,
        senderID: event.senderID,
        body: event.body || "",
        attachments: event.attachments || []
      });

      // Giới hạn 50 tin mỗi nhóm
      if (data[event.threadID].length > 50)
        data[event.threadID].shift();

      writeData(data);
    }

    // Nếu có thu hồi
    if (event.type === "message_unsend") {
      const store = data[event.threadID];
      if (!store) return;

      const msg = store.find(m => m.messageID === event.messageID);
      if (!msg) return;

      let userName = "Người dùng";
      try {
        const name = await usersData.getName(msg.senderID);
        if (name) userName = name;
      } catch {}

      // Tải lại file đính kèm (ảnh, video, gif, audio…)
      const files = [];
      for (const att of msg.attachments) {
        try {
          const res = await axios.get(att.url, { responseType: "stream" });
          files.push(res.data);
        } catch {}
      }

      api.sendMessage(
        {
          body: msg.body
            ? `📢 ${userName} đã thu hồi 1 tin nhắn\nNội dung: ${msg.body}`
            : `📢 ${userName} đã thu hồi 1 tin nhắn (không có nội dung văn bản).`,
          attachment: files.length > 0 ? files : undefined
        },
        event.threadID
      );
    }
  }
};