const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
const app = express();

const bot = new Telegraf(process.env.BOT_TOKEN);
const lands = {};

let currentAction = null;
let tempName = '';

function escapeMarkdown(text) {
  return text
    .replace(/[-_.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/`/g, '\\`')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!')
    .replace(/=/g, '\\=')
    .replace(/&/g, '\\&')
    .replace(/\//g, '\\/')
    .replace(/:/g, '\\:')
    .replace(/\?/g, '\\?');
}

bot.start((ctx) => {
  currentAction = null;
  const buttons = {
    reply_markup: {
      keyboard: [['/addland'], ['/getlink'], ['/deleteland']],
      resize_keyboard: true,
      one_time_keyboard: false,
    },
  };
  ctx.reply('Выберите действие:', buttons);
});

bot.command('addland', (ctx) => {
  ctx.reply('Как называется ленд?');
  currentAction = 'addland_name';
});

bot.command('getlink', (ctx) => {
  ctx.reply('Отправьте домен (например, https://site.com)');
  currentAction = 'getlink';
});

bot.command('deleteland', (ctx) => {
  const names = Object.keys(lands);
  if (names.length === 0) return ctx.reply('База пуста.');
  const buttons = names.map((name) => [{ text: name }]);
  ctx.reply('Выберите ленд для удаления:', {
    reply_markup: {
      keyboard: buttons.concat([['Отмена']]),
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
  currentAction = 'delete';
});

bot.on('text', (ctx) => {
  const text = ctx.message.text;

  if (currentAction === 'addland_name') {
    tempName = text;
    ctx.reply('Отправь мне хвост лендинга');
    currentAction = 'addland_tail';
  } else if (currentAction === 'addland_tail') {
    lands[tempName] = text;
    ctx.reply(`Ленд '${tempName}' добавлен!`);
    currentAction = null;
  } else if (currentAction === 'getlink') {
    let domain = text.endsWith('/') ? text.slice(0, -1) : text;
    if (!domain.startsWith('http')) domain = 'https://' + domain;
    let response = '';
    for (const [name, path] of Object.entries(lands)) {
      const safeName = escapeMarkdown(name);
      const safeURL = escapeMarkdown(domain + path);
      response += `\`${safeName}\` - \`${safeURL}\`\n\n`;
    }
    ctx.replyWithMarkdownV2(response.trim());
    currentAction = null;
  } else if (currentAction === 'delete') {
    if (text === 'Отмена') {
      ctx.reply('Удаление отменено.');
    } else if (lands[text]) {
      delete lands[text];
      ctx.reply(`Ленд '${text}' удалён.`);
    } else {
      ctx.reply('Такого ленда нет.');
    }
    currentAction = null;
  }
});

// Пингер
setInterval(() => {
  axios.get(process.env.PING_URL || 'https://render.com');
}, 4 * 60 * 1000);

app.get('/', (_, res) => res.send('Бот работает!'));
app.listen(process.env.PORT || 3000, () => console.log('Сервер запущен'));
bot.launch();
