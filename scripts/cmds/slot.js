const fs = require("fs");
const path = __dirname + "/cache/jackpot.json";

// ===== HỆ THỐNG HŨ =====
function getJackpotData() {
  if (!fs.existsSync(path)) {
    const init = { money: "0", lastWinner: null, lastTime: null };
    fs.writeFileSync(path, JSON.stringify(init, null, 2));
    return init;
  }
  return JSON.parse(fs.readFileSync(path));
}

function getJackpot() {
  return BigInt(getJackpotData().money || "0");
}

function setJackpot(amount, winner = null, time = null) {
  let data = getJackpotData();
  data.money = amount.toString();
  if (winner !== null) data.lastWinner = winner;
  if (time !== null) data.lastTime = time;
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

function addJackpot(amount) {
  let data = getJackpotData();
  let current = BigInt(data.money || "0");
  data.money = (current + BigInt(amount)).toString();
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// ===== PARSE TIỀN CƯỢC =====
function parseBetAmount(input, moneyUser) {
  if (!input) return null;
  input = input.toLowerCase();

  if (input === "all" || input === "allin") return moneyUser;

  const multipliers = {
    k: 1_000_000_000_000n,                // 1k = 10^12
    m: 1_000_000_000_000_000n,            // 1m = 10^15
    b: 1_000_000_000_000_000_000n,        // 1b = 10^18
    kb: 1_000_000_000_000_000_000_000n,   // 1kb = 10^21
    mb: 1_000_000_000_000_000_000_000_000n, // 1mb = 10^24
    gb: 1_000_000_000_000_000_000_000_000_000n, // 1gb = 10^27
    g: 1_000_000_000_000_000_000_000_000_000_000_000n // 1g = 10^36
  };

  if (!isNaN(input)) return BigInt(input);

  let match = input.match(/^(\d+)([a-z]+)?$/i);
  if (!match) return NaN;

  let amount = BigInt(match[1]);
  let unit = match[2];

  if (unit && multipliers[unit]) {
    amount *= multipliers[unit];
  }

  return amount;
}

// ===== HÀM TRỪ/CỘNG TIỀN =====
async function safeDecreaseMoney(usersData, uid, amount) {
  let data = await usersData.get(uid);
  let current = BigInt(data.money || 0);
  let newBalance = current - BigInt(amount);
  if (newBalance < 0n) newBalance = 0n;
  await usersData.set(uid, { money: Number(newBalance) });
}

async function safeIncreaseMoney(usersData, uid, amount) {
  let data = await usersData.get(uid);
  let current = BigInt(data.money || 0);
  let newBalance = current + BigInt(amount);
  await usersData.set(uid, { money: Number(newBalance) });
}

module.exports = {
  config: {
    name: "slot",
    version: "3.0.1",
    author: "Mirai Team + Trung Kiên | Rewrite GPT",
    countDown: 5,
    role: 0,
    shortDescription: "Slot siêu hũ",
    longDescription: "Chơi slot 3x3 có hũ toàn server",
    category: "game",
    guide: "{p}slot [số tiền | all | hũ]"
  },

  onStart: async function ({ message, event, args, usersData }) {
    const { senderID } = event;

    // Xem hũ
    if (args[0] && args[0].toLowerCase() === "hũ") {
      let data = getJackpotData();
      let jackpot = BigInt(data.money || 0);
      let msg = `💰 Hũ toàn server hiện tại: ${jackpot.toLocaleString()}$`;
      if (data.lastWinner) {
        msg += `\n👑 Người vừa ăn hũ toàn server: ${data.lastWinner}`;
      }
      if (data.lastTime) {
        msg += `\n🕒 Thời gian: ${data.lastTime}`;
      }
      return message.reply(msg);
    }

    // Lấy tiền user
    let moneyUser = BigInt((await usersData.get(senderID)).money || 0);

    // Parse số tiền cược
    let betAmount = parseBetAmount(args[0], moneyUser);
    if (!betAmount || betAmount <= 0n) {
      return message.reply("[ SLOT ] Vui lòng nhập số tiền cược hợp lệ!");
    }
    if (betAmount > moneyUser) {
      return message.reply("[ SLOT ] Bạn không có đủ tiền để cược!");
    }

    // ===== RANDOM SLOT 3x3 =====
    const slots = ["🍏", "🍇", "🍌", "🍒", "🍓", "🍉"];
    let matrix = [];

    for (let i = 0; i < 3; i++) {
      let row = [];
      for (let j = 0; j < 3; j++) {
        row.push(slots[Math.floor(Math.random() * slots.length)]);
      }
      matrix.push(row);
    }

    // Hàng giữa là kết quả chính
    let resultArr = matrix[1];

    // 0.3% auto ra 3 hình giống nhau
    if (Math.random() < 0.003) {
      resultArr[1] = resultArr[0];
      resultArr[2] = resultArr[0];
      matrix[1] = resultArr;
    }

    // In ma trận slot
    let result = "🎰\n";
    for (let row of matrix) {
      result += row.join(" | ") + "\n";
    }

    let msg = result + "\n";

    const FEE_RATE = 3n;       // phí thắng (%)
    const JACKPOT_RATE = 5n;   // % cộng vào hũ mỗi ván

    // ===== CHECK THẮNG/THUA =====
    if (resultArr[0] === resultArr[1] && resultArr[1] === resultArr[2]) {
      // 3 hình giống nhau
      const rawWin = betAmount * 2n;

      await safeDecreaseMoney(usersData, senderID, betAmount);

      // jackpot thưởng
      let jackpotNow = getJackpot();
      let jpAward = betAmount * 5n;
      if (jpAward >= jackpotNow) jpAward = jackpotNow;

      // tổng thắng
      const totalBeforeFee = rawWin + jpAward;
      const fee = totalBeforeFee * FEE_RATE / 100n;
      const finalWin = totalBeforeFee - fee;

      await safeIncreaseMoney(usersData, senderID, finalWin);

      // phí vào hũ
      addJackpot(fee);

      // nếu có ăn hũ thì lưu người thắng + thời gian
      if (jpAward > 0n) {
        let userName = (await usersData.get(senderID)).name || "Người chơi bí ẩn";
        let timeNow = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
        setJackpot(jackpotNow - jpAward, userName, timeNow);
      }

      msg += `🎉 3 hình giống nhau! Bạn thắng ${rawWin.toLocaleString()}$ + ăn hũ ${jpAward.toLocaleString()}$\n`;
      msg += `💸 Phí ${FEE_RATE}% (đã vào hũ): -${fee.toLocaleString()}$\n`;
      msg += `💥 Nhận thực tế: +${finalWin.toLocaleString()}$\n`;
      msg += `💰 Hũ còn lại: ${getJackpot().toLocaleString()}$\n`;

    } else if (
      resultArr[0] === resultArr[1] ||
      resultArr[1] === resultArr[2] ||
      resultArr[0] === resultArr[2]
    ) {
      // 2 hình giống nhau
      const rawWin = betAmount * 15n / 10n; // x1.5
      const fee = rawWin * FEE_RATE / 100n;
      const finalWin = rawWin - fee;

      await safeDecreaseMoney(usersData, senderID, betAmount);
      await safeIncreaseMoney(usersData, senderID, finalWin);

      // phí + 5% cược vào hũ
      addJackpot(fee);
      const jackpotAdd = betAmount * JACKPOT_RATE / 100n;
      addJackpot(jackpotAdd);

      msg += `✨ 2 hình giống nhau! Bạn thắng ${rawWin.toLocaleString()}$ (phí ${FEE_RATE}%: -${fee.toLocaleString()}$)\n`;
      msg += `💥 Nhận thực tế: +${finalWin.toLocaleString()}$\n`;
      msg += `💰 Hũ hiện tại: ${getJackpot().toLocaleString()}$\n`;

    } else {
      // Thua
      const jackpotAdd = betAmount * JACKPOT_RATE / 100n;
      await safeDecreaseMoney(usersData, senderID, betAmount);
      addJackpot(jackpotAdd);

      msg += `😢 Bạn THUA và mất -${betAmount.toLocaleString()}$ (5% đã vào hũ)\n`;
      msg += `💰 Hũ hiện tại: ${getJackpot().toLocaleString()}$\n`;
    }

    let balance = BigInt((await usersData.get(senderID)).money || 0);
    msg += `\n💵 Số dư hiện tại: ${balance.toLocaleString()}$`;

    return message.reply(msg);
  }
};