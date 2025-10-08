module.exports = {
  config: {
    name: "out",
    aliases: [],
    version: "1.0.0",
    author: "manhG",
    role: 2, // 2 = chỉ AdminBot
    description: "Rời nhóm theo ID hoặc nhóm hiện tại",
    category: "box chat",
    guide: {
      en: "{pn} [ID nhóm] [Lý do]\nNếu không nhập ID nhóm sẽ out nhóm hiện tại."
    }
  },

  onStart: async function ({ api, event, args }) {
    const idbox = args[0];
    const reason = args.slice(1).join(" ") || "Không ghi lý do";

    // Nếu không nhập ID -> out nhóm hiện tại
    if (!idbox) {
      await api.sendMessage("[MODE] - Đã nhận lệnh out nhóm từ Admin", event.threadID);
      return api.removeUserFromGroup(api.getCurrentUserID(), event.threadID);
    }

    // Nếu nhập ID cụ thể -> gửi thông báo rồi out nhóm đó
    await api.sendMessage(
      `Đã nhận lệnh out nhóm từ Admin, lý do: ${reason}`,
      idbox,
      async () => {
        await api.removeUserFromGroup(api.getCurrentUserID(), idbox);
        return api.sendMessage(
          `Đã out box có ID: ${idbox} với lý do: ${reason}`,
          event.threadID
        );
      }
    );
  }
};