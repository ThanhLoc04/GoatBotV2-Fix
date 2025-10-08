const fs = require("fs");
const path = require("path");

const userPath = path.join(__dirname, "dataserver.json");   // lưu số tin nhắn từng user
const threadPath = path.join(__dirname, "databox.json");    // lưu số tin nhắn từng box

// In-memory caches to avoid frequent heavy JSON stringify on each message
// and to mitigate RangeError: Invalid string length when files get too large
let inMemoryUserCounts = null;
let inMemoryThreadCounts = null;
let flushTimer = null;
const FLUSH_INTERVAL_MS = 30_000; // batch writes every 30s

function safeEnsureFile(file) {
  try {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "{}", "utf8");
  } catch {}
}

function safeReadJson(file) {
  try {
    safeEnsureFile(file);
    const content = fs.readFileSync(file, "utf8");
    if (!content || content.trim() === "") return {};
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // If corrupted, back up and reset
    try {
      const backup = `${file}.bak`;
      fs.copyFileSync(file, backup);
    } catch {}
    try {
      fs.writeFileSync(file, "{}", "utf8");
    } catch {}
    return {};
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    try {
      // Write compact JSON (no pretty print) to limit file size
      if (inMemoryThreadCounts) {
        fs.writeFileSync(threadPath, JSON.stringify(inMemoryThreadCounts), "utf8");
      }
      if (inMemoryUserCounts) {
        fs.writeFileSync(userPath, JSON.stringify(inMemoryUserCounts), "utf8");
      }
    } catch {
      // Swallow write errors to keep bot running; will try next flush
    } finally {
      flushTimer = null;
    }
  }, FLUSH_INTERVAL_MS);
}

function initCachesIfNeeded() {
  if (!inMemoryThreadCounts) inMemoryThreadCounts = safeReadJson(threadPath);
  if (!inMemoryUserCounts) inMemoryUserCounts = safeReadJson(userPath);
}

module.exports = {
  config: {
    name: "top",
    version: "1.3.5",
    author: "JRT mod by Niiozic | fix by ntkiendz | edit by bạn",
    countDown: 5,
    role: 0,
    shortDescription: "Xem bảng xếp hạng",
    longDescription: "Xem top money, top user, top thread",
    category: "group",
    guide: "{pn} [money | user | thread]"
  },

  // Ghi nhận tin nhắn cho cả user và thread
  onChat: ({ event }) => {
    initCachesIfNeeded();

    // Đếm tin nhắn box (in-memory, flush batched)
    const threadID = event.threadID;
    if (!inMemoryThreadCounts[threadID]) inMemoryThreadCounts[threadID] = 0;
    inMemoryThreadCounts[threadID] += 1;

    // Đếm tin nhắn user (in-memory, flush batched)
    const senderID = event.senderID;
    if (!inMemoryUserCounts[senderID]) inMemoryUserCounts[senderID] = 0;
    inMemoryUserCounts[senderID] += 1;

    // Batch write to disk to avoid large stringify on every message
    scheduleFlush();
  },

  onStart: async function ({ message, event, args, usersData, threadsData }) {
    const { senderID } = event;

    if (!args[0]) {
      return message.reply(
        "Bạn có thể dùng:\n\n" +
        "• top money → Top giàu nhất nhóm hoặc server\n" +
        "• top user → Top nói nhiều nhất server\n" +
        "• top thread → Top box nhiều tin nhắn nhất"
      );
    }

    // ================= TOP MONEY =================
    if (args[0] === "money") {
      return message.reply(
        "Chọn kiểu hiển thị:\n\n" +
        "1. Top 10 người giàu nhất nhóm\n" +
        "2. Top 10 người giàu nhất server\n\n" +
        "» Reply số để chọn",
        (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: this.config.name,
            type: "money",
            authorID: senderID
          });
        }
      );
    }

    // ================= TOP USER =================
    if (args[0] === "user") {
      initCachesIfNeeded();
      const userData = inMemoryUserCounts || {};
      let sorted = Object.entries(userData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (sorted.length === 0) return message.reply("Chưa có dữ liệu.");

      let msg = "🏆 Top 10 nói nhiều nhất server:\n\n";
      let i = 1;
      for (const [uid, count] of sorted) {
        let name;
        try {
          name = await usersData.getName(uid);
          if (!name) name = "Người dùng bị khóa";
        } catch {
          name = "Người dùng bị khóa";
        }
        msg += `${i++}. ${name}: ${count.toLocaleString()} tin nhắn\n`;
      }
      return message.reply(msg);
    }

    // ================= TOP THREAD =================
    if (args[0] === "thread") {
      initCachesIfNeeded();
      const data = inMemoryThreadCounts || {};
      let sorted = Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (sorted.length === 0) return message.reply("Chưa có dữ liệu.");

      let msg = "🏆 Top 10 box nhiều tin nhắn nhất:\n\n";
      let i = 1;
      for (const [tid, count] of sorted) {
        let name;
        try {
          name = await threadsData.getName(tid);
          if (!name) {
            const info = await threadsData.get(tid);
            name = info?.name || `Box ${tid}`;
          }
        } catch {
          name = `Box ${tid}`;
        }
        msg += `${i++}. ${name}: ${count.toLocaleString()} tin nhắn\n`;
      }
      return message.reply(msg);
    }
  },

  // Handle reply cho top money
  onReply: async function ({ event, Reply, message, usersData, threadsData }) {
    const { body, senderID, threadID } = event;
    if (senderID !== Reply.authorID) return;

    if (Reply.type === "money") {
      const choice = parseInt(body);
      const allUsers = await usersData.getAll();

      if (choice === 1) {
        // Top 10 giàu nhất nhóm
        const threadInfo = await threadsData.get(threadID);
        const members = threadInfo.members.map(m => m.userID);

        let sorted = allUsers
          .filter(u => members.includes(u.userID) && u.money > 0)
          .sort((a, b) => b.money - a.money)
          .slice(0, 10);

        if (sorted.length === 0) return message.reply("Nhóm chưa có ai có tiền.");
        let msg = "💰 Top 10 giàu nhất nhóm:\n\n";
        let i = 1;
        for (const u of sorted) {
          msg += `${i++}. ${u.name}: ${u.money.toLocaleString()}$\n`;
        }
        return message.reply(msg);
      }

      if (choice === 2) {
        // Top 10 giàu nhất server
        let sorted = allUsers
          .filter(u => u.money > 0)
          .sort((a, b) => b.money - a.money)
          .slice(0, 10);

        if (sorted.length === 0) return message.reply("Server chưa có ai có tiền.");
        let msg = "💰 Top 10 giàu nhất server:\n\n";
        let i = 1;
        for (const u of sorted) {
          msg += `${i++}. ${u.name}: ${u.money.toLocaleString()}$\n`;
        }
        return message.reply(msg);
      }

      return message.reply("Lựa chọn không hợp lệ.");
    }
  }
};

// Ensure data is flushed on process exit
process.on("beforeExit", () => {
  try {
    if (inMemoryThreadCounts) {
      fs.writeFileSync(threadPath, JSON.stringify(inMemoryThreadCounts), "utf8");
    }
    if (inMemoryUserCounts) {
      fs.writeFileSync(userPath, JSON.stringify(inMemoryUserCounts), "utf8");
    }
  } catch {}
});