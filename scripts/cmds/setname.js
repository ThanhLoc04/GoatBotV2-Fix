module.exports = {
  config: {
    name: "setname",
    version: "1.1.1",
    role: 0,
    shortDescription: "Đổi biệt danh trong nhóm",
    longDescription: "Đổi biệt danh trong nhóm cho chính bạn hoặc người khác bằng cách tag/reply",
    category: "box chat",
    guide: "{pn} [trống/tag/reply] + [tên]"
  },

  onStart: async function ({ api, event, args, usersData }) {
    const { threadID, messageReply, senderID, mentions, type } = event;
    const delayUnsend = 60; // giây

    // Nếu reply tin nhắn → đổi tên người bị reply
    if (type === "message_reply") {
      const name = args.join(" ");
      await api.changeNickname(name, threadID, messageReply.senderID);
      return api.sendMessage(
        `Đã đổi biệt danh cho ${(await usersData.getName(messageReply.senderID))} thành: ${name}`,
        threadID,
        (err, info) => setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000)
      );
    }

    // Nếu có tag → đổi tên người bị tag
    const mention = Object.keys(mentions)[0];
    if (mention) {
      const name = args.join(" ").replace(mentions[mention], "");
      await api.changeNickname(name, threadID, mention);
      return api.sendMessage(
        `Đã đổi biệt danh cho ${(await usersData.getName(mention))} thành: ${name}`,
        threadID,
        (err, info) => setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000)
      );
    }

    // Nếu không reply/tag → đổi tên bản thân
    const name = args.join(" ");
    await api.changeNickname(name, threadID, senderID);
    return api.sendMessage(
      `Đã đổi biệt danh của bạn thành: ${name}`,
      threadID,
      (err, info) => setTimeout(() => api.unsendMessage(info.messageID), delayUnsend * 1000)
    );
  }
};