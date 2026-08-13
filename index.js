const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const axios = require('axios');
const path = require('path');
const qrcode = require('qrcode-terminal');

const config = require('./config');
const { sms, downloadMediaMessage } = require('./lib/msg');
const {
  getBuffer,
  getGroupAdmins,
  getRandom,
  h2k,
  isUrl,
  Json,
  runtime,
  sleep,
  fetchJson
} = require('./lib/functions');

const { File } = require('megajs');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';

// OWNER NUMBER
const ownerNumber = ['94723853792'];

// SESSION FILE PATH
const credsPath = path.join(
  __dirname,
  'auth_info_baileys',
  'creds.json'
);

// BOT IMAGE
const botImage =
  'https://raw.githubusercontent.com/ostharofc-star/ostharplus/main/images/a_please_remove_this_t%20(1).png';

/*
=========================================
   DOWNLOAD / LOAD WHATSAPP SESSION
=========================================
*/

async function ensureSessionFile() {
  if (!fs.existsSync(credsPath)) {

    if (!config.SESSION_ID) {
      console.error(
        '❌ SESSION_ID env variable is missing. Cannot restore session.'
      );
      process.exit(1);
    }

    console.log(
      '🔄 creds.json not found. Downloading session from MEGA...'
    );

    try {
      const sessdata = config.SESSION_ID;

      const filer = File.fromURL(
        `https://mega.nz/file/${sessdata}`
      );

      filer.download((err, data) => {
        if (err) {
          console.error(
            '❌ Failed to download session file from MEGA:',
            err
          );

          process.exit(1);
          return;
        }

        fs.mkdirSync(
          path.join(__dirname, 'auth_info_baileys'),
          {
            recursive: true
          }
        );

        fs.writeFileSync(
          credsPath,
          data
        );

        console.log(
          '✅ Session downloaded and saved.'
        );

        setTimeout(() => {
          connectToWA();
        }, 2000);
      });

    } catch (error) {
      console.error(
        '❌ Session restore error:',
        error
      );

      process.exit(1);
    }

  } else {

    console.log(
      '✅ Existing WhatsApp session found.'
    );

    setTimeout(() => {
      connectToWA();
    }, 1000);
  }
}

/*
=========================================
           CONNECT WHATSAPP
=========================================
*/

