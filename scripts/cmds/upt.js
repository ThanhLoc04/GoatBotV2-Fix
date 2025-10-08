const pidusage = require("pidusage");

function byte2mb(bytes) {
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let l = 0, n = parseInt(bytes, 10) || 0;
  while (n >= 1024 && ++l) n = n / 1024;
  return `${n.toFixed(n < 10 && l > 0 ? 1 : 0)} ${units[l]}`;
}

module.exports = {
  config: {
    name: "uptime",
    version: "1.0.3",
    author: "ntkiendz",
    countDown: 5,
    role: 0,
    shortDescription: "Kiểm tra thời gian bot online",
    longDescription: "Hiển thị thời gian bot đã hoạt động, CPU, RAM,...",
    category: "system",
    guide: "{p}uptime"
  },

  langs: {
    vi: {
      returnResult: 
`❯ Bot đã hoạt động được: %1 ngày %2 giờ %3 phút %4 giây.

❯ Người dùng: %5
❯ Nhóm: %6
❯ CPU đang sử dụng: %7%
❯ RAM đang sử dụng: %8`
    },
    en: {
      returnResult: 
`❯ Bot has been running for: %1 day(s) %2 hour(s) %3 minute(s) %4 second(s).

❯ Users: %5
❯ Threads: %6
❯ CPU usage: %7%
❯ RAM usage: %8`
    }
  },

  onStart: async function ({ message, getLang, usersData, threadsData }) {
    const time = process.uptime(); // giây
    const days = Math.floor(time / (60 * 60 * 24));
    const hours = Math.floor((time % (60 * 60 * 24)) / (60 * 60));
    const minutes = Math.floor((time % (60 * 60)) / 60);
    const seconds = Math.floor(time % 60);

    const pid = await pidusage(process.pid);

    // ✅ Lấy số lượng user và thread trong Goat Bot
    const allUsers = await usersData.getAll();
    const allThreads = await threadsData.getAll();

    const msg = getLang("returnResult",
      days,
      hours,
      minutes,
      seconds,
      allUsers.length,
      allThreads.length,
      pid.cpu.toFixed(1),
      byte2mb(pid.memory)
    );

    message.reply(msg);
  }
};