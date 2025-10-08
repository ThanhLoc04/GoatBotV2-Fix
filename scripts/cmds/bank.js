const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "bank",
    version: "1.0.1",
    author: "ntkiendz",
    countDown: 0,
    role: 0,
    shortDescription: "Ngân hàng Goat Bank",
    longDescription: "Hệ thống gửi/rút tiền, cộng lãi tự động",
    category: "bank",
    guide: {
      body: `
🏦 GOAT BANK MENU 🏦
-bank register -> Đăng ký tài khoản
-bank check -> Xem số dư + lãi suất
-bank gửi <số tiền> -> Gửi tiền
-bank rút <số tiền> -> Rút tiền
-bank history -> Lịch sử giao dịch

💵 Gửi >= 100$, Rút >= 10,000$
💸 Phí giao dịch: 1.5%
💹 Lãi suất: 0,025% mỗi 5 tiếng
⛔ Chủ Nhật: Ngân hàng nghỉ.
`
    }
  },

  // ====== Biến toàn cục ======
  onLoad: async function () {
    const dir = path.join(__dirname, "data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const pathData = path.join(dir, "bank.json");
    if (!fs.existsSync(pathData)) fs.writeFileSync(pathData, "[]", "utf-8");

    global.bankLastInterest = Date.now();
    const interestRate = 0.00025;
    const fiveHours = 5 * 60 * 60 * 1000;

    setInterval(() => {
      try {
        const today = new Date().getDay();
        if (today === 0) {
          console.log("[BANK] Chủ Nhật - ngân hàng nghỉ, không cộng lãi.");
          return;
        }

        let users = JSON.parse(fs.readFileSync(pathData, "utf-8"));
        let updated = false;

        users.forEach(user => {
          let balance = BigInt(user.money || "0");
          if (balance > 0n) {
            let interest = BigInt(Math.floor(Number(balance) * interestRate));
            if (interest > 0n) {
              user.money = String(balance + interest);
              if (!user.history) user.history = [];
              const time = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
              user.history.unshift({ type: "Cộng lãi suất 0,025%", amount: `+${formatFullAmount(interest)}`, time });
              if (user.history.length > 20) user.history.pop();
              updated = true;
            }
          }
        });

        if (updated) {
          fs.writeFileSync(pathData, JSON.stringify(users, null, 2), "utf-8");
          global.bankLastInterest = Date.now();
          console.log(`[BANK] Đã cộng lãi vào ${new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`);
        }
      } catch (err) { console.error("[BANK] Lỗi khi cộng lãi:", err); }
    }, fiveHours);
  },

  onStart: async function ({ args, message, event, usersData }) {
    const senderID = event.senderID;
    const pathData = path.join(__dirname, "data", "bank.json");
    let users = JSON.parse(fs.readFileSync(pathData, "utf-8"));
    let findUser = users.find(u => u.senderID === senderID);

    const saveData = () => fs.writeFileSync(pathData, JSON.stringify(users, null, 2), "utf-8");

    const logTransaction = (type, amount) => {
      const time = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      if (!findUser.history) findUser.history = [];
      findUser.history.unshift({ type, amount: formatFullAmount(amount), time });
      if (findUser.history.length > 20) findUser.history.pop();
      saveData();
    };

    try {
      const command = args[0];

      // Chủ Nhật: chỉ cho check & history
      if (new Date().getDay() === 0 && command !== "check" && command !== "history") {
        return message.reply("🚫 Ngân hàng nghỉ Chủ Nhật, vui lòng quay lại sau.");
      }

      // Đăng ký
      if (command === "register" || command === "tạo") {
        if (!findUser) {
          users.push({ senderID, money: "0", history: [] });
          saveData();
          return message.reply(`[✅] Đăng ký thành công`);
        } else return message.reply(`[⚠️] Bạn đã có tài khoản rồi!`);
      }

      // Check số dư
      // Check số dư
if (command === "check") {
  if (new Date().getDay() === 0) {
    return message.reply("🚫 Hôm nay là Chủ Nhật, ngân hàng nghỉ. Vui lòng quay lại sau.");
  }

  let targetID = senderID;
  if (Object.keys(event.mentions).length > 0) targetID = Object.keys(event.mentions)[0];
  else if (event.messageReply) targetID = event.messageReply.senderID;

  const targetUser = users.find(u => u.senderID === targetID);
  if (!targetUser) {
    const targetName = (await usersData.getName(targetID));
    return message.reply(`[⚠️] ${targetName} chưa có tài khoản.`);
  }

  const balance = BigInt(targetUser.money);
  const displayBalance = formatFullAmount(balance);
  const targetName = (await usersData.getName(targetID));

  return message.reply(
    `[✅ SUCCESS] » Tài khoản ${targetName} trong GoatBank:\n` +
    `💰 Số dư: ${displayBalance}\n` +
    `♻️ Lãi suất: 0,025% mỗi 5 tiếng\n` +
    `⏳ Lần cộng lãi tiếp theo: ${getTimeRemaining()}\n` +
    `📌 Trạng thái tài khoản: Tốt`
  );
}

      // Gửi tiền
      if (command === "gửi" || command === "send") {
        if (!findUser) return message.reply(`[⚠️] Bạn chưa có tài khoản`);
        if (!args[1]) return message.reply("[⚠️] Nhập số tiền");
        let balances = (await usersData.get(senderID)).money;
        let rawAmount = args[1] !== "all" ? parseAmount(args[1]) : BigInt(balances);
        if (rawAmount === null) return message.reply("[⚠️] Số tiền không hợp lệ!");
        if (rawAmount < 100n) return message.reply("[⚠️] Tối thiểu gửi 100$");
       if (rawAmount > BigInt(balances)) {
  let missing = rawAmount - BigInt(balances);
  return message.reply(`[❌ FAILED] » Bạn không đủ tiền để gửi ngân hàng, còn thiếu ${formatFullAmount(missing)} nữa`);
}
        let fee = rawAmount * 15n / 1000n;
        let amountAfterFee = rawAmount - fee;
        findUser.money = String(BigInt(findUser.money) + amountAfterFee);
        await usersData.set(senderID, { money: balances - Number(rawAmount) });
        logTransaction("Gửi tiền (trừ phí 1.5%)", amountAfterFee);
        return message.reply(`[✅] Gửi thành công ${formatFullAmount(amountAfterFee)} (phí ${formatFullAmount(fee)})`);
      }

      // Rút tiền
      if (command === "rút" || command === "lấy") {
        if (!findUser) return message.reply(`[⚠️] Bạn chưa có tài khoản`);
        if (!args[1]) return message.reply("[⚠️] Nhập số tiền");
        let rawAmount = args[1] !== "all" ? parseAmount(args[1]) : BigInt(findUser.money);
        if (rawAmount === null) return message.reply("[⚠️] Số tiền không hợp lệ!");
        if (rawAmount < 10000n) return message.reply("[⚠️] Tối thiểu rút 10,000$");
        if (rawAmount > BigInt(findUser.money)) return message.reply(`[⚠️] Số dư không đủ`);
        let fee = rawAmount * 15n / 1000n;
        let amountAfterFee = rawAmount - fee;
        findUser.money = String(BigInt(findUser.money) - rawAmount);
        let balances = (await usersData.get(senderID)).money;
        await usersData.set(senderID, { money: balances + Number(amountAfterFee) });
        logTransaction("Rút tiền (trừ phí 1.5%)", amountAfterFee);
        return message.reply(`[✅] Rút thành công ${formatFullAmount(amountAfterFee)} (phí ${formatFullAmount(fee)})`);
      }

      // Lịch sử
      if (command === "history" || command === "lịch") {
        if (!findUser) return message.reply(`[⚠️] Bạn chưa có tài khoản`);
        const history = findUser.history || [];
        if (history.length === 0) return message.reply("📜 Chưa có giao dịch nào.");
        let msg = `📜 [LỊCH SỬ GIAO DỊCH - 5 lần gần nhất]\n\n`;
        history.slice(0, 5).forEach((item, index) => {
          msg += `${index + 1}. [${item.type}] - ${item.amount} vào ${item.time}\n`;
        });
        return message.reply(msg);
      }

      // Menu mặc định
      return message.reply(this.config.guide.body);

    } catch (e) {
      console.error(e);
      return message.reply("❌ Có lỗi xảy ra.");
    }
  }
};

