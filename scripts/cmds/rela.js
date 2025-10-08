const fs = require("fs-extra");
const { loadImage, createCanvas, registerFont } = require("canvas");
const axios = require("axios");

const D = __dirname + "/cache/rela/";
const expole = D + "rela.png";
const bg = D + "bg.png";
const dicon = D + "icon.png";
const font = D + "AmaticSC.ttf";

// Link file
const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
const bglink = "https://blogger.googleusercontent.com/img/a/AVvXsEgiT494Po7Onhcft4jFS2cTSb2-7wbRYaoCCGFH09X53RtuI3YABGgYfMJsCAmsDs8hfpMU2k28PKwImiP6Go9LiOquM0CYR4bEgzH8yXIfsJ8CJHdnRcogIOef0tgdzIjTBsGROv-12T60AI2njz0p_N9ipS5T4_KMatV8Erl6GYJ6PLou2HeIRWrA=s1278";
const iconlink = "https://blogger.googleusercontent.com/img/a/AVvXsEgQpVe6Q9RLyMZolNU3K7PqmAyKbIz53aIcAux5P9X7gbXydjEbkbZSKHxiwTLrY_XmgSeJJgrTi8-jh6g8RuWvq8h4mfQOA470attJaNuHWI9AP28SVUiTF8gaggPUeeQ4zq7OT5kgO4qvQsloqIVxJue7cFZmDwaxHNI8UVHqxrCsA_BXwvEYskq9=s45";
const fontlink = "https://drive.google.com/u/0/uc?id=1ZzgC7nyGaBw-zP3V2GKK0azoFgF5aXup&export=download";

let background, icon, MissionC, uid2, name1, name2;

const data = [
  "Trách phận vô duyên...",
  "hơi thấp nhưng không sao. Hãy cố gắng lên!",
  "3 phần duyên nợ, 7 phần cố gắng",
  "tỷ lệ mà mối quan hệ này có thể nên duyên cũng khá là nhỏ đấy! Phải cố gắng hơn nữa",
  "Date với nhau đi. Để mối quan hệ này có thể tiến xa hơn",
  "Hãy chủ động bắt chuyện hơn nữa. Hai bạn khá là hợp đôi",
  "Hãy tin vào duyên số đi, vì nó có thật đấy!",
  "Hợp đôi lắm đấy. Quan tâm chăm sóc cho mối quan hệ này nhiều hơn nữa nhé!",
  "Lưu số nhau đi, bao giờ cưới thì gọi nhau lên lễ đường!",
  "Cưới đi chờ chi!"
];

