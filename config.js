const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "NYgGDJZK#cWac9zjGIRcq6_Ec32_wUZ8ZO1QaeHS5FlZBTREXXl8",
ALIVE_IMG: process.env.ALIVE_IMG || "https://github.com/DANUWA-MD/DANUWA-MD/blob/main/images/DANUWA-MD.png?raw=true",
ALIVE_MSG: process.env.ALIVE_MSG || "*Hello👋 OSTHAR-PLUS Is Alive Now😍*",
BOT_OWNER: '94723853792',  // Replace with the owner's phone number



};
