const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, downloadContentFromMessage, Browsers } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const sessionPath = path.join(__dirname, 'session');
const startTime = Date.now();

const DEVELOPER_ID = "69033026138303";
const DEVELOPER_PHONE = "201032219184";
const BOT_PHONE = "201154684341";

global.botOwners = global.botOwners || [DEVELOPER_PHONE, DEVELOPER_ID, BOT_PHONE];

const userNicknames = {};
const userBank = {}; 
const mutedUsers = {};
const badWordsWarnings = {}; 
const customCommands = {};

global.activeGuessGames = global.activeGuessGames || {};
global.activeSpyGames = global.activeSpyGames |
| {};
const guessCharacters = [
    "أكاجي", "برولي", "اكازا", "ايتاشي", "اينوسكي", "بو", "ابوناي", "توبو", "تنجن",
    "عمكغوكو", "سانامي", "جيرين", "زينيتسو", "ساسكي", "سوكونا", "رينجوكو", "سونوغوكو", "غوجوساتورو", "جين",
    "غوكو", "فريزا", "فيجيتا", "غيتو", "غوجو", "كابوتو",
    "يوتا", "كريلين", "مادارا", "كاكاشي", "ناروتو", "هاشيراما", "ميغومي", "ليفاي", "نوبارا", "موزان", "يوجي"
];

const badWordsList = [
    "كسمك", "شلتت", "كلب", "حمار", "قذر", "لعن", "زفت", "متخلف", "غبي", "معفن", "يا ابن",
    "وسخ", "منيوك", "قحبة", "متناكة", "خول", "شرموطة", "عرص", "حلوف", "حيوان",
    "حشاش", "سرسجي", "خرا", "تفة", "ابن الكلب", "ابن الوسخة", "يا دكر", "يا غبي",
    "يا سافل", "سافل", "حقير", "واطي", "منحط", "تبا", "ينعن", "يخرب بيتك"
];