// ==== Hàm tiện ích ====

function formatFullAmount(amount) {
  const units = [
    { unit: "g", value: 36n },
    { unit: "gb", value: 27n },
    { unit: "mb", value: 24n },
    { unit: "kb", value: 21n },
    { unit: "b", value: 18n },
    { unit: "m", value: 15n },
    { unit: "k", value: 12n }
  ];

  for (let u of units) {
    let unitValue = 10n ** u.value;
    if (amount >= unitValue) {
      return `${amount.toLocaleString("en-US")}$ (${u.unit})`;
    }
  }
  return `${amount.toLocaleString("en-US")}$`;
}

function parseAmount(str) {
  str = str.toLowerCase();
  const units = { 'k': 12n, 'm': 15n, 'b': 18n, 'kb': 21n, 'mb': 24n, 'gb': 27n, 'g': 36n };
  for (let u in units) {
    if (str.endsWith(u)) {
      let num = str.replace(u, "");
      if (isNaN(num)) return null;
      return BigInt(num) * (10n ** units[u]);
    }
  }
  if (!isNaN(str)) return BigInt(str);
  return null;
}

function getTimeRemaining() {
  const fiveHours = 5 * 60 * 60 * 1000;
  let elapsed = Date.now() - global.bankLastInterest;
  let remaining = fiveHours - elapsed;
  if (remaining < 0) remaining = 0;
  let hours = Math.floor(remaining / (60 * 60 * 1000));
  let minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  let seconds = Math.floor((remaining % (60 * 1000)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}