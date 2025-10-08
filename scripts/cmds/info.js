const fs = require("fs-extra");
const request = require("request");
const axios = require("axios");
const moment = require("moment-timezone");

const token = "EAAD6V7os0gcBPYta88i73lifa2bTu2QZAwHRttZB7IV59yX1KKYpqP0iMYHJR6XNn0950glARGZB6zZBTL1Sg1p5rn21MqF4YgiPFox56MhZBCS7GRJddLGJ1MUjR1ZChOhE11JX3o8jZCE5SHq2bnL8A7GhWmBRwUnZAnqLW0k03PqgdcunL38krjllEQRfwJWNKwZDZD";
module.exports = {
  config: {
    name: "infor",
    version: "1.0.0",
    author: "BerVer (convert: ChatGPT)",
    countDown: 5,
    role: 0,
    shortDescription: "Kiểm tra thông tin người dùng",
    longDescription:
      "Xem thông tin của bạn hoặc người khác (bằng cách tag hoặc reply)",
    category: "info",
    guide: "{pn} [@tag | reply | uid]"
  },

  onStart: async function ({ message, event, usersData, args }) {
    let targetID;

    // Nếu reply thì lấy ID người được reply
    if (event.messageReply) {
      targetID = event.messageReply.senderID;
    }
    // Nếu không có args thì lấy ID người gọi lệnh
    else if (!args[0]) {
      targetID = event.senderID;
    }
    // Nếu có tag thì lấy ID người bị tag
    else if (Object.keys(event.mentions || {})[0]) {
      targetID = Object.keys(event.mentions)[0];
    }
    // Nếu nhập thẳng uid
    else if (!isNaN(args[0])) {
      targetID = args[0];
    }

    if (!targetID) {
      return message.reply("❎ Không tìm thấy người dùng hợp lệ.");
    }

    try {
      const user = await usersData.get(targetID);
      const money = user.money || 0;

      // Gọi Graph API lấy thêm thông tin
      const resp = await axios.get(
        `https://graph.facebook.com/${targetID}?fields=id,is_verified,cover,updated_time,work,education,likes,created_time,work,posts,hometown,username,family,timezone,link,name,locale,location,about,website,birthday,gender,relationship_status,significant_other,quotes,first_name,subscribers.limit(0)&access_token=${token}`
      );

      const createdTime = resp.data.created_time;
      const follower = resp.data.subscribers?.summary?.total_count || "❎";
      const relationshipStatus = resp.data.relationship_status || "";
      const rela = resp.data.significant_other?.name;
      const idRela = resp.data.significant_other?.id;

      const gender =
        user.gender == 2 ? "Nam" : user.gender == 1 ? "Nữ" : "Trần Đức Bo";

      const filePath = `${__dirname}/cache/${Date.now()}.png`;

      // tải avatar
      const url = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${token}`;
      await new Promise((resolve) => {
        request(encodeURI(url))
          .pipe(fs.createWriteStream(filePath))
          .on("close", resolve);
      });

      const body =
        `🤓 Tên: ${user.name}\n` +
        `🔖 ID: ${targetID}\n` +
        `✏ Tên người dùng: ${user.vanity || "❎"}\n` +
        `🚻 Giới tính: ${gender}\n` +
        `📅 Tạo acc: ${moment(createdTime).format("DD/MM/YYYY")}\n` +
        `🛜 Người theo dõi: ${follower}\n` +
        `👥 Mối quan hệ: ${relationshipStatus} ${rela || ""}\n` +
        (idRela ? `🔗 Link người yêu: https://facebook.com/${idRela}\n` : "") +
        `🏧 Tài khoản: ${money} đô\n` +
        `📎 URL Cá nhân: ${user.profileUrl || resp.data.link}`;

      await message.reply({
        body,
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);
    } catch (e) {
      console.error(e);
      return message.reply("❎ Không lấy được thông tin người dùng.");
    }
  }
};