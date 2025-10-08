const moment = require("moment-timezone");

function replace(int) {
  var str = int.toString();
  var newstr = str.replace(/(.)(?=(\d{3})+$)/g, "$1,");
  return newstr;
}

function parseBet(input, money) {
  if (!input) return NaN;
  input = input.toLowerCase();

  if (input === "all") return money;

  let number = parseInt(input);
  if (isNaN(number)) number = 0;

  if (input.includes("k")) number *= 10 ** 3;
  if (input.includes("m")) number *= 10 ** 6;
  if (input.includes("b")) number *= 10 ** 9;
  if (input.includes("kb")) number *= 10 ** 12;
  if (input.includes("mb")) number *= 10 ** 15;
  if (input.includes("gb")) number *= 10 ** 18;
  if (input.includes("g")) number *= 10 ** 21;

  return number;
}

function getRATE(tong) {
  if (tong == 4) return 40;
  if (tong == 5) return 35;
  if (tong == 6) return 33.33;
  if (tong == 7) return 25;
  if (tong == 8) return 20;
  if (tong == 9) return 16.66;
  if (tong == 10) return 14.28;
  if (tong == 11) return 12.5;
  if (tong == 12) return 11.11;
  if (tong == 13) return 10;
  if (tong == 14) return 9.09;
  if (tong == 15) return 8.33;
  if (tong == 16) return 7.69;
  if (tong == 17) return 7.14;
  return 0;
}

const tilethang = 2;
const tilethangb3dn = 10;
const tilethangb2dn = 5;
const haisogiong = 2;
const basogiong = 3;
const motsogiong = 1;

// Lưu cooldown cho từng người
const cooldown = {};

