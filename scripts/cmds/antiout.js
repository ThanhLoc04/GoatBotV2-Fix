const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "antiout",
    version: "1.4",
    author: "AceGun + mod by ChatGPT",
    countDown: 5,
    role: 1,
    shortDescription: "Bật/Tắt chống out, kiểm tra hoặc xem danh sách",
    longDescription: "Nếu ai đó out sẽ bị bot tự động thêm lại box.",
    category: "box chat",
    guide: "{pn} [check | list]"
  },

  onStart: async function ({ message, event, args, api }) {
    const dir = path.join(__dirname, "data");
    const filePath = path.join(dir, "antiout.json");

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}, null, 2));

    let data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    let threadID = event.threadID;

    // Nếu gõ check → chỉ báo trạng thái
    if (args[0] && args[0].toLowerCase() === "check") {
      let status = data[threadID] === true;
      return message.reply(
        `⚙️ Trạng thái Antiout hiện tại của box: ${status ? "✅ Bật" : "❌ Tắt"}`
      );
    }

    // Nếu gõ list → liệt kê tất cả box bật antiout
    if (args[0] && args[0].toLowerCase() === "list") {
      let activeThreads = Object.keys(data).filter(id => data[id] === true);

      if (activeThreads.length === 0) {
        return message.reply("📂 Hiện không có box nào bật Antiout.");
      }

      let msg = "📌 Danh sách box đang bật Antiout:\n\n";
      for (let tid of activeThreads) {
        try {
          let info = await api.getThreadInfo(tid);
          msg += `- ${info.threadName || "Tên không xác định"} (ID: ${tid})\n`;
        } catch (e) {
          msg += `- (Không lấy được tên) ID: ${tid}\n`;
        }
      }

      return message.reply(msg);
    }

    // Nếu không có check/list → toggle (bật/tắt xen kẽ)
    let newStatus = !(data[threadID] === true);
    data[threadID] = newStatus;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return message.reply(`🔄 Antiout đã được ${newStatus ? "✅ BẬT" : "❌ TẮT"} cho box này.`);
  },

  onEvent: async function ({ api, event }) {
    if (event.logMessageType !== "log:unsubscribe") return;

    const filePath = path.join(__dirname, "data", "antiout.json");
    if (!fs.existsSync(filePath)) return;

    let data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    let threadID = event.threadID;
    let antiout = data[threadID];

    if (!antiout) return;

    const userId = event.logMessageData.leftParticipantFbId;

    // Nếu bot out thì bỏ qua
    if (userId === api.getCurrentUserID()) return;

    try {
      await api.addUserToGroup(userId, threadID);
      api.sendMessage("🚫 Không được phép out! Bạn đã được thêm lại box.", threadID);
    } catch (err) {
      api.sendMessage(`⚠️ Không thể thêm lại user ID: ${userId} (có thể họ đã chặn bot hoặc box đã full).`, threadID);
    }
  }
};