const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID || "EJonxYJa#tziMq5tCgQCTZpoQmM2zpj8iDYOJdOdmiTcFeqlCcNo",
ALIVE_IMG: process.env.ALIVE_IMG || "https://github.com/ostharofc-star/ostharplus/blob/main/images/a_please_remove_this_t%20(1).png?raw=true",
ALIVE_MSG: process.env.ALIVE_MSG || "*Hello👋 OSTHAR-PLUS Is Alive Now😍*",
BOT_OWNER: '94723853792',  // Replace with the owner's phone number



};
