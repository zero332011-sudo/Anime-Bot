const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = "malek malek malek 010"; 
const TOKEN = "ضع_هنا_التوكن_الدائم_من_ميتا"; 
const PHONE_NUMBER_ID = "69033026138303"; 

const DEVELOPER_ID = "69033026138303";
const DEVELOPER_PHONE = "201032219184";
const BOT_PHONE = "201154684341";

global.botOwners = global.botOwners || [DEVELOPER_PHONE, DEVELOPER_ID, BOT_PHONE];

const userBank = {}; 
const mutedUsers = {};
const badWordsWarnings = {}; 
const startTime = Date.now();

global.activeGuessGames = global.activeGuessGames || {};
global.activeSpyGames = global.activeSpyGames || {};
global.activeXoSessions = global.activeXoSessions || {};

const guessCharacters = [
    { name: "غوكو", img: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500" },
    { name: "ناروتو", img: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500" },
    { name: "ساسكي", img: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500" },
    { name: "لوفي", img: "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=500" },
    { name: "كاتسكي", img: "https://images.unsplash.com/photo-1563089145-599997674d42?w=500" }
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

const badWordsList = [
    "كسمك", "شلتت", "كلب", "حمار", "قذر", "لعن", "زفت", "متخلف", "غبي", "معفن", 
    "وسخ", "منيوك", "قحبة", "متناكة", "خول", "شرموطة", "عرص", "حلوف", "حيوان", "خرا"
];

async function sendWhatsAppMessage(recipientPhone, messageText) {
    try {
        await axios.post(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            to: recipientPhone,
            text: { body: messageText }
        }, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
    } catch (error) {
        console.error("خطأ في إرسال الرسالة عبر ميتا:", error.response?.data || error.message);
    }
}

async function sendWhatsAppImage(recipientPhone, imageUrl, captionText) {
    try {
        await axios.post(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            to: recipientPhone,
            image: { link: imageUrl, caption: captionText }
        }, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        });
    } catch (error) {
        console.error("خطأ في إرسال الصورة عبر ميتا:", error.response?.data || error.message);
    }
}

function getUserRank(userJid) {
    let isU_Dev = global.botOwners.some(dev => userJid.includes(dev));
    if (isU_Dev) return 0;
    return userBank[userJid]?.level ?? (rankTitles.length - 1);
}

app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', async (req, res) => {
    let body = req.body;

    if (body.object) {
        if (
            body.entry &&
            body.entry[0].changes &&
            body.entry[0].changes[0].value.messages &&
            body.entry[0].changes[0].value.messages[0]
        ) {
            let sender = body.entry[0].changes[0].value.messages[0].from; 
            let msg_body = body.entry[0].changes[0].value.messages[0].text?.body || ''; 

            let isDev = global.botOwners.some(dev => sender.includes(dev));

            if (mutedUsers[sender] && !isDev) {
                return res.sendStatus(200);
            }

            if (!isDev && msg_body) {
                let lowerBody = msg_body.toLowerCase();
                let hasBadWord = badWordsList.some(word => lowerBody.includes(word));
                if (hasBadWord) {
                    badWordsWarnings[sender] = (badWordsWarnings[sender] || 0) + 1;
                    let warningsLeft = 3 - badWordsWarnings[sender];

                    if (badWordsWarnings[sender] >= 3) {
                        mutedUsers[sender] = true;
                        badWordsWarnings[sender] = 0;
                        await sendWhatsAppMessage(sender, `🚨 تم كتمك لتخطيك الحد المسموح للشتايم (3 مرات)! ⚠`);
                    } else {
                        await sendWhatsAppMessage(sender, `⚠️ انتباه! ممنوع استخدام الألفاظ النابية. لديك (${warningsLeft}) إنذارات أخرى قبل الكتم! 🚫`);
                    }
                    return res.sendStatus(200);
                }
            }

            if (!userBank[sender]) {
                userBank[sender] = { cash: isDev ? 1000000 : 50, coins: isDev ? 10000000000 : 200, points: 10, xp: 0, level: isDev ? 0 : (rankTitles.length - 1) };
            }

            if (global.activeGuessGames[sender]) {
                let correctAnswer = global.activeGuessGames[sender];
                if (msg_body.trim() === correctAnswer) {
                    delete global.activeGuessGames[sender];
                    userBank[sender].coins += 50;
                    userBank[sender].xp += 10;
                    await sendWhatsAppMessage(sender, `🎉 إجابتك صحيحة ومذهلة! لقد ربحت 50 عملة🪙 و 10 نقاط خبرة XP! 🚀`);
                    return res.sendStatus(200);
                }
            }

            let args = msg_body.trim().split(/ +/);
            let command = args.shift().toLowerCase();

            let userRankLevel = getUserRank(sender);
            let isTopThreeOrDev = isDev || userRankLevel <= 2;
            let isHighRank = isDev || userRankLevel <= 7;

            if (command === '.ترقية') {
                if (!isTopThreeOrDev) {
                    await sendWhatsAppMessage(sender, `❌ هذا الأمر مخصص للرتب العليا الثلاثة الأولى والمطورين فقط! 🛡️`);
                    return res.sendStatus(200);
                }
                let rankNum = parseInt(args[0]);
                if (isNaN(rankNum) || rankNum < 0 || rankNum >= rankTitles.length) {
                    await sendWhatsAppMessage(sender, `⚠️ استخدم الطريقة الصحيحة:\n\`.ترقية [رقم الرتبة من 0 لـ ${rankTitles.length - 1}]\``);
                    return res.sendStatus(200);
                }
                userBank[sender].level = rankNum;
                await sendWhatsAppMessage(sender, `🎉 مبروك! تمت ترقيتك بنجاح وأصبحت برتبة: *${rankTitles[rankNum]}* 👑`);
            }
            else if (command === '.كتم') {
                if (!isHighRank) {
                    await sendWhatsAppMessage(sender, `❌ هذا الأمر مخصص للرتب العليا والمطورين فقط! 🛡️`);
                    return res.sendStatus(200);
                }
                await sendWhatsAppMessage(sender, `🔇 تم تفعيل الحماية.`);
            }
            else if (command === '.اضافة مطور') {
                if (!isDev) {
                    await sendWhatsAppMessage(sender, `❌ هذا الأمر خاص بالمطورين الأساسيين فقط! 👑`);
                    return res.sendStatus(200);
                }
                let devNum = args[0] || sender;
                if (!global.botOwners.includes(devNum)) {
                    global.botOwners.push(devNum);
                }
                await sendWhatsAppMessage(sender, `✅ تمت إضافة الرقم مطوراً بنجاح! 🚀`);
            }
            else if (command === '.خمن') {
                let randomChar = guessCharacters[Math.floor(Math.random() * guessCharacters.length)];
                global.activeGuessGames[sender] = randomChar.name;
                await sendWhatsAppImage(sender, randomChar.img, `🌝 **لعبة تخمين شخصيات الأنمي** 🎯\nمن هو شخصية الأنمي في الصورة؟ اكتب اسم الشخصية مباشرة للرد الفائز!`);
            }
            else if (command === '.الجاسوس' || command === '.جاسوس') {
                let secretWords = ["غوكو", "ناروتو", "ساسكي", "لوفي", "سايتاما", "باكوجان"];
                let selectedWord = secretWords[Math.floor(Math.random() * secretWords.length)];
                
                global.activeSpyGames[sender] = { word: selectedWord, status: 'started' };
                
                let spyIntro = `🕵️‍♂️ **لعبة الجاسوس الملكية** 🕵️‍♂️\n` +
                               `👥 المشاركون في الجولة الحالية:\n` +
                               `1️⃣ @${sender.slice(0, 5)}***\n\n` +
                               `⏳ جارٍ تجهيز الأدوار وإرسال الكلمة السرية في الخاص...\n` +
                               `⏱️ وقت النقاش: **3 دقائق**، وبعدها سيتم الكشف عن الكلمة والنتائج!`;
                
                await sendWhatsAppMessage(sender, spyIntro);
                
                setTimeout(async () => {
                    await sendWhatsAppMessage(sender, `🤫 **الكلمة السرية لجلسة الجاسوس:** *${selectedWord}*\nالتزم بالسرية ولا تظهر أنك تعرفها كاملة!`);
                }, 2000);
            }
            else if (command === '.اكس اوه' || command === '.xo') {
                global.activeXoSessions[sender] = { board: ['1','2','3','4','5','6','7','8','9'], turn: '❌' };
                let xoText = `❌⭕ **لعبة XO الملكية** ⭕❌\n` +
                             `[ 1 ] | [ 2 ] | [ 3 ]\n` +
                             `-----------------------\n` +
                             `[ 4 ] | [ 5 ] | [ 6 ]\n` +
                             `-----------------------\n` +
                             `[ 7 ] | [ 8 ] | [ 9 ]\n\n` +
                             `دور اللاعب: ❌\nاكتب رقم الخانة (من 1 إلى 9) لتحديد مكان علامتك!`;
                await sendWhatsAppMessage(sender, xoText);
            }
            else if (command === '.انهاء') {
                delete global.activeGuessGames[sender];
                delete global.activeSpyGames[sender];
                delete global.activeXoSessions[sender];
                await sendWhatsAppMessage(sender, `🛑 تم إنهاء أي لعبة نشطة حالياً بنجاح!`);
            }
            else if (command === '.بوت') {
                const uptimeM = Math.floor((Date.now() - startTime) / 60000);
                await sendWhatsAppMessage(sender, `🤖 *حالة بوت غوجو الملكي (ميتا)*\n- الحالة: متصل وسحابي 24/7 🚀\n- مدة التشغيل: ${uptimeM} دقيقة\n- الاتصال: مستقر تماماً ✅`);
            }
            else if (command === '.بوينت') {
                let uPts = userBank[sender]?.points || 10;
                let uCash = userBank[sender]?.cash || 50;
                await sendWhatsAppMessage(sender, `💰 رصيدك:\n- النقاط: ${uPts} 🪙\n- المال: ${uCash} جنيه 💵`);
            }
            else if (command === '.رتب') {
                let rankDisplayList = `👑 ──『 **قائمة الرتب الـ 50** 』── 👑\n\n`;
                rankTitles.forEach((title, index) => {
                    rankDisplayList += `[${index}] ▪️ *${title}*\n`;
                });
                await sendWhatsAppMessage(sender, rankDisplayList);
            }
            else if (command === '.اوامر' || command === '.الأوامر') {
                let menuText = `╔═══════════════════════════╗\n║   👑 **قائمة أوامر بوت غوجو** 👑    ║\n╠═══════════════════════════╣\n║ 📌 المطور: مالك علي عبد الرحيم\n╠═══════════════════════════╣\n║ • \`.اوامر\` 📋 - القائمة الرئيسية\n║ • \`.العاب\` 🎮 - ألعاب المسابقات\n║ • \`.رتب\` 🎖️ - الرتب الـ 50\n║ • \`.حاله\` 📊 - ملفك الشخصي\n║ • \`.بنك\` 🏦 - رصيدك\n╚═══════════════════════════╝`;
                await sendWhatsAppMessage(sender, menuText);
            }
            else if (command === '.العاب') {
                const gamesMenu = `🎮 ──『 **الألعاب الملكية** 』── 🎮\n• \`.خمن\` 🌝\n• \`.الجاسوس\` 🕵️‍♂️\n• \`.اكس اوه\` ❌⭕\n• \`.انهاء\` 🛑\n╰───────────────────────────⬣`;
                await sendWhatsAppMessage(sender, gamesMenu);
            }
            else if (command === '.حاله' || command === '.حالة' || command === '.معلومات') {
                let uBank = userBank[sender] || { cash: 50, coins: 200, points: 10, xp: 0, level: rankTitles.length - 1 };
                let uRankName = rankTitles[uBank.level] || "عضو 👤";
                let statusText = `📊 ملفك الشخصي:\n💰 الكاش: ${uBank.cash}\n🏦 البنك: ${uBank.coins}\n👑 الرتبة: ${uRankName}`;
                await sendWhatsAppMessage(sender, statusText);
            }
            else if (command === '.بنك') {
                let uBank = userBank[sender] || { cash: 50, coins: 200 };
                await sendWhatsAppMessage(sender, `🏦 المحفظة: ${uBank.cash} ج | البنك: ${uBank.coins} 🪙`);
            }
            else {
                await sendWhatsAppMessage(sender, `أهلاً بك! تم استلام رسالتك عبر نظام ميتا. اكتب .اوامر لعرض القائمة الرئيسية.`);
            }
        }
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Meta Webhook Server is running on port ${PORT}`);
});
                      
