/**
 * pay.js
 * Chuyển tiền — tương thích với nhiều API usersData / currenciesData / Currencies
 * - Hỗ trợ BigInt
 * - Phí mặc định 5%
 * - Rollback nếu tăng tiền người nhận lỗi
 */

module.exports = {
  config: {
    name: "pay",
    version: "1.0.4",
    author: "Tiến & Kiên (chỉnh sửa bởi ChatGPT)",
    countDown: 5,
    role: 0,
    shortDescription: "Chuyển tiền",
    longDescription: "Chuyển tiền cho người khác (hỗ trợ nhiều storage API, cú pháp: -pay 1000 @tag hoặc -pay @tag 1000)",
    category: "bank",
    guide: "{p}pay [số tiền] [tag/reply]\n{p}pay [tag/reply] [số tiền]"
  },

  // format BigInt hoặc Number -> "1,234,567"
  formatNumber(value) {
    try {
      const s = (typeof value === "bigint" ? value.toString() : String(value));
      return s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } catch {
      return String(value);
    }
  },

  // parse số tiền (giữ mapping giống hệ của bạn: k -> 12, m -> 15, ...)
  parseCoins(val, balanceBigInt = 0n) {
    if (!val) return NaN;
    if (typeof val === "string" && (val.toLowerCase() === "all" || val.toLowerCase() === "allin")) {
      return BigInt(balanceBigInt);
    }
    const match = String(val).trim().match(/^(\d+)([a-zA-Z]+)?$/);
    if (!match) return NaN;
    let amount = BigInt(match[1]);
    const unit = match[2] ? match[2].toLowerCase() : "";
    const f = { k: 12, m: 15, b: 18, kb: 21, mb: 24, gb: 27, g: 36 };
    if (unit) {
      if (!f[unit]) return NaN;
      amount *= 10n ** BigInt(f[unit]);
    }
    return amount;
  },

  /**
   * Helpers đọc/ghi balance tương thích nhiều API
   */
  async _getBalance(uid, usersData, currenciesData, Currencies) {
    try {
      if (usersData && typeof usersData.get === "function") {
        const d = await usersData.get(uid);
        if (d && (d.money !== undefined)) return BigInt(d.money);
        try {
          const single = await usersData.get(uid, "money");
          if (single !== undefined) return BigInt(single);
        } catch {}
      }
      if (currenciesData && typeof currenciesData.get === "function") {
        const d = await currenciesData.get(uid);
        if (d && d.money !== undefined) return BigInt(d.money);
      }
      if (Currencies && typeof Currencies.getData === "function") {
        const d = await Currencies.getData(uid);
        if (d && d.money !== undefined) return BigInt(d.money);
      }
    } catch (e) {
      console.error("Error reading balance:", e);
    }
    return 0n;
  },

  async _setBalance(uid, newBigInt, usersData, currenciesData, Currencies) {
    const useString = (newBigInt > BigInt(Number.MAX_SAFE_INTEGER) || newBigInt < BigInt(Number.MIN_SAFE_INTEGER));
    const payload = useString ? { money: newBigInt.toString() } : { money: Number(newBigInt) };

    if (usersData && typeof usersData.set === "function") {
      const old = await usersData.get(uid).catch(() => null) || {};
      const merged = { ...old, ...payload };
      return await usersData.set(uid, merged);
    }
    if (currenciesData && typeof currenciesData.set === "function") {
      return await currenciesData.set(uid, payload);
    }
    if (Currencies && typeof Currencies.setData === "function") {
      return await Currencies.setData(uid, payload);
    }
    throw new Error("No storage method found");
  },

  async _increase(uid, amountBigInt, usersData, currenciesData, Currencies) {
    try {
      if (usersData && typeof usersData.increaseMoney === "function") {
        if (amountBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          const cur = await this._getBalance(uid, usersData, currenciesData, Currencies);
          return this._setBalance(uid, cur + amountBigInt, usersData, currenciesData, Currencies);
        } else return usersData.increaseMoney(uid, Number(amountBigInt));
      }
      if (currenciesData && typeof currenciesData.increase === "function") {
        if (amountBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          const cur = await this._getBalance(uid, usersData, currenciesData, Currencies);
          return this._setBalance(uid, cur + amountBigInt, usersData, currenciesData, Currencies);
        } else return currenciesData.increase(uid, Number(amountBigInt));
      }
      if (Currencies && typeof Currencies.increaseMoney === "function") {
        if (amountBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          const cur = await this._getBalance(uid, usersData, currenciesData, Currencies);
          return this._setBalance(uid, cur + amountBigInt, usersData, currenciesData, Currencies);
        } else return Currencies.increaseMoney(uid, Number(amountBigInt));
      }
    } catch (e) {
      console.warn("_increase direct API failed:", e?.message);
    }
    const cur = await this._getBalance(uid, usersData, currenciesData, Currencies);
    return this._setBalance(uid, cur + amountBigInt, usersData, currenciesData, Currencies);
  },

  async _decrease(uid, amountBigInt, usersData, currenciesData, Currencies) {
    try {
      if (usersData && typeof usersData.decreaseMoney === "function") {
        if (amountBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          const cur = await this._getBalance(uid, usersData, currenciesData, Currencies);
          const next = cur - amountBigInt < 0n ? 0n : cur - amountBigInt;
          return this._setBalance(uid, next, usersData, currenciesData, Currencies);
        } else return usersData.decreaseMoney(uid, Number(amountBigInt));
      }
      if (currenciesData && typeof currenciesData.decrease === "function") {
        if (amountBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          const cur = await this._getBalance(uid, usersData, currenciesData, Currencies);
          const next = cur - amountBigInt < 0n ? 0n : cur - amountBigInt;
          return this._setBalance(uid, next, usersData, currenciesData, Currencies);
        } else return currenciesData.decrease(uid, Number(amountBigInt));
      }
      if (Currencies && typeof Currencies.decreaseMoney === "function") {
        if (amountBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
          const cur = await this._getBalance(uid, usersData, currenciesData, Currencies);
          const next = cur - amountBigInt < 0n ? 0n : cur - amountBigInt;
          return this._setBalance(uid, next, usersData, currenciesData, Currencies);
        } else return Currencies.decreaseMoney(uid, Number(amountBigInt));
      }
    } catch (e) {
      console.warn("_decrease direct API failed:", e?.message);
    }
    const cur = await this._getBalance(uid, usersData, currenciesData, Currencies);
    const next = cur - amountBigInt < 0n ? 0n : cur - amountBigInt;
    return this._setBalance(uid, next, usersData, currenciesData, Currencies);
  },

  async _getName(uid, usersData, Users) {
    try {
      if (Users && typeof Users.getNameUser === "function") return await Users.getNameUser(uid);
      if (usersData && typeof usersData.getName === "function") return await usersData.getName(uid);
      if (global?.data?.userName?.get(uid)) return global.data.userName.get(uid);
    } catch {}
    return String(uid);
  },

  // ================== MAIN ==================
  onStart: async function ({ event, args, message, usersData, currenciesData, Currencies, Users }) {
    try {
      const { senderID, messageReply, mentions } = event;
      const mentionIDs = Object.keys(mentions || {});
      const mention = mentionIDs[0];

      const balance = await this._getBalance(senderID, usersData, currenciesData, Currencies);

      // ===================== CHỈNH Ở ĐÂY =====================
      let coinsArg = null;
      let receiverID = null;

      if (mention) {
        receiverID = mention;
        // Nếu args[0] là số thì cú pháp cũ: -pay 1000 @tag
        // Nếu không phải số thì cú pháp mới: -pay @tag 1000
        const testAmount = this.parseCoins(args[0], balance);
        if (typeof testAmount === "bigint" && testAmount > 0n) {
          coinsArg = args[0];
        } else {
          coinsArg = args[args.length - 1];
        }
      } else if (messageReply && messageReply.senderID) {
        receiverID = messageReply.senderID;
        coinsArg = args[0];
      } else {
        return message.reply("⚠️ Vui lòng tag hoặc reply người bạn muốn chuyển tiền!\nVí dụ:\n-pay 1000 @tag hoặc -pay @tag 1000");
      }
      // =======================================================

      const coins = this.parseCoins(coinsArg, balance);
      if (!coins || typeof coins !== "bigint" || coins <= 0n) {
        return message.reply("❌ Vui lòng nhập số tiền hợp lệ!");
      }
      if (coins < 1000n) {
        return message.reply("⚠️ Số tiền tối thiểu có thể chuyển là 1000$");
      }
      if (coins > balance) {
        return message.reply("⚠️ Số tiền bạn muốn chuyển lớn hơn số dư hiện tại!");
      }

      if (String(receiverID) === String(senderID)) {
        return message.reply("❌ Bạn không thể chuyển tiền cho chính mình!");
      }

      const feePercent = 5n;
      const feeAmount = (coins * feePercent) / 100n;
      const netAmount = coins - feeAmount;

      const receiverName = await this._getName(receiverID, usersData, Users);

      await this._decrease(senderID, coins, usersData, currenciesData, Currencies);
      try {
        await this._increase(receiverID, netAmount, usersData, currenciesData, Currencies);
      } catch (e) {
        await this._increase(senderID, coins, usersData, currenciesData, Currencies); // rollback
        throw e;
      }

      return message.reply(`✅ Đã chuyển ${this.formatNumber(netAmount)}$ cho ${receiverName}\n💸 Phí giao dịch: ${feePercent}%`);
    } catch (e) {
      console.error("PAY ERROR:", e);
      return message.reply("❌ Đã xảy ra lỗi khi thực hiện lệnh! (xem logs trên console)");
    }
  }
};