module.exports = {
  config: {
    name: "tx",
    aliases: ["taixiu"],
    version: "7.2.0",
    author: "Yae Miko & Mod by DongDev & Update by ChatGPT",
    countDown: 5,
    role: 0,
    shortDescription: "Tài xỉu một người",
    longDescription: "Game tài xỉu một người chơi (chơi xong chờ 3 phút mới chơi tiếp được, phí thắng 5%)",
    category: "game",
    guide: {
      vi: "{pn} [tài/xỉu/b3gn/b2gn/cs/ct] [số tiền]",
    },
  },

  onStart: async function ({ message, args, usersData, event }) {
    try {
      const { senderID } = event;
      const userData = await usersData.get(senderID);
      let money = userData.money || 0;
      const name = userData.name || "Người chơi";

      // Kiểm tra cooldown 3 phút
      const now = Date.now();
      const cdTime = 3 * 60 * 1000; // 3 phút
      if (cooldown[senderID] && now - cooldown[senderID] < cdTime) {
        const timeLeft = Math.ceil((cdTime - (now - cooldown[senderID])) / 1000);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        return message.reply(
          `⏳ Bạn cần chờ ${minutes} phút ${seconds} giây nữa mới có thể chơi tiếp!`
        );
      }

      let input = args[0];
      let bet;

      if (!args[1]) {
        return message.reply("❗ Bạn chưa nhập số tiền cược!");
      } else if (args[1].toLowerCase() === "all") {
        bet = money;
      } else {
        bet = parseBet(args[1], money);
      }

      const tong = parseInt(args[2]);

      if (!input)
        return message.reply("[ ❗ ] Bạn chưa nhập tài/xỉu/b3gn/b2gn/ct/cs");
      if (!bet || bet <= 0)
        return message.reply("❌ Số tiền cược không hợp lệ!");
      if (bet < 100)
        return message.reply("💸 Bạn cần cược tối thiểu là 100$");
      if (bet > money)
        return message.reply("💸 Bạn không đủ tiền để cược!");

      if (input == "tài" || input == "tai" || input == "-t") var choose = "tài";
      if (input == "xỉu" || input == "xiu" || input == "-x") var choose = "xỉu";
      if (input == "b3gn") var choose = "b3gn";
      if (input == "b2gn") var choose = "b2gn";
      if (input == "cuoctong" || input == "ct") var choose = "cuoctong";
      if (input == "cuocso" || input == "cs") var choose = "cuocso";

      const tag = ["tài", "xỉu", "b3gn", "b2gn", "cuoctong", "cuocso"];
      if (!tag.includes(choose))
        return message.reply(
          "[ ❗ ] Lựa chọn sai, hãy nhập tài/xỉu/b3gn/b2gn/ct/cs"
        );

      if (choose == "cuoctong" && (tong < 4 || tong > 17))
        return message.reply("💸 Tổng cược không hợp lệ");
      if (choose == "cuocso" && (tong < 1 || tong > 6))
        return message.reply("❗ Số bạn chọn không hợp lệ");

      // Tung xúc xắc
      const number = [];
      for (let i = 1; i <= 3; i++) {
        let n = Math.floor(Math.random() * 6 + 1);
        number.push(n);
      }
      const total = number[0] + number[1] + number[2];

      let ans, result, mn;

      if (choose == "cuocso") {
        if (number.filter((x) => x == tong).length == 1) {
          ans = `${tong}`;
          result = "win";
          mn = bet * motsogiong;
        } else if (number.filter((x) => x == tong).length == 2) {
          ans = `${tong}`;
          result = "win";
          mn = bet * haisogiong;
        } else if (number.filter((x) => x == tong).length == 3) {
          ans = `${tong}`;
          result = "win";
          mn = bet * basogiong;
        } else {
          ans = `${tong}`;
          result = "lose";
          mn = 0;
        }
      }

      if (choose == "cuoctong") {
        if (total == tong) {
          ans = "cược tổng";
          result = "win";
          mn = bet * parseInt(getRATE(tong));
        } else {
          ans = `${total}`;
          result = "lose";
          mn = 0;
        }
      }

      if (choose == "b3gn") {
        if (number[0] == number[1] && number[1] == number[2]) {
          ans = "bộ ba đồng nhất";
          result = "win";
          mn = bet * tilethangb3dn;
        } else {
          ans = total >= 11 ? "tài" : "xỉu";
          result = "lose";
          mn = 0;
        }
      }

      if (choose == "b2gn") {
        if (
          number[0] == number[1] ||
          number[1] == number[2] ||
          number[0] == number[2]
        ) {
          ans = "bộ hai đồng nhất";
          result = "win";
          mn = bet * tilethangb2dn;
        } else {
          ans = total >= 11 ? "tài" : "xỉu";
          result = "lose";
          mn = 0;
        }
      }

      if (choose == "tài" || choose == "xỉu") {
        if (number[0] == number[1] && number[1] == number[2]) {
          ans = "bộ ba đồng nhất";
          result = "lose";
          mn = 0;
        } else {
          ans = total >= 11 ? "tài" : "xỉu";
          if (ans == choose) {
            result = "win";
            mn = bet * tilethang;
          } else {
            result = "lose";
            mn = 0;
          }
        }
      }

      let fee = 0;
      if (result == "lose") {
        await usersData.set(senderID, {
          money: money - bet,
        });
      } else if (result == "win") {
        fee = Math.floor(mn * 0.05);
        await usersData.set(senderID, {
          money: money + mn - fee,
        });
      }

      // Cập nhật cooldown sau khi chơi
      cooldown[senderID] = Date.now();

      const msg =
        `🎲 𝐊𝐄̂́𝐓 𝐐𝐔𝐀̉ 🎲\n` +
        `◈🧸 Player: ${name}\n` +
        `◈🎲 Lựa chọn: ${choose}\n` +
        `◈💰 Tiền cược: ${replace(bet)}\n` +
        `➾🎲 Bot lắc ra: ${ans}\n` +
        `➾🔎 Tổng Point: ${total}\n` +
        `➾🤑 Kết quả: ${result == "win" ? "Thắng" : "Thua"}\n` +
        (result == "win"
          ? `➾📌 Money: + ${replace(Math.floor(mn - fee))}$ (đã trừ phí)\n💸 Phí thắng (5%): ${replace(fee)}$`
          : `➾📌 Money: - ${replace(bet)}$ (mất hết)`) +
        `\n⏳ Bạn cần chờ 3 phút để chơi tiếp.`;

      message.reply(msg);
    } catch (e) {
      console.log(e);
      message.reply("❌ Đã xảy ra lỗi!");
    }
  },
};