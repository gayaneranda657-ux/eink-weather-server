const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/render.png', async (req, res) => {
    let browser = null;
    try {
        // 1. කාලගුණ දත්ත API එකෙන් ලබා ගැනීම
        const weatherUrl = `https://open-meteo.com`;
        const response = await axios.get(weatherUrl);
        const wData = response.data;

        const now = new Date();
        
        // 12-Hour Format (AM/PM රහිතව පිරිසිදුව)
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const isNight = (hours >= 18 || hours < 6); // රාත්‍රී කාලය හඳුනා ගැනීම
        hours = hours % 12;
        hours = hours ? hours : 12;
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

        // 2026 Open-Meteo WMO Codes නිවැරදිව හඳුනාගන්නා ශ්‍රිතය (Icon Router)
        const getIconSvg = (code, nightMode) => {
            // Thunderstorm (ගිගුරුම් සහිත වැසි)
            if ([95, 96, 99].includes(code)) {
                return `<svg class="icon-svg" viewBox="0 0 24 24"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58M13 10l-3 5h4l-3 5"/></svg>`;
            }
            // Rain / Drizzle / Shower (වැසි තත්ත්වයන්)
            if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
                return `<svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16v4"/><path d="M12 16v4"/></svg>`;
            }
            // Cloudy / Fog (වලාකුළු බරිත)
            if ([1, 2, 3, 45, 48].includes(code)) {
                return `<svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/></svg>`;
            }
            // Clear (පිරිසිදු අහස - රෑට හඳ, දවලට ඉර)
            if (nightMode) {
                return `<svg class="icon-svg" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`; // Moon Icon
            }
            return `<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`; // Sun Icon
        };

        const currentTemp = wData.current ? wData.current.temperature_2m : 26;
        const currentCode = wData.current ? wData.current.weather_code : 0;
        const feelsLike = wData.current ? wData.current.apparent_temperature : currentTemp;

        let currentCondition = "Clear";
        if ([95, 96, 99].includes(currentCode)) currentCondition = "Thunder";
        else if ([51, 53, 55, 61, 63, 65, 80, 81].includes(currentCode)) currentCondition = "Rain";
        else if ([1, 2, 3, 45].includes(currentCode)) currentCondition = "Cloudy";

        // වත්මන් කාලගුණයට අදාළ නිවැරදිම Icon එක තේරීම
        const currentIconSvg = getIconSvg(currentCode, isNight);

        const hourlyForecast = [];
        const currentHourIndex = now.getHours();
        
        const hourlyCodes = wData.hourly ? (wData.hourly.weather_code || []) : [];
        const hourlyTemps = wData.hourly ? (wData.hourly.temperature_2m || []) : [];
        const hourlyPops = wData.hourly ? (wData.hourly.precipitation_probability || []) : [];

        for(let i=0; i<4; i++) {
            const index = currentHourIndex + i;
            let timeLabel = `${index % 12 || 12}:00`;
            if(i === 0) timeLabel = "Now";
            
            // Forecast එකේ එක එක පැයට රාත්‍රී කාලය වෙන වෙනම සෙවීම
            const targetHour = index % 24;
            const hourIsNight = (targetHour >= 18 || targetHour < 6);

            hourlyForecast.push({
                time: timeLabel,
                temp: `${Math.round(hourlyTemps[index] || currentTemp)}°`,
                pop: `${hourlyPops[index] || 0}%`,
                icon: getIconSvg(hourlyCodes[index] || 0, hourIsNight)
            });
        }

        let hourlyHtml = "";
        for(let i = 0; i < hourlyForecast.length; i++) {
            let h = hourlyForecast[i];
            hourlyHtml += `
                <div class="hour-col">
                    <div class="h-time">${h.time}</div>
                    <div class="h-temp">${h.temp}</div>
                    ${h.icon}
                    <div class="h-pop">${h.pop}</div>
                </div>
            `;
        }

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Arial', sans-serif; font-smoothing: none; }
                body { width: 250px; height: 122px; background: #FFF; color: #000; overflow: hidden; display: flex; flex-direction: column; padding: 5px; justify-content: space-between; }
                .top-panel { display: flex; justify-content: space-between; align-items: stretch; height: 54px; border-bottom: 2px solid #000; padding-bottom: 3px; }
                .weather-status-box { width: 125px; display: flex; flex-direction: column; justify-content: space-between; }
                .main-weather-row { display: flex; align-items: center; gap: 4px; justify-content: flex-start; }
                .main-temp { font-size: 26px; font-weight: 900; line-height: 24px; letter-spacing: -1px; }
                .cond-text { font-size: 10px; font-weight: bold; line-height: 11px; }
                .loc-tag { font-size: 8px; font-weight: 900; color: #555; text-transform: uppercase; margin-top: 1px; }
                .clock-box { width: 110px; text-align: right; display: flex; flex-direction: column; justify-content: center; border-left: 1px dashed #000; padding-left: 4px; }
                .time { font-size: 28px; font-weight: 900; line-height: 26px; color: #000; }
                .date { font-size: 9px; font-weight: 900; margin-top: 1px; color: #000; }
                .forecast-container { display: flex; justify-content: space-between; height: 56px; padding-top: 4px; }
                .hour-col { width: 58px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; }
                .h-time { font-size: 8px; font-weight: bold; color: #555; }
                .h-temp { font-size: 11px; font-weight: 900; }
                .h-pop { font-size: 9px; font-weight: 900; color: #000; }
                .icon-svg { width: 16px; height: 16px; stroke: #000; stroke-width: 2.5; fill: none; }
                .current-icon { width: 20px; height: 20px; margin-left: 2px; }
            </style>
        </head>
        <body>
            <div class="top-panel">
                <div class="weather-status-box">
                    <div class="main-weather-row">
                        <div class="main-temp">${data.currentTemp}</div>
                        <div class="cond-text"><div>${data.condition}</div><div>Feels ${data.feelsLike}</div></div>
                        <div class="current-icon">${currentIconSvg}</div> <!-- වම් පැත්තට අලුතින් එකතු කල Icon එක -->
                    </div>
                    <div class="loc-tag">${data.location}</div>
                </div>
                <div class="clock-box">
                    <div class="time">${data.time}</div>
                    <div class="date">${data.date}</div>
                </div>
            </div>
            <div class="forecast-container">
                ${hourlyHtml}
            </div>
        </body>
        </html>
        `;

        browser = await puppeteer.launch({ 
            executablePath: '/usr/bin/google-chrome',
            headless: 'new', 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 250, height: 122 });
        await page.setContent(htmlContent);
        
        const imageBuffer = await page.screenshot({ type: 'png' });
        res.set('Content-Type', 'image/png');
        res.send(imageBuffer);
    } catch (error) {
        res.status(500).send("Render Error: " + error.message);
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
});

app.get('/', (req, res) => res.send("Dashboard active"));

app.listen(PORT, () => console.log(`Docker Weather Framework active on port ${PORT}`));
