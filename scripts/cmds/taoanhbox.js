const fs = require("fs-extra");
const Canvas = require("canvas");
const superfetch = require("node-superfetch");
const Jimp = require("jimp-compact");

module.exports = {
  config: {
    name: "taoanhbox",
    version: "1.0.2",
    author: "Converted by ChatGPT",
    countDown: 5,
    role: 0,
    shortDescription: "Tạo ảnh all thành viên trong box",
    longDescription:
      "Ghép avatar tất cả thành viên trong nhóm thành một bức ảnh lớn và tạo bản chỉ avatar",
    category: "group",
    guide: "{pn} <size> [#màu] [title]"
  },

  // Hàm bo tròn avatar
  circle: async function (image) {
    const img = await Jimp.read(image);
    img.circle();
    return await img.getBufferAsync(Jimp.MIME_PNG);
  },

  onStart: async function ({ message, event, args, api }) {
    try {
      const { threadID } = event;

      // Lấy thông tin nhóm
      const threadInfo = await api.getThreadInfo(threadID);
      const { participantIDs, adminIDs, name, userInfo } = threadInfo;

      // Lọc user còn sống (có gender)
      const live = [];
      const admin = adminIDs.map(a => a.id);
      for (let u of userInfo) {
        if (u.gender != undefined) live.push(u);
      }

      // Load background random
      const bgList = [
        "https://i.imgur.com/P3QrAgh.jpg",
        "https://i.imgur.com/RueGAGI.jpg",
        "https://i.imgur.com/bwMjOdp.jpg",
        "https://i.imgur.com/trR9fNf.jpg"
      ];
      const background = await Canvas.loadImage(
        bgList[Math.floor(Math.random() * bgList.length)]
      );
      const bgX = background.width;
      const bgY = background.height;

      const khungAvt = await Canvas.loadImage("https://i.imgur.com/gYxZFzx.png");

      // Khởi tạo 2 canvas
      const imgCanvas = Canvas.createCanvas(bgX, bgY);
      const ctx = imgCanvas.getContext("2d");
      ctx.drawImage(background, 0, 0, bgX, bgY);

      const imgCanvasAvtOnly = Canvas.createCanvas(bgX, bgY);
      const ctxAvtOnly = imgCanvasAvtOnly.getContext("2d");
      // ctxAvtOnly nền trong suốt nên không vẽ background

      // Xử lý args
      let size, color, title;
      const imageArea = bgX * (bgY - 200);
      const sizeParti = Math.floor(imageArea / live.length);
      const sizeAuto = Math.floor(Math.sqrt(sizeParti));

      if (!args[0]) {
        size = sizeAuto;
        color = "#FFFFFF";
        title = name;
      } else {
        size = parseInt(args[0]);
        color = args[1] || "#FFFFFF";
        title = args.slice(2).join(" ") || name;
      }

      // Khoảng cách
      let l = parseInt(size / 15),
        x = parseInt(l),
        y = parseInt(200),
        xcrop = parseInt(live.length * size),
        ycrop = parseInt(200 + size);
      size = size - l * 2;

      // Thông báo khởi tạo
      await message.reply(
        `📌 Thành viên dự tính: ${participantIDs.length}\n🖼️ Background: ${bgX} x ${bgY}\n👤 Avatar: ${size}\n🎨 Màu chữ: ${color}\n🔄 Đang xử lý...`
      );

      // Vẽ avatar từng thành viên
      let i = 0;
      for (let idUser of live) {
        try {
          const avtUser = await superfetch.get(
            `https://graph.facebook.com/${idUser.id}/picture?height=720&width=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`
          );
          const avatar = await this.circle(avtUser.body);
          const avatarload = await Canvas.loadImage(avatar);

          // Vẽ avatar trên 2 canvas
          ctx.drawImage(avatarload, x, y, size, size);
          ctxAvtOnly.drawImage(avatarload, x, y, size, size);

          // Nếu là admin, thêm khung
          if (admin.includes(idUser.id)) {
            ctx.drawImage(khungAvt, x, y, size, size);
            ctxAvtOnly.drawImage(khungAvt, x, y, size, size);
          }

          i++;
          x += parseInt(size + l);
          if (x + size > bgX) {
            xcrop = x;
            x = l;
            y += size + l;
            ycrop += size + l;
          }
          if (ycrop > bgY) {
            ycrop -= size;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Vẽ tiêu đề trên ảnh gốc
      ctx.font = "100px sans-serif";
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.fillText(title, xcrop / 2, 133);

      // Xuất file ảnh đầy đủ
      const pathAVT = `${__dirname}/cache/${Date.now()}.png`;
      const cutImage = await Jimp.read(imgCanvas.toBuffer());
      await cutImage.crop(0, 0, xcrop, ycrop + l - 30).writeAsync(pathAVT);

      // Xuất file ảnh chỉ avatar
      const pathAVTOnly = `${__dirname}/cache/${Date.now()}_only.png`;
      const cutImageOnly = await Jimp.read(imgCanvasAvtOnly.toBuffer());
      await cutImageOnly.crop(0, 0, xcrop, ycrop + l - 30).writeAsync(pathAVTOnly);

      // Gửi 2 ảnh
      await message.reply({
        body: `✅ Đã vẽ ${i} avatar\n⚠️ Lọc ${participantIDs.length - i} người không khả dụng`,
        attachment: [
          fs.createReadStream(pathAVT),
          fs.createReadStream(pathAVTOnly)
        ]
      });

      // Xóa cache
      fs.unlinkSync(pathAVT);
      fs.unlinkSync(pathAVTOnly);
    } catch (e) {
      return message.reply("❌ Lỗi: " + e.message);
    }
  }
};