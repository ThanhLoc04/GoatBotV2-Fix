const axios = require("axios");

module.exports = {
  config: {
    name: "mail10p",
    version: "1.0.0",
    author: "tdunguwu",
    countDown: 5,
    role: 0,
    shortDescription: "Tạo và check mail 10p",
    longDescription: "Tiện ích tạo mail 10 phút, check hộp thư đến và lấy thông tin mail.",
    category: "Tiện ích",
    guide: {
      vi: "{pn} new\n{pn} check\n{pn} get\n{pn} list\n{pn} more",
      en: "{pn} new\n{pn} check\n{pn} get\n{pn} list\n{pn} more"
    }
  },

  onStart: async function({ message, args }) {
    try {
      if (args[0] === "new") {
        const res = await axios.get(`https://10minutemail.net/address.api.php?new=1`);
        const data = res.data;

        return message.reply(
          `» Tên mail: ${data.mail_get_user}\n` +
          `» Host: ${data.mail_get_host}\n` +
          `» Mail: ${data.mail_get_user}@${data.mail_get_host}\n` +
          `» Thời gian: ${data.mail_get_time}\n` +
          `» Thời gian server: ${data.mail_server_time}\n` +
          `» Key: ${data.mail_get_key}\n` +
          `» Thời gian còn lại: ${data.mail_left_time}s\n` +
          (data.mail_list?.[0] ? 
            `» Mail ID: ${data.mail_list[0].mail_id}\n» Nội dung: ${data.mail_list[0].subject}\n» Date: ${data.mail_list[0].datetime2}` 
            : "» Hộp thư rỗng")
        );
      }

      else if (args[0] === "list") {
        const res = await axios.get(`https://www.phamvandienofficial.xyz/mail10p/domain`);
        return message.reply(`List domain:\n${res.data.domain}`);
      }

      else if (args[0] === "more") {
        const res = await axios.get(`https://10minutemail.net/address.api.php?more=1`);
        const data = res.data;

        return message.reply(
          `» Tên mail: ${data.mail_get_user}\n` +
          `» Host: ${data.mail_get_host}\n` +
          `» Mail: ${data.mail_get_user}@${data.mail_get_host}\n` +
          `» Thời gian: ${data.mail_get_time}\n` +
          `» Thời gian server: ${data.mail_server_time}\n` +
          `» Key: ${data.mail_get_key}\n` +
          `» Thời gian còn lại: ${data.mail_left_time}s\n` +
          (data.mail_list?.[0] ? 
            `» Mail ID: ${data.mail_list[0].mail_id}\n» Nội dung: ${data.mail_list[0].subject}\n» Date: ${data.mail_list[0].datetime2}` 
            : "» Hộp thư rỗng")
        );
      }

      else if (args[0] === "get") {
        const res = await axios.get(`https://10minutemail.net/address.api.php`);
        const data = res.data;

        return message.reply(
          `» Email: ${data.mail_get_mail}\n` +
          `» ID Mail: ${data.session_id}\n` +
          `» Url Mail: ${data.permalink.url}\n` +
          `» Key Mail: ${data.permalink.key}`
        );
      }

      else if (args[0] === "check") {
        const res = await axios.get(`https://10minutemail.net/address.api.php`);
        const data = res.data;

        if (!data.mail_list || data.mail_list.length === 0) {
          return message.reply("📭 Hộp thư trống, chưa có mail mới.");
        }

        const mail = data.mail_list[0];
        return message.reply(
          `» Email: ${data.mail_get_mail}\n` +
          `» ID Mail: ${mail.mail_id}\n` +
          `» From: ${mail.from}\n` +
          `» Tiêu đề: ${mail.subject}\n` +
          `» Thời gian: ${mail.datetime2}`
        );
      }

      else {
        return message.reply(
          `📌 Cách dùng:\n` +
          `mail10p new → Tạo mail mới\n` +
          `mail10p check → Check hộp thư đến\n` +
          `mail10p get → Lấy mail hiện tại\n` +
          `mail10p list → Xem list domain mail\n` +
          `mail10p more → Tạo thêm mail`
        );
      }
    } catch (e) {
      return message.reply("❌ Lỗi: " + e.message);
    }
  }
};