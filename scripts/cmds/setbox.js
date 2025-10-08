module.exports = {
  config: {
    name: "setbox",
    version: "1.1",
    author: "D-Jukie (converted by GPT)",
    countDown: 5,
    role: 2,
    shortDescription: "Cập nhật dữ liệu box",
    longDescription: "Cập nhật thông tin tất cả các box hiện có vào database của bot",
    category: "owner",
    guide: "{p}setbox"
  },

  onStart: async function ({ api, threads, message }) {
    try {
      // Lấy danh sách thread (INBOX)
      const inbox = await api.getThreadList(100, null, ["INBOX"]);
      let groupList = inbox.filter(group => group.isGroup && group.isSubscribed);

      let updated = 0;
      for (const group of groupList) {
        try {
          const threadInfo = await api.getThreadInfo(group.threadID);
          await threads.set(group.threadID, { threadInfo });
          updated++;
        } catch (err) {
          console.error(`❌ Lỗi khi cập nhật box ${group.threadID}:`, err.message);
        }
      }

      return message.reply(`✅ Đã cập nhật dữ liệu của ${updated}/${groupList.length} box`);
    } catch (e) {
      console.error(e);
      return message.reply("❌ Đã xảy ra lỗi lớn khi cập nhật dữ liệu box.");
    }
  }
};