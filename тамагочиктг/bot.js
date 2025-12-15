const { Telegraf } = require('telegraf');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Команда /start - показываем приветствие и кнопку
bot.start(async (ctx) => {
    const welcomeMessage = `🦇 *Привет, ${ctx.from.first_name}!*

Я - *Мышька-летучка*, твой ночной питомец!

*Что я умею:*
• Пить кровь и летать по ночам 🩸
• Пугать прохожих 👻
• Собирать лунные монеты 🌙
• Эволюционировать и становиться сильнее! 

*Нажми кнопку ниже, чтобы начать ухаживать за мной!*`;

    await ctx.replyWithPhoto(
        { source: './assets/bat-preview.jpg' }, // Загрузите превью
        {
            caption: welcomeMessage,
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: '🎮 Играть с мышкой 🦇', 
                            web_app: { url: process.env.WEB_APP_URL } 
                        }
                    ],
                    [
                        { text: '📊 Статистика', callback_data: 'stats' },
                        { text: '❓ Помощь', callback_data: 'help' }
                    ]
                ]
            }
        }
    );
});

// Кнопка внизу экрана (постоянная)
bot.command('play', async (ctx) => {
    await ctx.reply('Открываю игру...', {
        reply_markup: {
            keyboard: [
                [{ text: '🦇 Открыть игру', web_app: { url: process.env.WEB_APP_URL } }],
                [{ text: '📊 Моя статистика' }, { text: '🛍️ Магазин' }],
                [{ text: '❓ Помощь' }, { text: '🎭 Сменить скин' }]
            ],
            resize_keyboard: true,
            one_time_keyboard: false
        }
    });
});

// Установка меню бота (видно внизу)
bot.telegram.setChatMenuButton({
    chat_id: ctx.chat.id,
    menu_button: {
        type: 'web_app',
        text: 'Играть 🦇',
        web_app: { url: process.env.WEB_APP_URL }
    }
});

// Простые команды
bot.command('stats', (ctx) => {
    // Здесь будет логика получения статистики
    ctx.reply('📊 *Твоя статистика:*\nУровень: 1\nЛунные монеты: 100\nЗдоровье мышки: 100%', {
        parse_mode: 'Markdown'
    });
});

bot.command('help', (ctx) => {
    ctx.reply(`*Как играть:*\n
1. Открой игру по кнопке 🦇
2. Корми мышку кровью (кнопка 🩸)
3. Играй с ней - пугай прохожих!
4. Следи за её настроением и здоровьем
5. Зарабатывай лунные монеты

*Команды бота:*
/start - Начать игру
/play - Открыть игру
/stats - Статистика
/shop - Магазин
/help - Помощь`, {
        parse_mode: 'Markdown'
    });
});

// Обработка callback-ов от inline кнопок
bot.action('stats', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Загружаю статистику...');
    // Логика загрузки статистики
});

bot.action('help', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Чем помочь?');
});

// Запуск бота
bot.launch()
    .then(() => console.log('🦇 Бот Мышька-летучка запущен!'))
    .catch(err => console.error('Ошибка запуска бота:', err));

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));