const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

// persistent hack toggle per thread
const hackStatusPath = path.join(__dirname, "data/status-hack.json");
let hackStatus = {};
try {
    fs.ensureDirSync(path.dirname(hackStatusPath));
    if (fs.existsSync(hackStatusPath))
        hackStatus = JSON.parse(fs.readFileSync(hackStatusPath));
    else
        fs.writeFileSync(hackStatusPath, JSON.stringify(hackStatus));
} catch {
    hackStatus = {};
}
function saveHackStatus() {
    try { fs.writeFileSync(hackStatusPath, JSON.stringify(hackStatus)); } catch { }
}

// in-memory tables
let tables = global.data_command_ban_tai_xiu;
if (!tables) tables = global.data_command_ban_tai_xiu = {};
if (!tables.s) tables.s = {};
if (!tables.t) tables.t = setInterval(() => Object.entries(tables.s).map($ => $[1] <= Date.now() ? delete tables.s[$[0]] : ''), 1000);

// game helpers
const rate = 1;
const minBet = 50;
const rollDelaySec = 10;
const selectText = { t: "Tài", x: "Xỉu" };
const unitZeros = { b: 18, kb: 21, mb: 24, gb: 27, k: 12, m: 15, g: 36 };
// Sử dụng ảnh local từ thư mục data
const dicePhotos = [
    path.join(__dirname, "data/6a4i23.jpeg"),
    path.join(__dirname, "data/zgkmx4.jpeg"),
    path.join(__dirname, "data/d1e1vo.jpeg"),
    path.join(__dirname, "data/mcnw26.jpeg"),
    path.join(__dirname, "data/ysxt7i.jpeg"),
    path.join(__dirname, "data/31o0v9.jpeg")
];
const diceStreams = {};
async function preloadDiceStreams() {
    // Đảm bảo thư mục data tồn tại
    const dataDir = path.join(__dirname, "data");
    fs.ensureDirSync(dataDir);

    const res = await Promise.all(dicePhotos.map(filePath => {
        try {
            if (fs.existsSync(filePath)) {
                return fs.createReadStream(filePath);
            } else {
                console.log(`File dice không tồn tại: ${filePath}`);
                return null;
            }
        } catch (error) {
            console.log(`Lỗi đọc file dice: ${filePath}`, error.message);
            return null;
        }
    }));
    res.forEach((s, i) => diceStreams[i + 1] = s);
}
function randomDice() { return (Math.random() * 6 + 1) << 0; }
function rollDices() { return [0, 0, 0].map(randomDice); }
function sumDices(d) { return d[0] + d[1] + d[2]; }
function dicesInRange(sMin, sMax) {
    while (true) {
        const i = rollDices();
        const s = sumDices(i);
        if (s >= sMin && s <= sMax) return i;
    }
}

// admin preview edits per thread
const pendingDiceEdits = {};