async function connectToWA() {

  console.log(
    'Connecting OSTHAR-PLUS 🧬...'
  );

  try {

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState(
      path.join(
        __dirname,
        'auth_info_baileys'
      )
    );

    const {
      version
    } = await fetchLatestBaileysVersion();

    const OSTHAR = makeWASocket({

      logger: P({
        level: 'silent'
      }),

      printQRInTerminal: false,

      browser: Browsers.macOS(
        'Firefox'
      ),

      auth: state,

      version,

      syncFullHistory: true,

      markOnlineOnConnect: true,

      generateHighQualityLinkPreview: true
    });

    /*
    =========================================
             CONNECTION UPDATE
    =========================================
    */

    OSTHAR.ev.on(
      'connection.update',
      async (update) => {

        const {
          connection,
          lastDisconnect
        } = update;

        /*
        ===============================
                CONNECTION CLOSED
        ===============================
        */

        if (connection === 'close') {

          const statusCode =
            lastDisconnect?.error?.output?.statusCode;

          console.log(
            '⚠️ WhatsApp connection closed.'
          );

          if (
            statusCode !==
            DisconnectReason.loggedOut
          ) {

            console.log(
              '🔄 Reconnecting OSTHAR-PLUS...'
            );

            setTimeout(() => {
              connectToWA();
            }, 3000);

          } else {

            console.log(
              '❌ WhatsApp session logged out.'
            );

            console.log(
              'Please create a new session.'
            );
          }

        }

        /*
        ===============================
                CONNECTION OPEN
        ===============================
        */

        else if (
          connection === 'open'
        ) {

          console.log(
            '✅ OSTHAR-PLUS connected to WhatsApp'
          );

          const up =
`OSTHAR-PLUS connected ✅

PREFIX: ${prefix}`;

          /*
          ===============================
             SEND CONNECTED MESSAGE
          ===============================
          */

          try {

            await OSTHAR.sendMessage(
              ownerNumber[0] +
              '@s.whatsapp.net',
              {
                image: {
                  url: botImage
                },

                caption: up
              }
            );

            console.log(
              '✅ Connection message sent to owner.'
            );

          } catch (error) {

            console.error(
              '⚠️ Could not send connection image:',
              error.message
            );

            /*
              IMAGE FAIL වුණත් BOT එක
              CRASH නොවී TEXT MESSAGE එක යවයි
            */

            try {

              await OSTHAR.sendMessage(
                ownerNumber[0] +
                '@s.whatsapp.net',
                {
                  text: up
                }
              );

            } catch (textError) {

              console.error(
                '❌ Could not send connection message:',
                textError.message
              );

            }
          }

          /*
          ===============================
                  LOAD PLUGINS
          ===============================
          */

          try {

            const pluginsPath =
              path.join(
                __dirname,
                'plugins'
              );

            if (
              fs.existsSync(
                pluginsPath
              )
            ) {

              fs.readdirSync(
                pluginsPath
              ).forEach(
                (plugin) => {

                  if (
                    path
                      .extname(plugin)
                      .toLowerCase() === '.js'
                  ) {

                    try {

                      require(
                        `./plugins/${plugin}`
                      );

                      console.log(
                        `✅ Loaded plugin: ${plugin}`
                      );

                    } catch (
                      pluginError
                    ) {

                      console.error(
                        `❌ Plugin load error (${plugin}):`,
                        pluginError
                      );

                    }
                  }
                }
              );

            } else {

              console.log(
                '⚠️ plugins folder not found.'
              );

            }

          } catch (error) {

            console.error(
              '❌ Plugin loading error:',
              error
            );

          }
        }
      }
    );

    /*
    =========================================
             SAVE WHATSAPP CREDS
    =========================================
    */

    OSTHAR.ev.on(
      'creds.update',
      saveCreds
    );

    /*
    =========================================
              MESSAGE HANDLER
    =========================================
    */

    OSTHAR.ev.on(
      'messages.upsert',
      async ({
        messages
      }) => {

        try {

          /*
          ===============================
               SEND ACK IF NEEDED
          ===============================
          */

          for (
            const msg of messages
          ) {

            if (
              msg.messageStubType ===
              68
            ) {

              try {

                await OSTHAR
                  .sendMessageAck(
                    msg.key
                  );

              } catch (e) {

                console.log(
                  'ACK error:',
                  e.message
                );

              }
            }
          }

          const mek =
            messages[0];

          if (
            !mek ||
            !mek.message
          ) {
            return;
          }

          /*
          ===============================
              EPHEMERAL MESSAGE
          ===============================
          */

          if (
            getContentType(
              mek.message
            ) ===
            'ephemeralMessage'
          ) {

            mek.message =
              mek.message
                .ephemeralMessage
                .message;
          }

          /*
          ===============================
                 IGNORE STATUS
          ===============================
          */

          if (
            mek.key.remoteJid ===
            'status@broadcast'
          ) {
            return;
          }

          const m =
            sms(
              OSTHAR,
              mek
            );

          const type =
            getContentType(
              mek.message
            );

          const from =
            mek.key.remoteJid;

          /*
          ===============================
                    BODY
          ===============================
          */

          const body =
            type ===
            'conversation'
              ? mek.message
                  .conversation
              : mek.message[type]
                  ?.text ||
                mek.message[type]
                  ?.caption ||
                '';

          const isCmd =
            body.startsWith(
              prefix
            );

          const commandName =
            isCmd
              ? body
                  .slice(
                    prefix.length
                  )
                  .trim()
                  .split(' ')[0]
                  .toLowerCase()
              : '';

          const args =
            body
              .trim()
              .split(/ +/)
              .slice(1);

          const q =
            args.join(' ');

          /*
          ===============================
                  USER INFO
          ===============================
          */

          const sender =
            mek.key.fromMe
              ? OSTHAR.user.id
              : (
                  mek.key
                    .participant ||
                  mek.key
                    .remoteJid
                );

          const senderNumber =
            sender.split('@')[0];

          const isGroup =
            from.endsWith(
              '@g.us'
            );

          const botNumber =
            OSTHAR.user.id
              .split(':')[0];

          const pushname =
            mek.pushName ||
            'Sin Nombre';

          const isMe =
            botNumber.includes(
              senderNumber
            );

          const isOwner =
            ownerNumber.includes(
              senderNumber
            ) ||
            isMe;

          const botNumber2 =
            await jidNormalizedUser(
              OSTHAR.user.id
            );

          /*
          ===============================
                GROUP DETAILS
          ===============================
          */

          const groupMetadata =
            isGroup
              ? await OSTHAR
                  .groupMetadata(
                    from
                  )
                  .catch(
                    () => null
                  )
              : null;

          const groupName =
            isGroup &&
            groupMetadata
              ? groupMetadata
                  .subject
              : '';

          const participants =
            isGroup &&
            groupMetadata
              ? groupMetadata
                  .participants
              : [];

          const groupAdmins =
            isGroup
              ? await getGroupAdmins(
                  participants
                )
              : [];

          const isBotAdmins =
            isGroup
              ? groupAdmins.includes(
                  botNumber2
                )
              : false;

          const isAdmins =
            isGroup
              ? groupAdmins.includes(
                  sender
                )
              : false;

          /*
          ===============================
                   REPLY
          ===============================
          */

          const reply =
            (text) =>
              OSTHAR.sendMessage(
                from,
                {
                  text:
                    String(text)
                },
                {
                  quoted: mek
                }
              );

          /*
          ===============================
                  COMMANDS
          ===============================
          */

          if (isCmd) {

            const cmd =
              commands.find(
                (c) =>
                  c.pattern ===
                    commandName ||
                  (
                    c.alias &&
                    c.alias.includes(
                      commandName
                    )
                  )
              );

            if (cmd) {

              if (
                cmd.react
              ) {

                try {

                  await OSTHAR
                    .sendMessage(
                      from,
                      {
                        react: {
                          text:
                            cmd.react,
                          key:
                            mek.key
                        }
                      }
                    );

                } catch (e) {

                  console.log(
                    'React error:',
                    e.message
                  );

                }
              }

              try {

                await cmd.function(
                  OSTHAR,
                  mek,
                  m,
                  {
                    from,
                    quoted: mek,
                    body,
                    isCmd,
                    command:
                      commandName,
                    args,
                    q,
                    isGroup,
                    sender,
                    senderNumber,
                    botNumber2,
                    botNumber,
                    pushname,
                    isMe,
                    isOwner,
                    groupMetadata,
                    groupName,
                    participants,
                    groupAdmins,
                    isBotAdmins,
                    isAdmins,
                    reply
                  }
                );

              } catch (e) {

                console.error(
                  '[PLUGIN ERROR]',
                  e
                );

              }
            }
          }

          /*
          ===============================
                REPLY HANDLERS
          ===============================
          */

          const replyText =
            body;

          for (
            const handler
            of replyHandlers
          ) {

            try {

              if (
                handler.filter(
                  replyText,
                  {
                    sender,
                    message:
                      mek
                  }
                )
              ) {

                await handler.function(
                  OSTHAR,
                  mek,
                  m,
                  {
                    from,
                    quoted:
                      mek,
                    body:
                      replyText,
                    sender,
                    reply
                  }
                );

                break;
              }

            } catch (e) {

              console.log(
                'Reply handler error:',
                e
              );

            }
          }

        } catch (error) {

          console.error(
            '❌ Message processing error:',
            error
          );

        }
      }
    );

  } catch (error) {

    console.error(
      '❌ WhatsApp connection error:',
      error
    );

    setTimeout(() => {
      connectToWA();
    }, 5000);
  }
}

/*
=========================================
             START SESSION
=========================================
*/

ensureSessionFile();

/*
=========================================
              WEB SERVER
=========================================
*/

app.get(
  '/',
  (req, res) => {

    res.send(
      'Hey, OSTHAR-PLUS started ✅'
    );

  }
);

app.get(
  '/status',
  (req, res) => {

    res.json({
      status: 'online',
      bot: 'OSTHAR-PLUS'
    });

  }
);

app.listen(
  port,
  () => {

    console.log(
      `Server listening on http://localhost:${port}`
    );

  }
);
