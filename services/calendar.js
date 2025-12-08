const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // for refresh token
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function createEvent({ summary, description, start, end, attendees = [] }) {
    const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

    const event = {
        summary,
        description,
        start: {
            dateTime: start,
            timeZone: 'America/New_York', // ⚠️ CHANGE TO YOUR TIMEZONE
        },
        end: {
            dateTime: end,
            timeZone: 'America/New_York',
        },
        attendees,
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 24 * 60 },
                { method: 'popup', minutes: 60 }
            ]
        }
    };

    const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
        requestBody: event,
        sendUpdates: 'all'
    });

    return response.data;
}

module.exports = { createEvent };