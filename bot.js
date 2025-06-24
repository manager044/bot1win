const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const axios = require('axios');
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

const DATA_FILE = 'data.json';
const PORT = process.env.PORT || 3000;

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const userState = new Map();
const tempData = new Map();

bot.start((ctx) => {
    ctx.reply('Выберите команду:', Markup.keyboard([
        ['/addland', '/getlink'],
        ['/deleteland']
    ]).resize());
});

bot.command('addland', (ctx) => {
    userState.set(ctx.chat.id, 'awaiting_name');
    ctx.reply('Как называется ленд?', cancelButton());
});

bot.command('getlink', (ctx) => {
    userState.set(ctx.chat.id, 'awaiting_domain');
    ctx.reply('Отправьте домен:', cancelButton());
});

bot.command('deleteland', (ctx) => {
    const data = loadData();
    const keys = Object.keys(data);
    if (keys.length === 0) return ctx.reply('База пуста.');

    const keyboard = keys.map(name => [Markup.button.text(name)]);
    keyboard.push([Markup.button.text('❌ Отмена')]);
    userState.set(ctx.chat.id, 'deleting');
    ctx.reply('Выберите ленд для удаления:', Markup.keyboard(keyboard).resize());
});

bot.on('text', (ctx) => {
    const state = userState.get(ctx.chat.id);
    const text = ctx.message.text;

    if (text === '❌ Отмена') {
        userState.delete(ctx.chat.id);
        tempData.delete(ctx.chat.id);
        return ctx.reply('Действие отменено.', Markup.removeKeyboard());
    }

    if (state === 'awaiting_name') {
        tempData.set(ctx.chat.id, { name: text });
        userState.set(ctx.chat.id, 'awaiting_tail');
        return ctx.reply('Отправь мне хвост лендинга:', cancelButton());
    }

    if (state === 'awaiting_tail') {
        const { name } = tempData.get(ctx.chat.id);
        const data = loadData();
        data[name] = text;
        saveData(data);
        userState.delete(ctx.chat.id);
        tempData.delete(ctx.chat.id);
        return ctx.reply(`Ленд "${name}" сохранён ✅`, Markup.removeKeyboard());
    }

    if (state === 'awaiting_domain') {
        const domain = text.replace(/\/$/, '');
        const data = loadData();
        if (Object.keys(data).length === 0) return ctx.reply('База пуста.');

        const reply = Object.entries(data).map(([name, tail]) => 
            `${name} - ${domain}${tail}`
        ).join('\n\n');

        userState.delete(ctx.chat.id);
        return ctx.reply(reply, Markup.removeKeyboard());
    }

    if (state === 'deleting') {
        const data = loadData();
        if (data[text]) {
            delete data[text];
            saveData(data);
            userState.delete(ctx.chat.id);
            return ctx.reply(`Ленд "${text}" удалён ✅`, Markup.removeKeyboard());
        } else {
            return ctx.reply('Такого ленда нет.');
        }
    }
});

function cancelButton() {
    return Markup.keyboard([['❌ Отмена']]).resize();
}

// Пингер для Render
setInterval(() => {
    axios.get('https://render.com') // можно заменить на свой Render URL
        .then(() => console.log('Пинг...'))
        .catch(() => console.log('Пинг не удался'));
}, 5 * 60 * 1000); // каждые 5 минут

bot.launch();
console.log('Бот запущен');