const { exec } = require("child_process");

module.exports = {
  config: {
    name: "runshell",
    version: "7.3.2",
    author: "Nguyen, cải tiến bởi GPT",
    countDown: 0,
    role: 2, // chỉ admin bot mới chạy được
    shortDescription: "Chạy lệnh shell",
    longDescription: "Thực thi lệnh shell trực tiếp trên server",
    category: "box chat",
    guide: "{pn} <shell command>"
  },

  onStart: async function ({ message, args, event }) {
    const shellCommand = args.join(" ");
    if (!shellCommand) {
      return message.reply("⚠️ Vui lòng nhập lệnh shell cần chạy!");
    }

    exec(shellCommand, (error, stdout, stderr) => {
      if (error) {
        return message.reply(`❌ Lỗi khi thực thi lệnh: ${error.message}`);
      }
      if (stderr) {
        return message.reply(`⚠️ stderr:\n${stderr}`);
      }
      if (stdout.length === 0) {
        return message.reply("✅ Lệnh chạy thành công nhưng không có output.");
      }
      message.reply(`✅ stdout:\n${stdout}`);
    });
  }
};