const rankTitles = [
    "الإمبراطور 🔱", "نائب الإمبراطور 🌠", "الملك 👑", "نائب الملك ⚜️", 
    "الجنرال ⚡", "نائب الجنرال ⚔", "الدوق 👑", "نائب الدوق 🏰", 
    "الأدميرال 🚢", "نائب الأدميرال ⚓", "العميد 🎖️", "التشيبوكاي 🏴‍☠️", 
    "مشرف 👮‍♂️", "مشرف متدرب 📘", "الفارس 🐎", "الملازم 🛡️", 
    "حامل البريق ✨", "حامل الراية 🚩", "قائد كتيبة 🛡️", "مقاتل نخبة ⚔️",
    "فارس ظلام 🏴", "حارس الأسوار 🏰", "مستشار ملكي 📜", "حكيم البلاط 🔮",
    "رئيس الحرس 🛡️", "سفير القصر 🌐", "قائد الأسطول ⚓", "صائد الجوائز 🎯",
    "مقاتل محترف 🥋", "حارس الشرف ⚜️", "جندي أول 🎖️", "جندي متمرس 💂‍♂️",
    "مستكشف 🧭", "رائد الفضاء 🚀", "حارس البوابة 🚪", "مقاتل حر 🗡️",
    "حامل السيف ⚔️", "حامل الدرع 🛡️", "مرتزق 🏴‍☠️", "صياد 🏹",
    "متدرب ملكي 📘", "مبتدئ مميز ⭐", "مراقب خفي 👁️", "مساعد خاص 📋",
    "مواطن فخري 🏛️", "تابع مخلص 🤝", "عضو نشط 🔥", "عضو متفاعل 💡",
    "ضيف عزيز 🌟", "عضو 👤"

];
async function startGojoBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'fatal' }),
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' })),
            },
            browser: Browsers.macOS('Chrome'),
            generateHighQualityLinkPreview: true,
            syncFullHistory: false
        });

        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    let phoneNumber = BOT_PHONE.replace(/[^0-9]/g, '');
                    let code = await sock.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(`\n========================================`);
                    console.log(`[!] كود ربط بوت غوجو الجديد هو: \x1b[32m${code}\x1b[0m`);
                    console.log(`========================================\n`);
                } catch (err) {
                    console.error("خطأ أثناء طلب كود الربط:", err);
                }
            }, 8000);
        }

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const statusCode = (lastDisconnect.error instanceof Boom)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[!] انقطع الاتصال، جاري إعادة المحاولة بأمان...`);
                if (shouldReconnect) {
                    setTimeout(() => startGojoBot(), 10000);
                }
            } else if (connection === 'open') {
                console.log('تم اتصال بوت غوجو بنجاح واستقرار تام! 🚀');
            }
        });

        sock.ev.on('creds.update', async () => {
            await saveCreds();
       
  });
              sock.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                const mtype = Object.keys(mek.message)[0];
                const from = mek.key.remoteJid;
                const sender = mek.key.participant || from;
                const senderNumber = sender.split('@')[0];
                
                const isDev = sender.includes(DEVELOPER_PHONE) || sender.includes(DEVELOPER_ID) || sender.includes(BOT_PHONE) || global.botOwners.some(dev => senderNumber.includes(dev));
                
                const body = (mtype === 'conversation') ? mek.message.conversation :
                             (mtype === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : 
                             (mtype === 'imageMessage') ? mek.message.imageMessage.caption :
                             (mtype === 'videoMessage') ? mek.message.videoMessage.caption : '';
                
                const args = body.trim().split(/ +/);
                let command = args.shift().toLowerCase();
                
                if (command.startsWith('.')) {
                    command = '.' + command.replace('.', '').replace(/_/g, ' ');
                }

                const getUserRank = (userJid) => {
                    let isU_Dev = userJid.includes(DEVELOPER_PHONE) || userJid.includes(DEVELOPER_ID) || userJid.includes(BOT_PHONE) || global.botOwners.some(dev => userJid.includes(dev));
                    if (isU_Dev) return 0;
                    return userBank[userJid]?.level ?? (rankTitles.length - 1);
                };

                if (!isDev && body) {
                    let lowerBody = body.toLowerCase();
                    let hasBadWord = badWordsList.some(word => lowerBody.includes(word));
                    if (hasBadWord) {
                        try {
                            await sock.sendMessage(from, { delete: mek.key });
                        } catch (e) {}

                        badWordsWarnings[sender] = (badWordsWarnings[sender] || 0) + 1;
                        let warningsLeft = 3 - badWordsWarnings[sender];

                        if (badWordsWarnings[sender] >= 3) {
                            mutedUsers[sender] = true;
                            badWordsWarnings[sender] = 0;
                            await sock.sendMessage(from, { text: `🚨 تم كتم العضو @${senderNumber} لتخطيه الحد المسموح للشتايم (3 مرات)! ⚠`, mentions: [sender] });
                        } else {
                            await sock.sendMessage(from, { text: `⚠️ انتباه يا @${senderNumber}! ممنوع استخدام الألفاظ النابية. لديك (${warningsLeft}) إنذارات أخرى قبل الكتم! 🚫`, mentions: [sender] });
                        }
                        return;
                    }
                }
                              if (!userBank[sender]) {
                    userBank[sender] = { cash: isDev ? 1000000 : 50, coins: isDev ? 10000000000 : 200, points: isDev ? 10000000000 : 10, hearts: 3, xp: 0, level: isDev ? 0 : (rankTitles.length - 1) };
                } else {
                    if (isDev) {
                        userBank[sender].coins = 10000000000;
                        userBank[sender].level = 0;
                    }
                    if (userBank[sender].cash === undefined) userBank[sender].cash = 50;
                }

                global.activeXoSessions = global.activeXoSessions || {};

                const getTarget = () => {
                    if (mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo && mek.message.extendedTextMessage.contextInfo.participant) {
                        return mek.message.extendedTextMessage.contextInfo.participant;
                    }
                    if (mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo && mek.message.extendedTextMessage.contextInfo.mentionedJid && mek.message.extendedTextMessage.contextInfo.mentionedJid.length > 0) {
                        return mek.message.extendedTextMessage.contextInfo.mentionedJid[0];
                    }
                    let mentionedMatch = body.match(/@([0-9]+)/);
                    if (mentionedMatch) {
                        return mentionedMatch[1] + '@s.whatsapp.net';
                    }
                    return null;
                };

                if (command === '.انهاء') {
                    delete global.activeXoSessions[from];
                    delete global.activeGuessGames[from];
                    delete global.activeSpyGames[from];
                    await sock.sendMessage(from, { text: `🛑 تم إنهاء أي لعبة شغالة حالياً في المجموعة بنجاح!` }, { quoted: mek });
                    return;
                }

                if (command === '.زواج') {
                    let groupMetadata = await sock.groupMetadata(from).catch(() => null);
                    if (!groupMetadata) {
                        return await sock.sendMessage(from, { text: `❌ لا يمكن تنفيذ هذا الأمر إلا داخل المجموعات!` }, { quoted: mek });
                    }
                    let participants = groupMetadata.participants.map(p => p.id);
                    if (participants.length < 2) return;
                    
                    let groom, bride;
                    let devJid = DEVELOPER_PHONE + '@s.whatsapp.net';
                    
                    let shuffled = participants.sort(() => 0.5 - Math.random());
                    groom = shuffled[0];
                    bride = shuffled[1];

                    if (participants.includes(devJid)) {
                        groom = devJid;
                        let remaining = participants.filter(p => p !== devJid);
                        bride = remaining[Math.floor(Math.random() * remaining.length)];
                    }

                    let marriageText = `💍 **بارِك اللَّهُمَّ لهما وبارك عليهما وجمع بينهما في خير!** 💍\n\n` +
                                       `🤵 العريس: @${groom.split('@')[0]}\n` +
                                       `👰 العروسة: @${bride.split('@')[0]}\n\n` +
                                       `🥳 مبروك الزواج الأسطوري العشوائي في الجروب! 🥂✨`;
                    await sock.sendMessage(from, { text: marriageText, mentions: [groom, bride] }, { quoted: mek });
                    return;
                }

                if (command === '.طلاق') {
                    let groupMetadata = await sock.groupMetadata(from).catch(() => null);
                    if (!groupMetadata) return;
                    let participants = groupMetadata.participants.map(p => p.id);
                    if (participants.length < 2) return;

                    let shuffled = participants.sort(() => 0.5 - Math.random());
                    let ex1 = shuffled[0];
                    let ex2 = shuffled[1];

                    let divorceText = `💔 **البغض الحلال ونهاية الطريق!** 💔\n\n` +
                                      `تم الطلاق الرسمي وعودة العزوبية بين:\n` +
                                      `👤 @${ex1.split('@')[0]} ⚡ و 👤 @${ex2.split('@')[0]}\n\n` +
                                      `📜 كل واحد في طريق ربنا يوفقه! 🚶‍♂️💨`;
                    await sock.sendMessage(from, { text: divorceText, mentions: [ex1, ex2] }, { quoted: mek });
                    return;
                }

                if (command === '.الجاسوس' || command === '.جاسوس') {
                    let groupMetadata = await sock.groupMetadata(from).catch(() => null);
                    if (!groupMetadata) {
                        return await sock.sendMessage(from, { text: `❌ لعبة الجاسوس تعمل داخل المجموعات فقط!` }, { quoted: mek });
                    }
                    if (global.activeSpyGames[from]) {
                        return await sock.sendMessage(from, { text: `⚠️ لعبة الجاسوس جارية بالفعل في هذه المجموعة!` }, { quoted: mek });
                    }

                    let participants = groupMetadata.participants.map(p => p.id);
                    if (participants.length < 2) {
                        return await sock.sendMessage(from, { text: `❌ عدد الأعضاء غير كافٍ لبدء لعبة الجاسوس!` }, { quoted: mek });
                    }

                    let randomSpy = participants[Math.floor(Math.random() * participants.length)];
                    let secretWords = ["جوجو", "ناروتو", "ساسكي", "جين", "غوكو", "برولي"];
                    let selectedWord = secretWords[Math.floor(Math.random() * secretWords.length)];

                    global.activeSpyGames[from] = { spy: randomSpy, word: selectedWord, state: 'running' };

                    for (let participant of participants) {
                        try {
                            if (participant === randomSpy) {
                                await sock.sendMessage(participant, { text: `🕵️‍♂️ **تنبيه سري:** أنت **الجاسوس** في هذه الجولة! 🤫\nليس لديك كلمة سر وعليك محاولة خداع الجميع دون أن ينكشف أمرك.` });
                            } else {
                                await sock.sendMessage(participant, { text: `🕵️‍♂️ **لعبة الجاسوس - كلمة السر:**\nكلمة السر الخاصة بهذه الجولة هي: *${selectedWord}* 🤫\nتحدث عنها بذكاء دون إفصاحها تماماً للجاسوس!` });
                            }
                        } catch (err) {
                            console.log(`تعذر إرسال رسالة خاصة إلى ${participant}:`, err);
                        }
                    }

                    let listText = `🕵️‍♂️ **بدأت لعبة الجاسوس الملكية!**\n` +
                                   `📋 تم إرسال الكلمات السرية ورسائل الجاسوس على الخاص بنجاح لجميع اللاعبين!\n\n` +
                                   `⏱️ مدة اللعبة **3 دقائق**، فكروا واستعدوا لكشف الجاسوس! ⚡`;

                    await sock.sendMessage(from, { text: listText, mentions: participants }, { quoted: mek });

                    setTimeout(async () => {
                        if (global.activeSpyGames[from]) {
                            let spyUser = global.activeSpyGames[from].spy;
                            await sock.sendMessage(from, { text: `⏰ انتهت الـ 3 دقائق!\n🕵️‍♂️ الجاسوس الحقيقي كان: @${spyUser.split('@')[0]}`, mentions: [spyUser] });
                            delete global.activeSpyGames[from];
                        }
                    }, 180000);
                    return;
                      }
                                                 let userRankLevel = getUserRank(sender);
                let isTopThreeOrDev = isDev || userRankLevel <= 2;

                if (command === '.ترقية') {
                    if (!isTopThreeOrDev) {
                        return await sock.sendMessage(from, { text: `❌ هذا الأمر مخصص للرتب العليا الثلاثة الأولى والمطورين فقط! 🛡️` }, { quoted: mek });
                    }
                    let parts = q.split(' ');
                    let rankNum = parseInt(parts[0]);
                    let tUser = getTarget();

                    if (isNaN(rankNum) || rankNum < 0 || rankNum >= rankTitles.length || !tUser) {
                        return await sock.sendMessage(from, { text: `⚠️ استخدم الطريقة الصحيحة:\n\`.ترقية [رقم الرتبة من 0 لـ ${rankTitles.length - 1}] [@منشن]\`` }, { quoted: mek });
                    }

                    if (!userBank[tUser]) {
                        userBank[tUser] = { cash: 50, coins: 200, points: 10, hearts: 3, xp: 0, level: rankTitles.length - 1 };
                    }
                    
                    userBank[tUser].level = rankNum;
                    let newRankTitle = rankTitles[rankNum];
                    await sock.sendMessage(from, { text: `🎉 مبروك! تم ترقية العضو @${tUser.split('@')[0]} بنجاح وأصبح الآن برتبة:\n*${newRankTitle}* 👑`, mentions: [tUser] }, { quoted: mek });
                    return;
                }

                let isHighRank = isDev || userRankLevel <= 7;

                if (command === '.كتم' || command === '.فك كتم') {
                    if (!isHighRank) {
                        return await sock.sendMessage(from, { text: `❌ هذا الأمر مخصص للرتب العليا والمطورين فقط! 🛡️` }, { quoted: mek });
                    }
                    if (command === '.كتم') {
                        let tUser = getTarget();
                        if (!tUser) return await sock.sendMessage(from, { text: `⚠️ قم بعمل منشن للشخص المراد كتمه.` }, { quoted: mek });
                        mutedUsers[tUser] = true;
                        await sock.sendMessage(from, { text: `🔇 تم كتم العضو @${tUser.split('@')[0]} بنجاح!`, mentions: [tUser] }, { quoted: mek });
                    } else if (command === '.فك كتم') {
                        let tUser = getTarget();
                        if (!tUser) return await sock.sendMessage(from, { text: `⚠️ قم بعمل منشن للشخص المراد فك كتمه.` }, { quoted: mek });
                        delete mutedUsers[tUser];
                        await sock.sendMessage(from, { text: `🔊 تم فك الكتم عن العضو @${tUser.split('@')[0]} بنجاح!`, mentions: [tUser] }, { quoted: mek });
                    }
                    return;
                }

                if (command === '.اضافة مطور') {
                    if (!isDev) {
                        return await sock.sendMessage(from, { text: `❌ هذا الأمر خاص بالمطورين الأساسيين فقط! 👑` }, { quoted: mek });
                    }
                    let newDevTarget = getTarget();
                    if (!newDevTarget) {
                        return await sock.sendMessage(from, { text: `❌ يرجى الرد على رسالة الشخص أو عمل منشن له لإضافته مطوراً! ⚠️` }, { quoted: mek });
                    }
                    let devNum = newDevTarget.split('@')[0];
                    if (!global.botOwners.includes(devNum)) {
                        global.botOwners.push(devNum);
                    }
                    await sock.sendMessage(from, { text: `✅ تم ترقية العضو @${devNum} إلى رتبة مطور بوت غوجو الملكي بنجاح! 🚀`, mentions: [newDevTarget] }, { quoted: mek });
                    return;
                }

                if (command === '.بوت') {
                    const uptimeM = Math.floor((Date.now() - startTime) / 60000);
                    const pingMsg = `🤖 *حالة بوت غوجو الملكي*\n- الحالة: متصل وسحابي 24/7 🚀\n- سرعة الاستجابة: ممتازة\n- مدة التشغيل: ${uptimeM} دقيقة\n- الاتصال: مستقر تماماً ✅`;
                    await sock.sendMessage(from, { text: pingMsg }, { quoted: mek });
                    return;
                }

                if (command === '.بوينت') {
                    let uPts = userBank[sender]?.points || 10;
                    let uCash = userBank[sender]?.cash || 50;
                    await sock.sendMessage(from, { text: `💰 رصيدك السري:\n- النقاط: ${uPts} 🪙\n- المال: ${uCash} جنيه 💵`, mentions: [sender] }, { quoted: mek });
                    return;
                }

                if (command === '.عرض') {
                    let rank = getUserRank(sender);
                    if (rank !== 0) {
                        await sock.sendMessage(from, { text: '❌ عذراً، أمر العرض (`.عرض`) مخصص للإمبراطور (الرتبة 0) فقط! 👑' }, { quoted: mek });
                        return;
                    }

                    let quotedMsg = mek.message.extendedTextMessage && mek.message.extendedTextMessage.contextInfo && mek.message.extendedTextMessage.contextInfo.quotedMessage;
                    let isQuotedImage = quotedMsg && quotedMsg.imageMessage;
                    let isQuotedVideo = quotedMsg && quotedMsg.videoMessage;
                    let isDirectImage = mek.message.imageMessage;
                    let isDirectVideo = mek.message.videoMessage;

                    if (isQuotedImage || isDirectImage) {
                        let imageMsg = isQuotedImage ? quotedMsg.imageMessage : mek.message.imageMessage;
                        let stream = await downloadContentFromMessage(imageMsg, 'image');
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }
                        await sock.sendMessage(from, { image: buffer, caption: imageMsg.caption || "👁️ عرض الوسائط (الإمبراطور)" }, { quoted: mek });
                        return;
                    } else if (isQuotedVideo || isDirectVideo) {
                        let videoMsg = isQuotedVideo ? quotedMsg.videoMessage : mek.message.videoMessage;
                        let stream = await downloadContentFromMessage(videoMsg, 'video');
                        let buffer = Buffer.from([]);
                        for await (const chunk of stream) {
                            buffer = Buffer.concat([buffer, chunk]);
                        }
                        await sock.sendMessage(from, { video: buffer, caption: videoMsg.caption || "👁️ عرض الوسائط (الإمبراطور)" }, { quoted: mek });
                        return;
                    } else {
                        await sock.sendMessage(from, { text: `👑 يا صاحب السعادة الإمبراطور، يرجى الرد على صورة أو فيديو لاستخدام أمر `.عرض` بنجاح.` }, { quoted: mek });
                        return;
                    }
                }

                if (command === '.رتب') {
                    let rankDisplayList = `👑 ──『 **قائمة الرتب الـ 50 والأعضاء** 』── 👑\n\n`;
                    let categorizedRanks = {};
                    
                    for (let userKey in userBank) {
                        let uLevel = getUserRank(userKey);
                        if (!categorizedRanks[uLevel]) {
                            categorizedRanks[uLevel] = [];
                        }
                        categorizedRanks[uLevel].push(userKey);
                    }

                    rankTitles.forEach((title, index) => {
                        rankDisplayList += `[${index}] ▪️ *${title}*:\n`;
                        let membersInRank = categorizedRanks[index];
                        if (membersInRank && membersInRank.length > 0) {
                            membersInRank.forEach(m => {
                                rankDisplayList += `   - @${m.split('@')[0]}\n`;
                            });
                        } else {
                            rankDisplayList += `   - (لا يوجد أعضاء)\n`;
                        }
                        rankDisplayList += `\n`;
                    });

                    rankDisplayList += `╰───────────────────────────⬣`;
                    let allMembersToMention = [];
                    for (let lvl in categorizedRanks) {
                        allMembersToMention.push(...categorizedRanks[lvl]);
                    }

                    await sock.sendMessage(from, { text: rankDisplayList, mentions: allMembersToMention }, { quoted: mek });
                    return;
                }

                if (mutedUsers[sender] && !isDev) {
                    await sock.sendMessage(from, { delete: mek.key });
                    return;
                }          
                                  userBank[sender].xp += 2;
                const userLevel = userBank[sender].level;
                if (userBank[sender].xp >= 150 && userLevel > 0) {
                    userBank[sender].xp = 0;
                    userBank[sender].level -= 1;
                    await sock.sendMessage(from, { text: `🎉 مبروك يا @${sender.split('@')[0]}، ترقيت لرتبة (${rankTitles[userBank[sender].level]})! 👑`, mentions: [sender] });
                }
                else if (command === '.اوامر' || command === '.الأوامر') {
                    let menuText = `╔═══════════════════════════╗\n║   👑 **قائمة أوامر بوت غوجو** 👑    ║\n╠═══════════════════════════╣\n║ 📌 المطور: مالك علي عبد الرحيم\n╠═══════════════════════════╣\n║ • \`.اوامر\` 📋 - القائمة الرئيسية\n║ • \`.العاب\` 🎮 - ألعاب المسابقات\n║ • \`.رتب\` 🎖️ - الرتب الـ 50\n║ • \`.حاله\` 📊 - ملفك الشخصي\n║ • \`.بنك\` 🏦 - رصيدك\n╚═══════════════════════════╝`;
                    await sock.sendMessage(from, { text: menuText }, { quoted: mek });
                }
                else if (command === '.مطور' || command === '.المطور') {
                    let devMenuText = `👑 ──『 **قائمة المطور** 』── 👑\n• \`.اضافة مطور\` ➕\n• \`.معلومات الكل\` 📊\n╰───────────────────────────⬣`;
                    await sock.sendMessage(from, { text: devMenuText }, { quoted: mek });
                }
                else if (command === '.العاب') {
                    const gamesMenu = `🎮 ──『 **الألعاب الملكية** 』── 🎮\n• \`.خمن\` 🌝\n• \`.الجاسوس\` 🕵️‍♂️ (سر خاص للجميع عدا الجاسوس)\n• \`.اكس اوه\` ❌⭕\n╰───────────────────────────⬣`;
                    await sock.sendMessage(from, { text: gamesMenu }, { quoted: mek });
                }
                else if (command === '.حاله' || command === '.حالة' || command === '.معلومات') {
                    let targetUser = getTarget() || sender;
                    const uName = targetUser.split('@')[0];
                    const uBank = userBank[targetUser] || { cash: 50, coins: 200, points: 10, xp: 0, level: rankTitles.length - 1 };
                    const uRankName = rankTitles[uBank.level] || "عضو 👤";
                    const statusText = `📊 العضو: @${uName}\n💰 الكاش: ${uBank.cash}\n🏦 البنك: ${uBank.coins}\n👑 الرتبة: ${uRankName}`;
                    await sock.sendMessage(from, { text: statusText, mentions: [targetUser] }, { quoted: mek });
                }
                else if (command === '.بنك') {
                    const targetUser = getTarget() || sender;
                    const uBank = userBank[targetUser] || { cash: 50, coins: 200 };
                    await sock.sendMessage(from, { text: `🏦 المحفظة: ${uBank.cash} ج | البنك: ${uBank.coins} 🪙`, mentions: [targetUser] }, { quoted: mek });
                }

            } catch (error) {
                console.error("خطأ في معالجة الرسائل:", error);
            }
        });

    } catch (err) {
        console.error("خطأ في تشغيل البوت:", err);
    }
}

startGojoBot();
