const fs = require("fs");
const path = require("path");

// Thư mục lưu shortcut theo box
const shortcutDir = path.join(__dirname, "..", "data", "shortcuts");
if (!fs.existsSync(shortcutDir)) {
  fs.mkdirSync(shortcutDir, { recursive: true });
}

// Load shortcut theo threadID
function loadShortcuts(threadID) {
  const file = path.join(shortcutDir, `${threadID}.json`);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

// Save shortcut theo threadID
function saveShortcuts(threadID, data) {
  const file = path.join(shortcutDir, `${threadID}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

module.exports = {
  config: {
    name: "shortcut",
    aliases: ["sc"],
    version: "1.8",
    author: "convert",
    role: 0,
    shortDescription: {
      vi: "Thêm, xóa, list shortcut (theo box, có file)",
      en: "Add, delete, list shortcuts (per group, with media)"
    },
    category: "group",
    guide: {
      en: "shortcut {sau khi hiện Reply tin nhắn nhập từ khoá thì ấn từ khoá. ví dụ Hi,...}\n-shortcut all {để xem list shortcut đã cài trước đó}\n-shortcut del 1 {để xoá shortcut thứ 1, hãy xem trong list trước khi xoá}"
    }
  },

  // ===== BẮT ĐẦU HOẶC XỬ LÝ DEL, LIST =====
  onStart: async function ({ args, message, event }) {
    let shortcuts = loadShortcuts(event.threadID);

   // Trong onStart...

if (args[0] === "del") {
  let inputs = args.slice(1);
  if (inputs.length === 0) {
    return message.reply("⚠️ Vui lòng nhập key hoặc số thứ tự để xoá (có thể nhập nhiều, cách nhau bằng dấu cách).");
  }

  let shortcuts = loadShortcuts(event.threadID);
  let keys = Object.keys(shortcuts);
  if (keys.length === 0) {
    return message.reply("📭 Nhóm này chưa có shortcut nào.");
  }

  let deleted = [];
  let notFound = [];

  // Tạo mảng chứa những index để xóa theo numeric, để xử lý từ cao xuống thấp
  let numeric = [];
  let textual = [];

  inputs.forEach(input => {
    if (!isNaN(input)) {
      numeric.push(parseInt(input, 10) - 1); // chuyển sang 0-based
    } else {
      textual.push(input.toLowerCase());
    }
  });

  // Xóa theo index: đảo chiều để không lệch vị trí
  numeric.sort((a, b) => b - a).forEach(idx => {
    if (idx >= 0 && idx < keys.length) {
      let key = keys[idx];
      delete shortcuts[key];
      deleted.push(`#${idx + 1} (${key})`);
    } else {
      notFound.push(`#${idx + 1}`);
    }
  });

  // Xóa theo key
  textual.forEach(key => {
    if (shortcuts[key]) {
      delete shortcuts[key];
      deleted.push(key);
    } else {
      notFound.push(key);
    }
  });

  if (deleted.length > 0) {
    saveShortcuts(event.threadID, shortcuts);
  }

  let replyMsg = "";
  if (deleted.length > 0) {
    replyMsg += `🗑️ Đã xoá: ${deleted.join(", ")}.\n`;
  }
  if (notFound.length > 0) {
    replyMsg += `⚠️ Không tìm thấy: ${notFound.join(", ")}.`;
  }
  return message.reply(replyMsg.trim());
}

    // LỆNH LIST
   if (args[0] === "list" || args[0] === "all") {
  let keys = Object.keys(shortcuts);
  if (keys.length === 0) {
    return message.reply("📭 Nhóm này chưa có shortcut nào.");
  }
  let msg = "📌 Danh sách shortcut trong nhóm:\n\n";
  keys.forEach((k, i) => {
    let sc = shortcuts[k];
    msg += `[${i + 1}] 🔑 ${k}\n` +
           `💬 ${sc.content}\n` +
           `👤 ${sc.authorName}\n` +
           `⏰ ${sc.time}\n` +
           `📎 File: ${sc.attachment.length}\n\n`;
  });
  return message.reply(msg.trim());
}
    // Nếu không có args thì bắt đầu tạo shortcut
    return message.reply("「Shortcut」 Hãy reply tin nhắn này để nhập từ khóa:", (err, info) => {
      if (err) return;
      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        author: event.senderID,
        type: "step1",
        data: {},
        threadID: event.threadID
      });
    });
  },

  // ===== NHẬN REPLY =====
  onReply: async function ({ event, message, Reply, usersData }) {
    if (event.senderID !== Reply.author) return;

    let shortcuts = loadShortcuts(Reply.threadID);

    switch (Reply.type) {
      case "step1": {
        Reply.data.key = event.body.trim().toLowerCase();
        return message.reply("「Shortcut」 Hãy reply tin nhắn này để nhập nội dung:", (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            author: event.senderID,
            type: "step2",
            data: Reply.data,
            threadID: Reply.threadID
          });
        });
      }

      case "step2": {
        Reply.data.content = event.body;
        return message.reply("「Shortcut」 Reply tin nhắn này để gửi file (ảnh/video/audio) hoặc nhập 's' nếu không có:", (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            author: event.senderID,
            type: "step3",
            data: Reply.data,
            threadID: Reply.threadID
          });
        });
      }

      case "step3": {
        let data = Reply.data;

        // Nếu không có file
        if (event.body && event.body.toLowerCase() === "s" && (!event.attachments || event.attachments.length === 0)) {
          data.attachment = [];
        } else {
          // Thư mục lưu file theo box
          const dir = path.join(__dirname, "..", "events", "shortcut", Reply.threadID);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

          data.attachment = [];

          for (let i = 0; i < (event.attachments || []).length; i++) {
            const att = event.attachments[i];
            let ext = "";

            if (att.type === "photo") ext = ".jpg";
            else if (att.type === "video") ext = ".mp4";
            else if (att.type === "audio") ext = ".mp3";

            const filePath = path.join(dir, `${Date.now()}_${i}${ext}`);
            const stream = await global.utils.getStreamFromURL(att.url);
            await new Promise((resolve, reject) => {
              const ws = fs.createWriteStream(filePath);
              stream.pipe(ws);
              ws.on("finish", resolve);
              ws.on("error", reject);
            });

            data.attachment.push(filePath);
          }
        }

        let name = (await usersData.getName(event.senderID)) || "Unknown";
        let time = new Date().toLocaleString("vi-VN");

        shortcuts[data.key] = {
          content: data.content,
          attachment: data.attachment,
          author: event.senderID,
          authorName: name,
          time
        };

        saveShortcuts(Reply.threadID, shortcuts);
        return message.reply(
          `✅ Đã thêm shortcut:\n\n🔑 Key: ${data.key}\n💬 Nội dung: ${data.content}\n👤 Người tạo: ${name}\n⏰ Thời gian: ${time}\n📎 File: ${data.attachment.length}`
        );
      }
    }
  },

  // ===== TỰ ĐỘNG TRẢ LỜI SHORTCUT =====
  onChat: async function ({ event, message, usersData }) {
    let shortcuts = loadShortcuts(event.threadID);
    let body = (event.body || "").toLowerCase();

    if (shortcuts[body]) {
      let sc = shortcuts[body];
      let senderName = await usersData.getName(event.senderID);

      // Thay {name} = tag người gọi
      let content = sc.content.replace(/{name}/g, senderName);

      return message.reply({
        body: content,
        attachment: (sc.attachment || []).map(p => fs.createReadStream(p)),
        mentions: [{ tag: senderName, id: event.senderID }]
      });
    }
  }
};