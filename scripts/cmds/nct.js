const fs = require("fs");
const axios = require("axios");
const client = axios.create({
  baseURL: "https://graph.nhaccuatui.com",
  timeout: 20000,
  validateStatus: s => s >= 200 && s < 600
});

function toStreamsMap(list = []) {
  const map = {};
  for (const u of list) {
    const t = u.type || u.typeUI || "";
    if (!t) continue;
    map[t] = {
      stream: u.stream || null,
      download: u.download || null,
      onlyVIP: !!u.onlyVIP,
      status: u.status || 0,
      order: u.order || 0
    };
  }
  return map;
}

function pickBestNonVIP(list = [], pref = ["lossless", "320", "128"]) {
  for (const t of pref) {
    const x = list.find(v => (v.type === t || v.typeUI === t) && v.status === 1 && !v.onlyVIP);
    if (x) return { type: t, url: x.stream || x.download || null };
  }
  return null;
}

function normalizeSong(s = {}) {
  const streams = toStreamsMap(s.streamURL || []);
  const best = pickBestNonVIP(s.streamURL || []);
  return {
    key: s.key || null,
    title: s.name || null,
    artists: Array.isArray(s.artist) && s.artist.length ? s.artist.map(a => a.name).filter(Boolean) : (s.artistName ? String(s.artistName).split(",").map(v => v.trim()) : []),
    duration: s.duration || 0,
    image: s.image || s.bgImage || null,
    linkShare: s.linkShare || null,
    releasedAt: s.dateRelease || null,
    genre: { id: s.genreId || null, name: s.genreName || null },
    provider: s.provider?.name || null,
    liked: s.totalLiked || 0,
    shareCnt: s.shareCnt || 0,
    commentCnt: s.commentCnt || 0,
    vipFree: !!s.vipFree,
    qualities: Object.keys(streams),
    streams,
    best
  };
}

async function searchSongs(keyword, correct = false) {
  const ts = Date.now();
  const res = await client.post("/api/v3/search/all", {}, { params: { keyword, correct, timestamp: ts }, headers: { "x-nct-time": ts } });
  if (res.status >= 400 || !res.data) throw new Error("Search failed");
  const d = res.data?.data || {};
  const songs = Array.isArray(d.songs) ? d.songs.map(normalizeSong) : [];
  return songs;
}

async function downloadToFile(url, path) {
  const res = await axios({ url, method: "GET", responseType: "stream" });
  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(path);
    res.data.pipe(ws);
    res.data.on("error", reject);
    ws.on("finish", resolve);
    ws.on("error", reject);
  });
}

function formatDuration(sec = 0) {
  const s = Math.max(0, Number(sec) | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = r.toString().padStart(2, "0");
  return (h ? h + ":" : "") + mm + ":" + ss;
}

module.exports = {
  config: {
    name: "nct",
    version: "1.0.0",
    author: "DongDev, LocDev",
    countDown: 0,
    role: 0,
    shortDescription: "Tìm và gửi nhạc từ Nhaccuatui",
    longDescription: "Tìm kiếm bài hát trên Nhaccuatui và chọn để tải gửi xuống",
    category: "box chat",
    guide: "{pn} <từ khóa>"
  },

  onStart: async function ({ message, event, args }) {
    const query = args.join(" ").trim();
    if (!query) return message.reply("» Vui lòng nhập từ khóa để tìm bài hát NCT.");

    let results;
    try {
      results = await searchSongs(query, true);
    } catch (e) {
      return message.reply("❌ Lỗi tìm kiếm Nhaccuatui, vui lòng thử lại sau.");
    }

    if (!results.length) return message.reply("» Không tìm thấy kết quả phù hợp.");

    const top = results.slice(0, 8);
    let text = top
      .map((s, i) => `${i + 1}. ${s.title} - ${s.artists.join(", ") || "Unknown"}${s.best?.url ? "" : " (VIP/không có link)"}`)
      .join("\n");

    const sent = await message.reply(`🔎 Kết quả cho: ${query}\n\n${text}\n\n» Reply số để chọn bài muốn gửi.`);

    global.GoatBot.onReply.set(sent.messageID, {
      commandName: this.config.name,
      authorID: event.senderID,
      items: top,
      replyMessageID: sent.messageID
    });
  },

  onReply: async function ({ event, Reply, message, api }) {
    if (event.senderID !== Reply.authorID) return;
    const choice = parseInt(event.body, 10);
    if (!Number.isInteger(choice) || choice < 1 || choice > Reply.items.length)
      return message.reply("❌ Lựa chọn không hợp lệ.");

    const selected = Reply.items[choice - 1];
    const best = selected.best;
    if (!best?.url) return message.reply("❌ Bài hát này yêu cầu VIP hoặc không lấy được link.");

    // cố gắng xoá danh sách sau khi chọn
    try { api.unsendMessage(Reply.messageID || Reply.replyMessageID || ""); } catch {}

    const path = `${__dirname}/cache/nct-${event.senderID}-${Date.now()}.mp3`;
    try {
      await downloadToFile(best.url, path);
      if (fs.statSync(path).size > 26214400) {
        return message.reply("❌ File lớn hơn 25MB, không thể gửi.", () => fs.unlinkSync(path));
      }
      await message.reply({
        body: `🎵 ${selected.title}\n👤 ${selected.artists.join(", ") || "Unknown"}\n🎚️ Chất lượng: ${best.type || "unknown"}\n⏱️ Thời lượng: ${formatDuration(selected.duration)}`,
        attachment: fs.createReadStream(path)
      });
    } catch (e) {
      return message.reply("❌ Không thể tải bài hát này.");
    } finally {
      if (fs.existsSync(path)) try { fs.unlinkSync(path); } catch {}
    }
  }
};
