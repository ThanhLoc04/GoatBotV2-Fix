const axios = require("axios");
const moment = require("moment-timezone");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "weather",
    version: "1.0.0",
    author: "NTKHANG",
    countDown: 5,
    role: 0,
    shortDescription: {
      vi: "Xem thời tiết trong 5 ngày",
      en: "View 5-day weather forecast"
    },
    longDescription: {
      vi: "Xem thông tin thời tiết trong khu vực bạn nhập vào",
      en: "Get weather forecast for a given location"
    },
    category: "utility",
    guide: {
      vi: "{pn} [địa điểm]",
      en: "{pn} [location]"
    }
  },

  onStart: async function ({ message, args }) {
    const area = args.join(" ");
    if (!area) return message.reply("🌍 Vui lòng nhập địa điểm!");

    let areaKey, location = {}, dataWeather;

    try {
      const response = await axios.get(
        `https://api.accuweather.com/locations/v1/cities/search.json?q=${encodeURIComponent(area)}&apikey=d7e795ae6a0d44aaa8abb1a0a7ac19e4&language=vi-vn`
      );
      if (response.data.length === 0) return message.reply("❌ Không tìm thấy địa điểm này!");
      const data = response.data[0];
      areaKey = data.Key;
      location = { latitude: data.GeoPosition.Latitude, longitude: data.GeoPosition.Longitude };
    } catch (err) {
      console.log(err);
      return message.reply("⚠️ Đã có lỗi xảy ra khi tìm địa điểm!");
    }

    try {
      dataWeather = await axios.get(
        `http://api.accuweather.com/forecasts/v1/daily/10day/${areaKey}?apikey=d7e795ae6a0d44aaa8abb1a0a7ac19e4&details=true&language=vi`
      );
    } catch (err) {
      console.log(err);
      return message.reply("⚠️ Đã có lỗi xảy ra khi lấy dữ liệu thời tiết!");
    }

    const msg = generateWeatherMessage(dataWeather.data);

    return message.reply({
      body: msg,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        current: true
      }
    });
  }
};

// ==================== SUPPORT FUNCTIONS ====================

function generateWeatherMessage(dataWeather) {
  const dataWeatherToday = dataWeather.DailyForecasts[0];
  return `🌤 Thời tiết hôm nay:\n${dataWeather.Headline.Text}` +
    `\n🌡 Nhiệt độ thấp nhất - cao nhất: ${convertFtoC(dataWeatherToday.Temperature.Minimum.Value)}°C - ${convertFtoC(dataWeatherToday.Temperature.Maximum.Value)}°C` +
    `\n🌡 Nhiệt độ cảm nhận được: ${convertFtoC(dataWeatherToday.RealFeelTemperature.Minimum.Value)}°C - ${convertFtoC(dataWeatherToday.RealFeelTemperature.Maximum.Value)}°C` +
    `\n🌅 Mặt trời mọc: ${formatHours(dataWeatherToday.Sun.Rise)}` +
    `\n🌄 Mặt trời lặn: ${formatHours(dataWeatherToday.Sun.Set)}` +
    `\n🌙 Mặt trăng mọc: ${formatHours(dataWeatherToday.Moon.Rise)}` +
    `\n🏙️ Mặt trăng lặn: ${formatHours(dataWeatherToday.Moon.Set)}` +
    `\n☀️ Ban ngày: ${dataWeatherToday.Day.LongPhrase}` +
    `\n🌌 Ban đêm: ${dataWeatherToday.Night.LongPhrase}`;
}

function convertFtoC(F) {
  return Math.floor((F - 32) / 1.8);
}

function formatHours(hours) {
  return moment(hours).tz("Asia/Ho_Chi_Minh").format("HH[h]mm");
}