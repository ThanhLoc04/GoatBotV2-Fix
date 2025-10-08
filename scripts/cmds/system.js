const si = require("systeminformation");
const pidusage = require("pidusage");

module.exports.config = {
  name: "system",
  version: "1.0.1",
  credits: "Mirai Team (convert: GPT)",
  description: "Xem thông tin phần cứng mà bot đang sử dụng",
  commandCategory: "Tiện ích",
  cooldown: 5,
  category: "system"
};

function byte2mb(bytes) {
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let l = 0, n = parseInt(bytes, 10) || 0;
  while (n >= 1024 && ++l) n = n / 1024;
  return `${n.toFixed(n < 10 && l > 0 ? 1 : 0)}${units[l]}`;
}

module.exports.onStart = async function ({ message }) {
  const timeStart = Date.now();
  try {
    const pid = await pidusage(process.pid);
    const cpu = await si.cpu();
    const gpu = await si.graphics();
    const temp = await si.cpuTemperature();
    const load = await si.currentLoad();
    const uptime = (await si.time()).uptime;
    const diskInfo = await si.diskLayout();
    const memInfo = await si.memLayout();
    const mem = await si.mem();
    const os = await si.osInfo();

    // uptime format
    let hours = Math.floor(uptime / (60 * 60));
    let minutes = Math.floor((uptime % (60 * 60)) / 60);
    let seconds = Math.floor(uptime % 60);
    if (hours < 10) hours = "0" + hours;
    if (minutes < 10) minutes = "0" + minutes;
    if (seconds < 10) seconds = "0" + seconds;

    // GPU
    const gpuName = gpu.controllers?.[0]?.model || "Không xác định";
    const gpuVendor = gpu.controllers?.[0]?.vendor || "Không rõ";
    const gpuVRAM = gpu.controllers?.[0]?.vram || "Không rõ";

    // Disk
    let disk = [];
    let i = 1;
    for (const singleDisk of diskInfo) {
      disk.push(
        `==== 「 DISK ${i++} 」 ====\n` +
        "Tên: " + singleDisk.name + "\n" +
        "Loại: " + singleDisk.interfaceType + "\n" +
        "Kích thước: " + byte2mb(singleDisk.size) + "\n" +
        "Nhiệt độ: " + (singleDisk.temperature || "N/A") + "°C"
      );
    }

    const msg =
      "==== 「 CPU 」 ====\n" +
      `Mẫu CPU: ${cpu.manufacturer} ${cpu.brand} ${cpu.speedMax}GHz\n` +
      `Số lõi: ${cpu.physicalCores}\n` +
      `Số luồng: ${cpu.cores}\n` +
      `Nhiệt độ: ${temp.main}°C\n` +
      `Tải: ${load.currentLoad.toFixed(1)}%\n` +
      `Sử dụng Node: ${pid.cpu.toFixed(1)}%\n` +

      "==== 「 GPU 」 ====\n" +
      `Mẫu GPU: ${gpuName}\n` +
      `Hãng: ${gpuVendor}\n` +
      `VRAM: ${gpuVRAM}\n` +

      "==== 「 BỘ NHỚ 」 ====\n" +
      `Kích thước: ${byte2mb(memInfo[0].size)}\n` +
      `Loại: ${memInfo[0].type}\n` +
      `Tổng: ${byte2mb(mem.total)}\n` +
      `Khả dụng: ${byte2mb(mem.available)}\n` +
      `Sử dụng Node: ${byte2mb(pid.memory)}\n` +

      disk.join("\n") + "\n" +

      "==== 「 HỆ ĐIỀU HÀNH 」 ====\n" +
      `Nền tảng: ${os.platform}\n` +
      `Bản dựng: ${os.build}\n` +
      `Thời gian hoạt động: ${hours}:${minutes}:${seconds}\n` +
      `Ping: ${Date.now() - timeStart}ms`;

    return message.reply(msg);
  } catch (e) {
    return message.reply("⚠️ Đã xảy ra lỗi: " + e.message);
  }
};