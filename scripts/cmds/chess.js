const { createCanvas, loadImage } = require("canvas");
const { Chess } = require("chess.js");

const _8 = [...Array(8)].map((_, i) => i);
const pieceUrls = {
  p: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Chess_pdt60.png",
  r: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Chess_rdt60.png",
  n: "https://upload.wikimedia.org/wikipedia/commons/f/f1/Chess_ndt60.png",
  b: "https://upload.wikimedia.org/wikipedia/commons/8/81/Chess_bdt60.png",
  q: "https://upload.wikimedia.org/wikipedia/commons/a/af/Chess_qdt60.png",
  k: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Chess_kdt60.png",
  P: "https://upload.wikimedia.org/wikipedia/commons/0/04/Chess_plt60.png",
  R: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Chess_rlt60.png",
  N: "https://upload.wikimedia.org/wikipedia/commons/2/28/Chess_nlt60.png",
  B: "https://upload.wikimedia.org/wikipedia/commons/9/9b/Chess_blt60.png",
  Q: "https://upload.wikimedia.org/wikipedia/commons/4/49/Chess_qlt60.png",
  K: "https://upload.wikimedia.org/wikipedia/commons/3/3b/Chess_klt60.png"
};

let pieceImages = {};
async function loadPieces() {
  const keys = Object.keys(pieceUrls);
  const imgs = await Promise.all(keys.map(k => loadImage(pieceUrls[k])));
  imgs.forEach((img, i) => (pieceImages[keys[i]] = img));
}

function drawBoardStream(chess) {
  const canvas = createCanvas(500, 500);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 500, 500);

  _8.forEach(i =>
    _8.forEach(j => {
      ctx.fillStyle = (i + j) % 2 === 0 ? "#fff" : "#999";
      ctx.fillRect(i * 50 + 50, j * 50 + 50, 50, 50);
    })
  );

  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 50, 400, 400);

  ctx.font = "bold 20px Arial";
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  _8.forEach(i => ctx.fillText(8 - i, 25, i * 50 + 75));
  _8.forEach(i => ctx.fillText(String.fromCharCode(65 + i), i * 50 + 75, 475));

  chess.board().forEach((row, i) =>
    row.forEach((sq, j) => {
      if (!sq) return;
      const key = sq.color === "b" ? sq.type : sq.type.toUpperCase();
      ctx.drawImage(pieceImages[key], j * 50 + 50, i * 50 + 50, 50, 50);
    })
  );

  return canvas.createPNGStream(); // readable stream
}

async function sendBoard(api, threadID, chess) {
  // CHỈ gửi body và attachment, KHÔNG mentions
  return api.sendMessage(
    {
      body: `Lượt của quân ${chess.turn() === "b" ? "đen" : "trắng"}`,
      attachment: drawBoardStream(chess)
    },
    threadID
  );
}

module.exports = {
  config: {
    name: "chess",
    version: "1.1.1",
    author: "DC-Nam (GoatBot fix by GPT)",
    countDown: 3,
    role: 0,
    shortDescription: "Chơi cờ vua 2 người",
    longDescription: "Tag một người để bắt đầu ván cờ vua.",
    category: "game",
    guide: "{p}chess @tag"
  },

  onStart: async function ({ api, event, message }) {
    if (!Object.keys(pieceImages).length) await loadPieces();

    const competitor = Object.keys(event.mentions)[0];
    if (!competitor)
      return message.reply("Hãy tag một người để làm đối thủ của bạn.");

    const chess = new Chess();
    const author = event.senderID;

    await sendBoard(api, event.threadID, chess);
    message.reply("Trận đấu bắt đầu!", (err, info) => {
      if (err) return;
      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        author,
        competitor,
        chess
      });
    });
  },

  onReply: async function ({ api, event, Reply, args, message }) {
    const { chess, author, competitor } = Reply;
    const { senderID, threadID, messageID } = event;

    if (![author, competitor].includes(senderID)) return;

    const turnID = chess.turn() === "w" ? author : competitor;
    if (senderID !== turnID)
      return message.reply("Chưa đến lượt bạn!", undefined, messageID);

    try {
      chess.move((args.join("") || "").toLowerCase());
    } catch (e) {
      return message.reply(`Nước đi không hợp lệ: ${e.message}`);
    }

    await sendBoard(api, threadID, chess);

    if (chess.isGameOver()) {
      let result = "Trận đấu kết thúc.";
      if (chess.isCheckmate()) result = `Checkmate! Người thắng: ${senderID}`;
      else if (chess.isStalemate()) result = "Stalemate! Hòa.";
      else if (chess.isThreefoldRepetition()) result = "Threefold repetition! Hòa.";
      else if (chess.isInsufficientMaterial()) result = "Insufficient material! Hòa.";
      else if (chess.isDraw()) result = "Hòa!";
      return message.reply(result);
    }

    global.GoatBot.onReply.set(messageID, {
      commandName: this.config.name,
      author,
      competitor,
      chess
    });
  }
};