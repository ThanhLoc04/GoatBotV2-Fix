const fs = require("fs");
const path = __dirname + "/countData/";
const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "count",
    aliases: ["interaction"],
    version: "1.4.0",
    author: "DungUwU & Nghĩa | Convert & Fix: TKiendz | Update: ChatGPT",
    countDown: 5,
    role: 0,
    shortDescription: { vi: "Xem thống kê tin nhắn" },
    longDescription: { vi: "Thống kê tin nhắn cá nhân hoặc nhóm (all, month, week, day, reset, lọc)" },
    category: "box chat",
    guide: { vi: "{pn} [all|month|week|day|reset|lọc <số>]" }
  },

  // Tạo thư mục dữ liệu nếu chưa có
  onLoad: function () {
    if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });

    // Reset theo ngày, tuần, tháng (check mỗi phút)
    setInterval(() => {
      const today = moment.tz("Asia/Ho_Chi_Minh").date();   // ngày
      const week = moment.tz("Asia/Ho_Chi_Minh").week();    // tuần
      const month = moment.tz("Asia/Ho_Chi_Minh").month();  // tháng (0-11)
      const files = fs.readdirSync(path);

      for (const file of files) {
        try {
          let data = JSON.parse(fs.readFileSync(path + file));
          let changed = false;
          let notifyMsg = "";

          // Khởi tạo nếu dữ liệu cũ thiếu
          data.day = data.day || [];
          data.week = data.week || [];
          data.month = data.month || [];
          data.total = data.total || [];
          data.lastDay = data.lastDay || today;
          data.lastWeek = data.lastWeek || week;
          data.lastMonth = data.lastMonth || month;

          // Reset ngày
          if (data.lastDay != today) {
            data.day = data.day.map(e => ({ id: e.id, count: 0 }));
            data.lastDay = today;
            changed = true;
            notifyMsg += "📅 Đã reset thống kê ngày mới!\n";
          }

          // Reset tuần
          if (data.lastWeek != week) {
            data.week = data.week.map(e => ({ id: e.id, count: 0 }));
            data.lastWeek = week;
            changed = true;
            notifyMsg += "📆 Đã reset thống kê tuần mới!\n";
          }

          // Reset tháng
          if (data.lastMonth != month) {
            data.month = data.month.map(e => ({ id: e.id, count: 0 }));
            data.lastMonth = month;
            changed = true;
            notifyMsg += "🗓️ Đã reset thống kê tháng mới!\n";
          }

          if (changed) {
            fs.writeFileSync(path + file, JSON.stringify(data, null, 2));

            // Thông báo vào nhóm
            const threadID = file.replace(".json", "");
            try { global.api.sendMessage("🔥 " + notifyMsg.trim(), threadID); } catch {}
          }
        } catch {
          fs.unlinkSync(path + file);
        }
      }
    }, 60 * 1000);
  },

  // Theo dõi tin nhắn để cộng điểm
  onChat: function ({ event, message }) {
    try {
      if (!event.isGroup) return;
      const { threadID, senderID, participantIDs } = event;

      if (senderID == message.botID) return; // ❌ Không đếm bot

      const today = moment.tz("Asia/Ho_Chi_Minh").date();
      const week = moment.tz("Asia/Ho_Chi_Minh").week();
      const month = moment.tz("Asia/Ho_Chi_Minh").month();
      const filePath = path + threadID + ".json";

      let data;
      if (!fs.existsSync(filePath)) {
        data = {
          total: [],
          month: [],
          week: [],
          day: [],
          lastDay: today,
          lastWeek: week,
          lastMonth: month
        };
      } else {
        data = JSON.parse(fs.readFileSync(filePath));
        // Khởi tạo nếu file cũ thiếu
        data.total = data.total || [];
        data.day = data.day || [];
        data.week = data.week || [];
        data.month = data.month || [];
        data.lastDay = data.lastDay || today;
        data.lastWeek = data.lastWeek || week;
        data.lastMonth = data.lastMonth || month;
      }

      // Thêm người mới
      for (let user of participantIDs) {
        ["total", "month", "week", "day"].forEach(type => {
          if (!data[type].some(e => e.id == user)) data[type].push({ id: user, count: 0 });
        });
      }

      // Tăng điểm cho người gửi
      ["total", "month", "week", "day"].forEach(type => {
        let idx = data[type].findIndex(e => e.id == senderID);
        if (idx == -1) data[type].push({ id: senderID, count: 1 });
        else data[type][idx].count++;
      });

      // Xóa người rời nhóm
      data.total = data.total.filter(e => participantIDs.includes(e.id));
      data.month = data.month.filter(e => participantIDs.includes(e.id));
      data.week = data.week.filter(e => participantIDs.includes(e.id));
      data.day = data.day.filter(e => participantIDs.includes(e.id));

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {}
  },

  // Khi dùng lệnh
  onStart: async function ({ message, event, args, usersData, threadsData }) {
    const { threadID, senderID, mentions, messageReply } = event;
    const query = args[0] ? args[0].toLowerCase() : "";
    const filePath = path + threadID + ".json";

    if (!fs.existsSync(filePath)) return message.reply("⚠️ Nhóm chưa có dữ liệu.");
    let data = JSON.parse(fs.readFileSync(filePath));

    // Khởi tạo các trường nếu file cũ thiếu
    data.total = data.total || [];
    data.day = data.day || [];
    data.week = data.week || [];
    data.month = data.month || [];

    // Reset
    if (query == "reset") {
      const threadInfo = await threadsData.get(threadID);
      if (!threadInfo.adminIDs.some(e => e.id == senderID))
        return message.reply("❎ Bạn không đủ quyền để reset.");
      fs.unlinkSync(filePath);
      return message.reply("✅ Đã reset dữ liệu tương tác của nhóm.");
    }

    // Lọc
    if (query == "lọc") {
      if (!args[1] || isNaN(args[1])) return message.reply("⚠️ Nhập số tin nhắn tối thiểu.");
      let minCount = +args[1], removed = [];
      for (let user of event.participantIDs) {
        if (user == message.botID) continue;
        let userData = data.total.find(e => e.id == user);
        if (!userData || userData.count <= minCount) {
          try {
            await message.api.removeUserFromGroup(user, threadID);
            removed.push(user);
          } catch {}
        }
      }
      return message.reply(`✅ Đã lọc ${removed.length} thành viên.`);
    }

    // Nếu gõ count @tag hoặc reply
    if (Object.keys(mentions).length > 0 || messageReply) {
      const UID = messageReply ? messageReply.senderID : Object.keys(mentions)[0];
      return sendUserStats(UID);
    }

    // Nếu gõ count all/month/week/day → bảng tổng
    if (["all", "month", "week", "day"].includes(query)) {
      let storage =
        query == "all" ? (data.total || []) :
        query == "month" ? (data.month || []) :
        query == "week" ? (data.week || []) :
        (data.day || []);

      for (let item of storage) item.name = await usersData.getName(item.id) || "Facebook User";
      storage.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

      let header =
        query == "all" ? "[ COUNT ALL ]" :
        query == "month" ? "[ COUNT MONTH ]" :
        query == "week" ? "[ COUNT WEEK ]" : "[ COUNT DAY ]";

      let body = storage.map((u, i) => `${i + 1}. ${u.name} (${u.count})`).join("\n");
      let footer = `↠ Tổng tin nhắn: ${storage.reduce((a, b) => a + b.count, 0)}`;
      return message.reply(`${header}\n${body}\n${footer}`);
    }

    // Nếu chỉ gõ count → xem của bản thân
    return sendUserStats(senderID);

    async function sendUserStats(UID) {
      const name = await usersData.getName(UID) || "Facebook User";
      const total = (data.total || []).find(e => e.id == UID)?.count || 0;
      const month = (data.month || []).find(e => e.id == UID)?.count || 0;
      const week = (data.week || []).find(e => e.id == UID)?.count || 0;
      const day = (data.day || []).find(e => e.id == UID)?.count || 0;
      let rankList = [...(data.total || [])].sort((a, b) => b.count - a.count);
      const rank = rankList.findIndex(e => e.id == UID) + 1;
      return message.reply(
        `👤 ${name}\n📅 Ngày: ${day}\n📆 Tuần: ${week}\n🗓️ Tháng: ${month}\n🏆 Hạng: ${rank}\n✉️ Tổng: ${total}`
      );
    }
  }
};