const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/render.png', async (req, res) => {
    try {
        // Fetch weather telemetry directly from Open-Meteo API
        const weatherUrl = `https://open-meteo.com`;
        const response = await axios.get(weatherUrl);
        const wData = response.data;

        const now = new Date();
        
        // Compute 12-Hour format variables cleanly
        let hours = now.getHours();
        let minutes = now.getMinutes();
        hours = hours % 12;
        hours = hours ? hours : 12; 
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

        const currentTemp = wData.current_weather ? Math.round(wData.current_weather.temperature) : 26;
        const currentCode = wData.current_weather ? wData.current_weather.weathercode : 0;

        // Simplify conditions into clear internal states
        let condition = 0; // 0 = Clear, 1 = Cloudy, 2 = Rain, 3 = Thunder
        if ([95, 96, 99].includes(currentCode)) condition = 3;
        else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(currentCode)) condition = 2;
        else if ([1, 2, 3, 45, 48].includes(currentCode)) condition = 1;

        const currentHourIndex = now.getHours();
        const hourlyTemps = wData.hourly ? wData.hourly.temperature_2m : [];
        const hourlyPops = wData.hourly ? wData.hourly.precipitation_probability : [];

        // Build tight 4-hour timeline blocks
        let h0_t = Math.round(hourlyTemps[currentHourIndex] || currentTemp);
        let h0_p = hourlyPops[currentHourIndex] || 0;
        let h1_t = Math.round(hourlyTemps[currentHourIndex + 1] || currentTemp);
        let h1_p = hourlyPops[currentHourIndex + 1] || 0;
        let h2_t = Math.round(hourlyTemps[currentHourIndex + 2] || currentTemp);
        let h2_p = hourlyPops[currentHourIndex + 2] || 0;
        let h3_t = Math.round(hourlyTemps[currentHourIndex + 3] || currentTemp);
        let h3_p = hourlyPops[currentHourIndex + 3] || 0;

        // Compile all target layout variables into a tiny raw data string
        const payload = `TIME:${timeStr}|DATE:${dateStr}|TEMP:${currentTemp}|COND:${condition}|H0_T:${h0_t}|H0_P:${h0_p}%|H1_T:${h1_t}|H1_P:${h1_p}%|H2_T:${h2_t}|H2_P:${h2_p}%|H3_T:${h3_t}|H3_P:${h3_p}%`;
        
        res.set('Content-Type', 'text/plain');
        res.send(payload);
    } catch (error) {
        res.status(500).send("API_ERROR");
    }
});

app.get('/', (req, res) => res.send("Active"));
app.listen(PORT, () => console.log("Data Compiler Mode Active"));
