import logging
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Конфигурация
BOT_TOKEN = "ВАШ_ТОКЕН_БОТА"  # Получите у @BotFather
WEB_APP_URL = "https://ваш-miniapp.com"  # URL вашего Mini App

# Команда /start - отправляет кнопку с Mini App
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Отправляет приветственное сообщение с кнопкой для открытия Mini App"""
    
    # Создаем кнопку с Web App
    keyboard = [
        [InlineKeyboardButton("🚀 Открыть Mini App", web_app=WebAppInfo(url=WEB_APP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    # Отправляем сообщение с кнопкой
    await update.message.reply_text(
        "🎮 *Добро пожаловать в Mini App!*\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение прямо в Telegram:",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

# Команда /menu - устанавливает постоянную кнопку меню
async def set_menu_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Устанавливает кнопку меню внизу чата"""
    
    # Создаем клавиатуру с Web App кнопкой
    keyboard = [[InlineKeyboardButton("📱 Открыть приложение", web_app=WebAppInfo(url=WEB_APP_URL))]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Теперь вы можете открыть Mini App через кнопку меню внизу экрана!\n"
        "Или нажмите кнопку ниже:",
        reply_markup=reply_markup
    )

# Обработка данных из Mini App
async def handle_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Получает и обрабатывает данные из Mini App"""
    
    # Получаем данные из Web App
    web_app_data = update.effective_message.web_app_data
    
    try:
        # Парсим JSON данные
        data = json.loads(web_app_data.data)
        user_id = update.effective_user.id
        user_name = update.effective_user.full_name
        
        logger.info(f"Получены данные от {user_name} (ID: {user_id}): {data}")
        
        # Обрабатываем данные
        # Пример: если Mini App отправил форму с именем
        if 'name' in data:
            await update.message.reply_text(
                f"✅ Спасибо, {data['name']}! Ваши данные получены:\n"
                f"```json\n{json.dumps(data, indent=2, ensure_ascii=False)}\n```",
                parse_mode='Markdown'
            )
        else:
            await update.message.reply_text(
                f"📨 Данные получены:\n"
                f"```json\n{json.dumps(data, indent=2, ensure_ascii=False)}\n```",
                parse_mode='Markdown'
            )
            
    except json.JSONDecodeError:
        await update.message.reply_text("❌ Ошибка: неверный формат данных")
    except Exception as e:
        logger.error(f"Ошибка обработки данных: {e}")
        await update.message.reply_text("❌ Произошла ошибка при обработке данных")

# Команда для отправки кнопки в любом чате
async def send_mini_app_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Отправляет инлайн-кнопку с Mini App"""
    
    keyboard = [
        [
            InlineKeyboardButton("🎮 Играть", web_app=WebAppInfo(url=WEB_APP_URL)),
            InlineKeyboardButton("⚙️ Настройки", web_app=WebAppInfo(url=f"{WEB_APP_URL}/settings"))
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        "Выберите действие:",
        reply_markup=reply_markup
    )

# Обработка нажатий на инлайн-кнопки
async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик нажатий на кнопки"""
    query = update.callback_query
    await query.answer()
    
    if query.data == 'open_app':
        await query.edit_message_text(
            "Нажмите на кнопку ниже, чтобы открыть Mini App:",
            reply_markup=InlineKeyboardMarkup([[
                InlineKeyboardButton("📲 Открыть", web_app=WebAppInfo(url=WEB_APP_URL))
            ]])
        )

# Команда /help
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Показывает справку"""
    help_text = """
*Доступные команды:*
/start - Запустить бота и открыть Mini App
/menu - Установить кнопку меню
/app - Отправить кнопку с Mini App
/help - Показать эту справку

*Как использовать Mini App:*
1. Нажмите кнопку "Открыть Mini App"
2. Приложение откроется прямо в Telegram
3. Работайте с приложением
4. Данные автоматически отправятся боту
"""
    await update.message.reply_text(help_text, parse_mode='Markdown')

# Обработка обычных сообщений
async def echo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Эхо-ответ на текстовые сообщения"""
    keyboard = [[InlineKeyboardButton("🤖 Открыть Mini App", web_app=WebAppInfo(url=WEB_APP_URL))]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"Вы сказали: {update.message.text}\n\n"
        "Хотите открыть Mini App?",
        reply_markup=reply_markup
    )

# Основная функция
def main() -> None:
    """Запуск бота"""
    # Создаем Application
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрируем обработчики команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("menu", set_menu_button))
    application.add_handler(CommandHandler("app", send_mini_app_button))
    application.add_handler(CommandHandler("help", help_command))
    
    # Обработчик данных из Web App
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))
    
    # Обработчик инлайн-кнопок
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # Обработчик текстовых сообщений
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, echo))
    
    # Запускаем бота
    print("🤖 Бот запущен! Нажмите Ctrl+C для остановки")
    application.run_polling(allowed_updates=Update.ALL_UPDATES)

if __name__ == '__main__':
    main()