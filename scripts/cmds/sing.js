const fs = require("fs");
const ytdl = require("@distube/ytdl-core");
const axios = require("axios");

async function downloadMusicFromYoutube(url, path) {
  const timestart = Date.now();

  try {
    const info = await ytdl.getInfo(url);
    const selectedFormat = info.formats
      .filter((format) => format.hasAudio && format.hasVideo)
      .sort((a, b) => a.contentLength - b.contentLength)
      .slice(0, 1)[0];

    if (!selectedFormat) {
      throw new Error("No suitable format found.");
    }

    const audioStream = ytdl.downloadFromInfo(info, { format: selectedFormat });
    const writeStream = fs.createWriteStream(path);

    await new Promise((resolve, reject) => {
      audioStream.pipe(writeStream);
      audioStream.on("end", resolve);
      audioStream.on("error", reject);
    });

    const data = await getVideoInfo(url);
    return {
  title: data.videoDetails.title,
  dur: Number(data.videoDetails.lengthSeconds),
  viewCount: data.videoDetails.viewCount,
  likes: data.videoDetails.likes,
  author: data.videoDetails.author,  
  timestart
};
  } catch (error) {
    throw {
      error: "DOWNLOAD_ERROR",
      message: "❌ Đã xảy ra lỗi trong quá trình tải xuống"
    };
  }
}

function convertHMS(value) {
  const sec = parseInt(value, 10);
  let hours = Math.floor(sec / 3600);
  let minutes = Math.floor((sec - hours * 3600) / 60);
  let seconds = sec - hours * 3600 - minutes * 60;
  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;
  if (seconds < 10) seconds = "0" + seconds;
  return (hours != "00" ? hours + ":" : "") + minutes + ":" + seconds;
}

module.exports = {
  config: {
    name: "sing",
    version: "1.0.1",
    author: "D-Jukie (GoatBot convert + edit by ChatGPT)",
    countDown: 0,
    role: 0,
    shortDescription: "Phát nhạc qua YouTube",
    longDescription: "Phát nhạc thông qua link YouTube hoặc từ khoá tìm kiếm",
    category: "box chat",
    guide: "{pn} [tên bài hát | link YouTube]"
  },

  onStart: async function ({ message, event, args, api }) {
    if (!args[0]) {
      return message.reply("» Phần tìm kiếm không được để trống!");
    }

    const keywordSearch = args.join(" ");
    const path = `${__dirname}/cache/sing-${event.senderID}-${Date.now()}.mp3`;
    if (fs.existsSync(path)) fs.unlinkSync(path);

    // Nếu nhập link YouTube
    if (args[0].startsWith("https://")) {
      try {
        const data = await downloadMusicFromYoutube(keywordSearch, path);
        if (fs.statSync(path).size > 26214400) {
          return message.reply("❌ File lớn hơn 25MB, không thể gửi.", () =>
            fs.unlinkSync(path)
          );
        }
        return message.reply(
          {
            body: `🎶 Title: ${data.title}\n📻 Kênh: ${data.author}\n⏱️ Thời gian: ${convertHMS(
              data.dur
            )}\n👀 View: ${data.viewCount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`,
            attachment: fs.createReadStream(path)
          },
          () => fs.unlinkSync(path)
        );
      } catch (e) {
        return message.reply(e.message || "❌ Lỗi tải nhạc");
      }
    }

    // Nếu nhập từ khoá → tìm kiếm
    try {
      const results = (await search(keywordSearch)).slice(0, 5);
      if (results.length === 0) return message.reply("» Không tìm thấy kết quả nào!");

      let msg = "";
      let num = 1;
      for (const value of results) {
        msg += `${num++}. ${value.title} (${value.time})\n`;
      }

      const sent = await message.reply(
        `🔎 Có ${results.length} kết quả trùng với từ khoá:\n\n${msg}\n» Reply số để chọn bài hát.`
      );

      global.GoatBot.onReply.set(sent.messageID, {
        commandName: this.config.name,
        authorID: event.senderID,
        links: results.map(r => r.id),
        replyMessageID: sent.messageID // 👈 lưu để xoá sau khi chọn
      });
    } catch (e) {
      return message.reply("❌ Lỗi tìm kiếm video!");
    }
  },

  onReply: async function ({ event, Reply, message, api }) {
    if (event.senderID !== Reply.authorID) return;
    const choice = parseInt(event.body);
    const id = Reply.links[choice - 1];
    if (!id) return message.reply("❌ Lựa chọn không hợp lệ.");

    // 👇 xoá tin nhắn danh sách tìm kiếm sau khi chọn
    if (Reply.replyMessageID) {
      try {
        api.unsendMessage(Reply.replyMessageID);
      } catch {}
    }

    const path = `${__dirname}/cache/sing-${event.senderID}-${Date.now()}.mp3`;
    try {
      const data = await downloadMusicFromYoutube(`https://www.youtube.com/watch?v=${id}`, path);
      if (fs.statSync(path).size > 26214400) {
        return message.reply("❌ File lớn hơn 25MB, không thể gửi.", () =>
          fs.unlinkSync(path)
        );
      }
      return message.reply(
        {
          body: `🎶 Title: ${data.title}\n📻 Kênh: ${data.author}\n⏱️ Thời gian: ${convertHMS(
            data.dur
          )}\n👀 View: ${data.viewCount.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`,
          attachment: fs.createReadStream(path)
        },
        () => fs.unlinkSync(path)
      );
    } catch (e) {
      return message.reply("❌ Không thể tải bài hát này.");
    }
  }
};

async function search(keyWord) {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyWord)}`;
    const res = await axios.get(url);
    const video = JSON.parse(res.data.split("ytInitialData = ")[1].split(";</script>")[0]);
    return video.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents
      .filter(item => item.videoRenderer)
      .map(item => {
        return {
          id: item.videoRenderer.videoId,
          title: item.videoRenderer.title.runs[0].text,
          thumbnail: item.videoRenderer.thumbnail.thumbnails.pop().url,
          time: item.videoRenderer.lengthText?.simpleText || ""
        };
      });
  } catch (e) {
    throw new Error("SEARCH_VIDEO_ERROR");
  }
}

async function getVideoInfo(id) {
  id = id.replace(/(>|<)/gi, "").split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
  id = id[2] !== undefined ? id[2].split(/[^0-9a-z_\-]/i)[0] : id[0];

  const { data: html } = await axios.get(`https://youtu.be/${id}?hl=en`, {
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });
  const json = JSON.parse(html.match(/var ytInitialPlayerResponse = (.*?});/)[1]);
  return json;
}