module.exports = {
  config: {
    name: "rela",
    version: "1.1.0",
    author: "Trịnh Quốc Đại, convert by GPT",
    countDown: 5,
    role: 0,
    shortDescription: "So sánh mối quan hệ",
    longDescription: "So sánh mối quan hệ giữa bạn và người được tag hoặc reply",
    category: "box chat",
    guide: "{pn} [tag] | [info] | [fake]"
  },

  onLoad: async function () {
    const { resolve } = require("path");
    const { existsSync, mkdirSync } = require("fs-extra");
    const { downloadFile } = global.utils;
    if (!existsSync(D)) mkdirSync(D, { recursive: true });
    if (!existsSync(bg)) await downloadFile(bglink, resolve(bg));
    if (!existsSync(dicon)) await downloadFile(iconlink, resolve(dicon));
    if (!existsSync(font)) await downloadFile(fontlink, resolve(font));
  },

  onStart: async function ({ message, event, args, usersData }) {
    background = await loadImage(bg);
    icon = await loadImage(dicon);

    const uid = event.senderID;
    name1 = await usersData.getName(uid);

    let mentions1 = Object.keys(event.mentions);

    if (mentions1.length == 0 && !event.messageReply) {
      return message.reply(
        `1: Sử dụng lệnh + [tag] || [reply]\n2: Sử dụng lệnh + info hoặc fake [tag] || [reply]\n\nInfo sử dụng để xem thông tin như credit\nFake sử dụng để tạo banner fake thông tin`
      );
    }

    if (mentions1.length != 0) {
      uid2 = mentions1[0];
    } else {
      uid2 = event.messageReply.senderID;
    }

    name2 = await usersData.getName(uid2);

    if (args[0] == "info") {
      return message.reply(`123`);
    }

    if (args[0] == "fake") {
      return message.reply(
        `Nhập số tim của bạn ví dụ 8|8|8|8|8`,
        (err, info) => {
          global.GoatBot.onReply.set(info.messageID, {
            type: "create",
            commandName: this.config.name,
            author: event.senderID
          });
        }
      );
      return;
    }

    MissionC = Array.from({ length: 5 }, () => Math.floor(Math.random() * 8));
    const allmath = MissionC.reduce((a, b) => a + b, 0) * 2.5;

    const msg = sosanh(allmath);
    const getboyavt = await loadImage(await getavt(event.senderID));
    const getgirlavt = await loadImage(await getavt(uid2));

    const render = await irender(allmath, msg, name1, name2, getboyavt, getgirlavt);
    fs.writeFileSync(expole, render);

    message.reply({
      body: `Chúc mừng ${name1} & ${name2}\n${msg}`,
      attachment: fs.createReadStream(expole)
    });
  },

  onReply: async function ({ message, event, Reply, usersData }) {
    if (Reply.author != event.senderID) return;

    if (Reply.type == "create") {
      try {
        let tym = event.body;
        MissionC = tym.split("|").map(n => parseInt(n));
        if (MissionC.length != 5) {
          return message.reply("Thiếu, thừa số hoặc sai định dạng vui lòng thao tác lại");
        }
        for (let i of MissionC) {
          if (i > 8) return message.reply("Không được lớn hơn 8 trái tim vui lòng thao tác lại");
        }

        const allmath = MissionC.reduce((a, b) => a + b, 0) * 2.5;
        const msg = sosanh(allmath);

        const getboyavt = await loadImage(await getavt(event.senderID));
        const getgirlavt = await loadImage(await getavt(uid2));

        const render = await irender(allmath, msg, name1, name2, getboyavt, getgirlavt);
        fs.writeFileSync(expole, render);

        message.reply({
          body: `Chúc mừng ${name1} & ${name2}\n${msg}\n ${MissionC}`,
          attachment: fs.createReadStream(expole)
        });
      } catch (e) {
        return message.reply(`Đã xảy ra lỗi: ${e}`);
      }
    }
  }
};

// ==================== Functions ====================
function sosanh(rd) {
  if (rd < 10) return data[0];
  else if (rd < 20) return data[1];
  else if (rd < 30) return data[2];
  else if (rd < 40) return data[3];
  else if (rd < 50) return data[4];
  else if (rd < 60) return data[5];
  else if (rd < 70) return data[6];
  else if (rd < 80) return data[7];
  else if (rd < 90) return data[8];
  return data[9];
}

async function getavt(uid) {
  const { data } = await axios.get(
    `https://graph.facebook.com/v12.0/${uid}/picture?height=240&width=240&access_token=${token}`,
    { responseType: "arraybuffer" }
  );
  return data;
}

function irender(tile, msg, boyname, girlname, getboyavt, getgirlavt) {
  registerFont(font, { family: "AmaticSCbold" });
  const canvas = createCanvas(background.width, background.height);
  const ctx = canvas.getContext("2d");

  ctx.drawImage(getboyavt, 114, 581, 98, 98);
  ctx.drawImage(getgirlavt, 509, 581, 98, 98);
  ctx.drawImage(background, 0, 0);

  ctx.font = "150px AmaticSCbold";
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFE";
  ctx.fillText(tile + "%", 360, 340);

  let math = 756;
  for (let i = 0; i < 5; i++) {
    let leftmath = 170;
    math += 50;
    for (let ii = 0; ii < MissionC[i]; ii++) {
      leftmath += 55;
      ctx.drawImage(icon, leftmath, math);
    }
  }

  ctx.font = "50px AmaticSCbold";
  ctx.fillStyle = "#000";
  ctx.fillText(boyname, 163, 746);
  ctx.fillText(girlname, 557, 746);

  ctx.font = "45px AmaticSCbold";
  ctx.textAlign = "start";
  const xuongdong = wrapText(ctx, msg, 640);
  ctx.fillText(xuongdong.join("\n"), 60, 1145);

  return canvas.toBuffer("image/png");
}

function wrapText(ctx, text, max) {
  const lines = [];
  if (ctx.measureText(text).width > max) {
    const words = text.split(" ");
    let line = "";
    while (words.length > 0) {
      if (ctx.measureText(line + words[0]).width < max) {
        line += words.shift() + " ";
      } else {
        lines.push(line.trim());
        line = "";
      }
      if (words.length === 0) lines.push(line.trim());
    }
  } else {
    lines.push(text);
  }
  return lines;
}