module.exports = {
    config: {
        name: "txiu",
        version: "2.0.0",
        author: "DC-Nam, ported to Goat V2 by tkiendz",
        countDown: 3,
        role: 0,
        description: {
            vi: "Chơi tài xỉu nhiều người",
            en: "Multiplayer Tai Xiu dice game"
        },
        category: "game",
        guide: {
            vi: "   {pn} create\n   tài|xỉu <số tiền|all|<phần trăm>%> (gửi tin nhắn)\n   {pn} xổ (chủ bàn)\n   info (gửi: info) | rời (gửi: rời) | end (QTV)",
            en: "   {pn} create\n   tai|xiu <amount|all|<percent>%> (send message)\n   {pn} roll (author)\n   info (send: info) | leave (send: leave) | end (admin)"
        }
    },

    onStart: async function ({ api, event, args, message, role, threadsData, usersData, commandName }) {
        const sid = event.senderID;
        const tid = event.threadID;
        const sub = (args[0] || "").toLowerCase();

        // admin: toggle hack preview
        if (sub == "hack") {
            if (role != 2)
                return message.reply("❎ Chỉ admin bot mới dùng được");
            return api.getThreadList(100, null, ["INBOX"], (err, list) => {
                if (err || !Array.isArray(list)) return message.reply("Không lấy được danh sách nhóm");
                const threadList = list.filter(t => t.isSubscribed && t.isGroup);
                const body = threadList.map((t, i) => `${i + 1}. ${hackStatus[t.threadID] ? 'on' : 'off'} - ${t.name}`).join('\n') + "\n\n📌 Reply số để on/off";
                return message.reply(body, (e, info) => {
                    if (e) return;
                    global.GoatBot.onReply.set(info.messageID, {
                        commandName,
                        author: sid,
                        messageID: info.messageID,
                        data: { type: "status.hack", threadList }
                    });
                });
            });
        }

        // create table
        if (["create", "c", "-c"].includes(sub)) {
            if (tid in tables) return message.reply("Nhóm đã tạo bàn tài xỉu rồi!");
            if (sid in tables.s) {
                const x = tables.s[sid] - Date.now();
                const mins = (x / 1000 / 60) << 0; const secs = ((x / 1000) % 60) << 0;
                return message.reply(`Hẹn gặp lại sau ${mins}p${secs}s`);
            }
            tables.s[sid] = Date.now() + 1000 * 60 * 5;
            tables[tid] = {
                author: sid,
                players: [],
                playing: false,
                set_timeout: setTimeout(() => {
                    delete tables[tid];
                    api.sendMessage('⛔ Đã 5p trôi qua không có ai xổ, tiến hành hủy bàn', tid);
                }, 1000 * 60 * 5)
            };
            return message.reply('Tạo bàn tài xỉu thành công\nXin mời đặt cược');
        }

        // roll by command
        if (sub == "xổ" || sub == "roll") {
            if (!(tid in tables)) return message.reply("Chưa có bàn nào trong nhóm này");
            if (tables[tid].author != sid) return message.reply("Bạn không phải chủ bàn");
            if (tables[tid].players.length == 0) return message.reply("Chưa có ai tham gia đặt cược");
            await this._roll({ api, event, message, usersData });
            return;
        }

        // end by admin box (vote via reaction)
        if (sub == "end") {
            if (!(tid in tables)) return message.reply(`Nhóm chưa tạo bàn tài xỉu`);
            const tData = await threadsData.get(tid);
            if ((tData.adminIDs || []).map(String).includes(String(sid))) {
                const p = tables[tid].players;
                const names = await Promise.all(p.map(pl => usersData.getName(pl.id) || "Người dùng"));
                const msg = `QTV đã yêu cầu kết thúc bàn tài xỉu, những người đặt cược sau đây thả cảm xúc để xác nhận.\n\n${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\nTổng cảm xúc đạt ${Math.ceil(p.length * 50 / 100)}/${p.length} người bàn tài xỉu sẽ kết thúc.`;
                return message.reply(msg, (e, info) => {
                    if (e) return;
                    global.GoatBot.onReaction.set(info.messageID, {
                        commandName,
                        messageID: info.messageID,
                        author: sid,
                        data: { type: "end.vote", p, r: 0, tid }
                    });
                });
            }
            else return message.reply("Bạn không phải QTV");
        }

        // default guide
        return message.SyntaxError();
    },

    onChat: async function ({ api, event, message, usersData, threadsData }) {
        if (event.type == 'message_unsend') return;
        const sid = event.senderID;
        const tid = event.threadID;
        const body = event.body || "";
        const tokens = body.trim().split(/\s+/);
        const first = (tokens[0] || "").toLowerCase();
        const select = /^(tài|tai|t)$/.test(first) ? 't'
            : /^(xỉu|xiu|x)$/.test(first) ? 'x'
                : /^(rời|leave)$/.test(first) ? 'l'
                    : /^(info|stt)$/.test(first) ? 'i'
                        : /^(end|remove|xóa)$/.test(first) ? 'r' : null;

        if (!(tid in tables) || select == null) return;
        const p = tables[tid].players;
        const send = (msg, atThread) => new Promise(r => api.sendMessage(msg, atThread || tid, (e, info) => r([e, info])));

        if (tables[tid].playing == true)
            return send('Đang xổ, dừng đặt cược');

        // bet
        if (['t', 'x'].includes(select)) {
            let betToken = tokens[1];
            if (!betToken) return send('Thiếu số tiền cược');
            const currentMoney = await usersData.getMoney(sid) || 0;
            let bet = null;
            if (/^(allin|all)$/i.test(betToken)) bet = currentMoney;
            else if (/^[0-9]+%$/.test(betToken)) bet = Math.floor(currentMoney * (parseInt(betToken) / 100));
            else {
                const unit = Object.entries(unitZeros).find(([k]) => new RegExp(`^[0-9]+${k}$`, 'i').test(betToken));
                if (unit) bet = Number((betToken.replace(unit[0], '0'.repeat(unit[1]))));
                else bet = Number(betToken);
            }
            if (!isFinite(bet)) return send('Tiền cược không hợp lệ');
            if (bet < minBet) return send(`Vui lòng đặt ít nhất ${minBet.toLocaleString()}$`);
      if (bet > currentMoney) {
    const missing = bet - currentMoney;
    return send(`Bạn không đủ tiền cược, số tiền còn thiếu: ${missing.toLocaleString()}$`);
}

            const existing = p.find($ => $.id == sid);
            if (existing) {
                const old = existing.bet_money;
                existing.select = select;
                existing.bet_money = bet;
                return send(`Đã thay đổi cược từ ${selectText[existing.select]} ${old.toLocaleString()}$ sang ${selectText[select]} ${bet.toLocaleString()}$`);
            }
            p.push({ id: sid, select, bet_money: bet });
            return send(`Bạn đã cược ${selectText[select]} với số tiền ${bet.toLocaleString()}$`);
        }

        // leave
        if (select == 'l') {
            if (sid == tables[tid].author) {
                clearTimeout(tables[tid].set_timeout);
                delete tables[tid];
                return send('Rời bàn thành công, chủ bàn rời nên bàn đã bị huỷ');
            }
            const idx = p.findIndex($ => $.id == sid);
            if (idx != -1) { p.splice(idx, 1); return send('Rời bàn thành công'); }
            return send('❎ Bạn không có trong bàn tài xỉu');
        }

        // info
        if (select == 'i') {
            const names = await Promise.all(p.map(pl => usersData.getName(pl.id)));
            const owner = await usersData.getName(tables[tid].author);
            const bodyMsg = `[ Thông Tin Bàn Tài Xỉu ]\n Tổng ${p.length} người tham gia gồm:\n` +
                p.map((pl, i) => ` ${i + 1}. ${names[i] || pl.id} cược ${pl.bet_money.toLocaleString()}$ vào (${selectText[pl.select]})`).join('\n') +
                `\nChủ bàn: ${owner || tables[tid].author}`;
            return send(bodyMsg);
        }

        // request end by admin box (vote)
        if (select == 'r') {
            const tData = await threadsData.get(tid);
            if ((tData.adminIDs || []).map(String).includes(String(sid))) {
                const names = await Promise.all(p.map(pl => usersData.getName(pl.id)));
                const msg = `QTV đã yêu cầu kết thúc bàn tài xỉu những người đặt cược sau đây thả cảm xúc để xác nhận.\n\n${names.map((n, i) => `${i + 1}. ${n || p[i].id}`).join('\n')}\n\nTổng cảm xúc đạt ${Math.ceil(p.length * 50 / 100)}/${p.length} người bàn tài xỉu sẽ kết thúc.`;
                const [, info] = await send(msg);
                global.GoatBot.onReaction.set(info.messageID, {
                    commandName: module.exports.config.name,
                    messageID: info.messageID,
                    author: sid,
                    data: { type: "end.vote", p, r: 0, tid }
                });
            }
        }
    },

    onReply: async function ({ Reply, event, message }) {
        const sid = event.senderID;
        const data = Reply.data || {};
        if (sid != Reply.author) return;
        if (data.type == "status.hack") {
            const indexes = (event.body || "").split(/\s+/).map(x => parseInt(x, 10)).filter(n => n >= 1 && n <= data.threadList.length);
            if (indexes.length == 0) return;
            const changes = [];
            for (const idx of indexes) {
                const th = data.threadList[idx - 1];
                hackStatus[th.threadID] = !hackStatus[th.threadID];
                changes.push(`${idx}. ${th.name} - ${hackStatus[th.threadID] ? 'on' : 'off'}`);
            }
            saveHackStatus();
            return message.reply(changes.join('\n'));
        }
        if (data.type == "change.result.dices") {
            const args = (event.body || '').trim().split(/\s+/);
            if (args.length == 3 && args.every($ => isFinite($) && $ > 0 && $ < 7)) {
                pendingDiceEdits[data.tid] = args.map(Number);
                return message.reply('✅ Đã thay đổi kết quả tài xỉu');
            }
            if (/^(tài|tai|t|xỉu|xiu|x)$/i.test(args[0] || '')) {
                const arr = /^(tài|tai|t)$/i.test(args[0]) ? dicesInRange(11, 17) : dicesInRange(4, 10);
                pendingDiceEdits[data.tid] = arr;
                return message.reply(`✅ Đã thay đổi kết quả thành ${args[0]}\n🎲 Xúc xắc: ${arr.join('.')}`);
            }
            return message.reply('⚠️ Vui lòng reply tài/xỉu hoặc 3 số của mặt xúc xắc\nVD: 2 3 4');
        }
    },

    onReaction: async function ({ Reaction, event, message }) {
        const data = Reaction.data || {};
        const tid = data.tid;
        if (data.type != "end.vote") return;
        if (!(tid in tables)) return message.reply('❎ Bàn tài xỉu đã kết thúc không thể bỏ phiếu tiếp');
        const userID = event.userID;
        if (data.p.some($ => $.id == userID)) {
            data.r = (data.r || 0) + 1;
            await message.reply(`📌 Đã có ${data.r}/${data.p.length} phiếu`);
            if (data.r >= Math.ceil(data.p.length * 50 / 100)) {
                clearTimeout(tables[tid].set_timeout);
                delete tables[tid];
                await message.reply('✅ Đã hủy bàn tài xỉu thành công');
            }
        }
    },

    // internal: execute roll
    _roll: async function ({ api, event, message, usersData }) {
        const tid = event.threadID;
        const table = tables[tid];
        if (!table) return;
        table.playing = true;
        await preloadDiceStreams();
        const [, diing] = await new Promise(r => api.sendMessage(`Đang xổ!!!`, tid, (e, info) => r([e, info])));

        let dices = rollDices();
        let sum = sumDices(dices);
        let winner = sum > 10 ? 't' : 'x';
        let winnerPlayers = table.players.filter($ => $.select == winner);
        let losePlayers = table.players.filter($ => $.select != winner);

        // admin preview
        if (hackStatus[tid]) {
            const admins = (global.GoatBot.config.adminBot || []).map(String);
            for (const adminID of admins) {
                const winnersPreviewArr = await Promise.all(winnerPlayers.map(async ($, i) => {
                    const name = await usersData.getName($.id) || $.id;
                    const inc = ($.bet_money * rate).toLocaleString();
                    return `${i + 1}. ${name} chọn (${selectText[$.select]})\n⬆️ ${inc}$`;
                }));
                const losersPreviewArr = await Promise.all(losePlayers.map(async ($, i) => {
                    const name = await usersData.getName($.id) || $.id;
                    return `${i + 1}. ${name} chọn (${selectText[$.select]})\n⬇️ ${$.bet_money.toLocaleString()}$`;
                }));
                const previewBody = `[ KẾT QUẢ XEM TRƯỚC ]\n────────────────────\n🎲 Xúc xắc: ${dices.join(' | ')} - ${sum} điểm\n📝 Kết quả: ${selectText[winner]}\n🎰 Tỉ lệ ăn 1:${rate}\n🏆 Tổng Kết:\n👑 Những người thắng:\n${winnersPreviewArr.join('\n')}\n\n💸 Những người thua:\n${losersPreviewArr.join('\n')}\n────────────────────`;
                await new Promise(r => api.sendMessage(
                    previewBody,
                    adminID,
                    (e, info) => {
                        if (!e) {
                            global.GoatBot.onReply.set(info.messageID, {
                                commandName: module.exports.config.name,
                                author: adminID,
                                messageID: info.messageID,
                                data: { type: "change.result.dices", tid }
                            });
                        }
                        r();
                    }
                ));
            }
        }

        await new Promise(r => setTimeout(r, 1000 * rollDelaySec));
        if (diing?.messageID) api.unsendMessage(diing.messageID);

        // apply edit if any
        if (pendingDiceEdits[tid]) {
            dices = pendingDiceEdits[tid];
            delete pendingDiceEdits[tid];
            sum = sumDices(dices);
            winner = sum > 10 ? 't' : 'x';
            winnerPlayers = table.players.filter($ => $.select == winner);
            losePlayers = table.players.filter($ => $.select != winner);
        }

        const ownerName = await usersData.getName(table.author) || table.author;
        const winLines = await Promise.all(winnerPlayers.map(async ($) => {
            const inc = $.bet_money * rate;
            await usersData.addMoney($.id, inc);
            const name = await usersData.getName($.id) || $.id;
            return ` ${name}: +${inc.toLocaleString()}$`;
        }));
        const loseLines = await Promise.all(losePlayers.map(async ($) => {
            await usersData.subtractMoney($.id, $.bet_money);
            const name = await usersData.getName($.id) || $.id;
            return ` ${name}: -${$.bet_money.toLocaleString()}$`;
        }));

        await new Promise(r => api.sendMessage({
            body: `Kết quả: ${selectText[winner]} [${sum}]\nNhững người chiến thắng:\n${winLines.join('\n') || 'Không có'}\nNhững người chơi thua:\n${loseLines.join('\n') || 'Không có'}\nChủ bàn: ${ownerName}`,
            attachment: require('fs').createReadStream(__dirname + '/tximg/' + [0, 1, 2].map(a => dices[a]).join('') + '.jpg')
        }, tid, () => r()));

        clearTimeout(table.set_timeout);
        delete tables[tid];
    }
};
