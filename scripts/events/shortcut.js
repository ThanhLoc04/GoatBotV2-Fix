const { getStreamFromURL } = global.utils;

module.exports = {
  config: {
    name: "shortcut",
    eventType: ["message"],
    version: "1.0",
    author: "Custom",
    description: "Tự động phản hồi shortcut",
    category: "events"
  },

  onStart: async function ({ }) {},

  onEvent: async function ({ event, message, threadsData }) {
    const { threadID, body } = event;
    if (!body) return;

    const text = body.toLowerCase();
    const shortcuts = await threadsData.get(threadID, "data.shortcut", []);
    const found = shortcuts.find(s => s.key === text);

    if (found) {
      let attachments = [];
      if (found.attachments.length > 0) {
        for (const att of found.attachments) {
          try {
            attachments.push(await getStreamFromURL(att.url));
          } catch (e) {
            console.error("Lỗi lấy file shortcut:", e);
          }
        }
      }

      return message.reply({
        body: found.content,
        attachment: attachments
      });
    }
  }
};