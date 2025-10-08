const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "altp",
    version: "1.0.0",
    author: "Niio-team (Vtuan) | Convert: GPT",
    role: 0,
    shortDescription: "Chơi Ai Là Triệu Phú",
    longDescription: "Trò chơi Ai Là Triệu Phú với hai chế độ chơi",
    category: "game",
    guide: "{p}altp"
  },

  onStart: async function ({ message, event }) {
    const msg = `
🎉 Chào mừng bạn đến với trò chơi Ai Là Triệu Phú! 🎉

Hãy chọn chế độ chơi của bạn:

1️⃣ Ngẫu nhiên câu hỏi: 
- Mỗi câu trả lời đúng bạn sẽ nhận được 100,000 VND.
 
2️⃣ Trả lời theo thứ tự: 
- Dễ: 20,000 VND mỗi câu.
- Bình thường: 40,000 VND mỗi câu.
- Khó: 80,000 VND mỗi câu.
- Siêu khó: 1,000,000 VND mỗi câu.

(Gõ "dừng" để kết thúc trò chơi)
`;

    return message.reply(msg, (err, info) => {
      if (!err) {
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          type: "chooseMode",
          author: event.senderID,
          x: 0,
          l: 0,
          co: 0
        });
      }
    });
  },

  onReply: async function ({ message, event, Reply, usersData }) {
    if (event.senderID !== Reply.author) return;

    const { type, x, l, co, question } = Reply;

    // Đọc file câu hỏi
    const file = path.join(__dirname, "Game/altp.json");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));

    const lv = ["de", "binhthuong", "kho", "sieukho"];

    // Hàm random câu hỏi
    const q1 = (x) => {
      const r = lv[Math.floor(Math.random() * lv.length)];
      const q = data[r];
      const ra = q[Math.floor(Math.random() * q.length)];

      const msg = `
Câu hỏi: ${ra.cauhoi}
A: ${ra.A}
B: ${ra.B}
C: ${ra.C}
D: ${ra.D}

(Chọn A, B, C, D)
`;

      return message.reply(msg, (err, info) => {
        if (!err) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "altp",
            type: "ansRand",
            author: event.senderID,
            question: ra,
            x
          });
        }
      });
    };

    // Hàm theo thứ tự
    const q2 = (x, l, co) => {
      const lvIndex = lv[l];
      const q = data[lvIndex];
      const ra = q[Math.floor(Math.random() * q.length)];

      const msg = `
Câu hỏi: ${ra.cauhoi}
A: ${ra.A}
B: ${ra.B}
C: ${ra.C}
D: ${ra.D}

(Chọn A, B, C, D)
`;

      return message.reply(msg, (err, info) => {
        if (!err) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "altp",
            type: "ansOrd",
            author: event.senderID,
            question: ra,
            x,
            l,
            co
          });
        }
      });
    };

    // Bắt đầu chọn mode
    if (type === "chooseMode") {
      const mode = parseInt(event.body.trim(), 10);
      if (isNaN(mode) || (mode !== 1 && mode !== 2)) {
        return message.reply("❌ Vui lòng chọn một chế độ hợp lệ (1 hoặc 2).");
      }
      if (mode === 1) q1(0);
      else q2(0, 0, 0);
    }

    // Trả lời câu hỏi
    else if (type === "ansRand" || type === "ansOrd") {
      if (["dừng", "dung", "stop"].includes(event.body.trim().toLowerCase())) {
        return message.reply("⛔ Trò chơi đã kết thúc. Cảm ơn bạn đã tham gia!");
      }

      const userAnswer = event.body.trim().toUpperCase();
      const correctAnswer = question.dapan.toUpperCase();

      if (userAnswer === correctAnswer) {
        const newX = x + 1;
        const newCo = (co || 0) + 1;

        // Chế độ random
        if (type === "ansRand") {
          if (newX === 10) {
            await usersData.addMoney(event.senderID, 1000000);
            return message.reply(`🎉 Chúc mừng! Bạn đã trả lời đúng 10 câu liên tiếp và đạt được 1,000,000 VND`);
          } else {
            await usersData.addMoney(event.senderID, 100000);
            message.reply(`✅ Chính xác! ${question.giaithich}\nBạn đã đúng ${newX} câu.\n+100,000 VND`);
            q1(newX);
          }
        }

        // Chế độ theo thứ tự
        else if (type === "ansOrd") {
          if (l === 3 && newCo === 3) {
            await usersData.addMoney(event.senderID, 3000000);
            return message.reply(`🏆 Bạn đã hoàn thành chế độ SIÊU KHÓ và nhận 3,000,000 VND`);
          } else if (newCo === 3) {
            let reward = 0;
            if (l === 0) reward = 60000;
            else if (l === 1) reward = 120000;
            else if (l === 2) reward = 240000;
            else if (l === 3) reward = 45000;

            await usersData.addMoney(event.senderID, reward);
            message.reply(`🔥 Xuất sắc! Bạn đã hoàn thành mức ${lv[l]}.\n+${reward} VND\n➡️ Chuyển sang mức tiếp theo...`);
            q2(newX, l + 1, 0);
          } else {
            message.reply(`✅ Chính xác! ${question.giaithich}\nBạn đã đúng ${newCo} câu trong mức hiện tại.`);
            q2(newX, l, newCo);
          }
        }
      } else {
        await usersData.subtractMoney(event.senderID, 150000);
        return message.reply(`❌ Sai rồi! Đáp án đúng là ${correctAnswer}.\n${question.giaithich}\nBạn đã đúng ${x} câu trước khi sai.\n-150,000 VND`);
      }
    }
  }
};