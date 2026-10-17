const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/render.png', async (req, res) => {
    let browser = null;
    try {
        const weatherUrl = `https://open-meteo.com`;
        const response = await axios.get(weatherUrl);
        const wData = response.data;

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

        const getIconType = (code) => {
            if (.includes(code)) return 'sunny';
            if (.includes(code)) return 'cloudy';
            if (.includes(code)) return 'rain';
            if (.includes(code)) return 'thunder';
            return 'cloudy';
        };

        const currentTemp = wData.current ? wData.current.temperature_2m : 26;
        const currentCode = wData.current ? wData.current.weather_code : 0;
        const feelsLike = wData.current ? wData.current.apparent_temperature : currentTemp;

        let currentCondition = "Clear";
        if (.includes(currentCode)) currentCondition = "Thunder";
        else if (.includes(currentCode)) currentCondition = "Rain";
        else if (.includes(currentCode)) currentCondition = "Cloudy";

        const hourlyForecast = [];
        const currentHourIndex = now.getHours();
        
        const hourlyCodes = wData.hourly ? (wData.hourly.weather_code || wData.hourly.weathercode || []) : [];
        const hourlyTemps = wData.hourly ? (wData.hourly.temperature_2m || []) : [];
        const hourlyPops = wData.hourly ? (wData.hourly.precipitation_probability || []) : [];

        for(let i=0; i<4; i++) {
            const index = currentHourIndex + i;
            let timeLabel = `${index}:00`;
            if(i === 0) timeLabel = "Now";
            
            hourlyForecast.push({
                time: timeLabel,
                temp: `${Math.round(hourlyTemps[index] || currentTemp)}°`,
                pop: `${hourlyPops[index] || 0}%`,
                type: getIconType(hourlyCodes[index] || 0)
            });
        }

        const data = {
            time: timeStr, date: dateStr, location: "KADAWATHA",
            currentTemp: `${Math.round(currentTemp)}°`,
            condition: currentCondition, feelsLike: `${Math.round(feelsLike)}°`,
            hourly: hourlyForecast
        };

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Arial', sans-serif; font-smoothing: none; }
                body { width: 250px; height: 122px; background: #FFF; color: #000; overflow: hidden; display: flex; flex-direction: column; padding: 5px; justify-content: space-between; }
                .red { color: #FF0000; fill: #FF0000; }
                .top-panel { display: flex; justify-content: space-between; align-items: stretch; height: 52px; border-bottom: 2px solid #000; padding-bottom: 3px; }
                .weather-status-box { width: 120px; display: flex; flex-direction: column; justify-content: space-between; }
                .main-weather-row { display: flex; align-items: center; gap: 4px; }
                .main-temp { font-size: 26px; font-weight: 900; line-height: 24px; letter-spacing: -1px; }
                .cond-text { font-size: 10px; font-weight: bold; line-height: 11px; }
                .loc-tag { font-size: 8px; font-weight: 900; color: #555; text-transform: uppercase; margin-top: 1px; }
                .clock-box { width: 115px; text-align: right; display: flex; flex-direction: column; justify-content: center; border-left: 1px dashed #000; padding-left: 4px; }
                .time { font-size: 28px; font-weight: 900; line-height: 26px; }
                .date { font-size: 9px; font-weight: 900; margin-top: 1px; }
                .forecast-container { display: flex; justify-content: space-between; height: 56px; padding-top: 4px; }
                .hour-col { width: 58px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; }
                .h-time { font-size: 8px; font-weight: bold; color: #555; }
                .h-temp { font-size: 11px; font-weight: 900; }
                .h-pop { font-size: 9px; font-weight: 900; }
                .icon-svg { width: 16px; height: 16px; stroke: currentColor; stroke-width: 2.5; fill: none; }
            </style>
        </head>
        <body>
            <div class="top-panel">
                <div class="weather-status-box">
                    <div class="main-weather-row">
                        <div class="main-temp">${data.currentTemp}</div>
                        <div class="cond-text"><div class="red">${data.condition}</div><div>Feels ${data.feelsLike}</div></div>
                    </div>
                    <div class="loc-tag">${data.location}</div>
                </div>
                <div class="clock-box"><div class="time">${data.time}</div><div class="date red">${data.date}</div></div>
            </div>
            <div class="forecast-container">
                ${data.hourly.map(h => {
                    let svgIcon = `<svg class="icon-svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`;
                    if (h.type === 'thunder') {
                        svgIcon = `<svg class="icon-svg red" viewBox="0 0 24 24"><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58M13 10l-3 5h4l-3 5"/></svg>`;
                    } else if (h.type === 'rain') {
                        svgIcon = `<svg class="icon-svg" viewBox="0 0 24 24"><path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><path d="M8 16v4" class="red"/><path d="M12 16v4" class="red"/></svg>`;
                    }
                    return `
                        <div class="hour-col">
                            <div class="h-time">\${h.time}</div>
                            <div class="h-temp">\${h.temp}</div>\${svgIcon}
                            <div class="h-pop red">\${h.pop}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        </body>
        </html>
        `;

        // Optimized for Docker Environment execution path cleanly
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

app.listen(PORT, () => console.log(`Docker Web Engine active on port ${PORT}`));
