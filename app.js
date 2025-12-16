/*
  ГЛАВНАЯ ЛОГИКА ИГРЫ - ТАМАГОЧИ С ЛЕТУЧЕЙ МЫШКОЙ

  Содержит:
  1. Класс BatTamagotchi - модель питомца
  2. Работу с Telegram Web App
  3. Логику действий (кормить, играть и т.д.)
  4. Систему сохранения (localStorage + сервер)
  5. Автоматические обновления
*/

// ========== КОНСТАНТЫ И ПЕРЕМЕННЫЕ ==========
const API_BASE_URL = 'https://ваш-сервер.ру'; // Замените на реальный URL
let playerData = null;
let currentBat = null;

// ========== КЛАСС ЛЕТУЧЕЙ МЫШКИ ==========
class BatTamagotchi {
    constructor() {
        this.name = 'Мышька-летучка';
        this.level = 1;
        this.xp = 0;
        this.maxXp = 100;
        
        // Основные статусы (0-100%)
        this.hunger = 60;        // Голод
        this.happiness = 80;     // Настроение
        this.energy = 70;        // Энергия
        this.cleanliness = 90;   // Чистота
        
        // Ресурсы игрока
        this.blood = 42;         // Кровь для действий
        this.maxBlood = 100;
        this.coins = 1250;       // Золото
        this.gems = 85;          // Премиум валюта
        
        this.isSleeping = false;
        this.lastUpdate = Date.now();
    }
    
    // Выполнить действие (кормление, игра и т.д.)
    performAction(action) {
        const costs = {
            feed: 10,   // Покормить - 10 крови
            play: 15,   // Поиграть - 15 крови
            clean: 5,   // Помыть - 5 крови
            sleep: 0    // Уложить спать - бесплатно
        };
        
        // Проверяем достаточно ли крови
        if (this.blood < costs[action]) {
            return { success: false, message: 'Недостаточно крови!' };
        }
        
        // Списание крови
        this.blood -= costs[action];
        
        // Эффекты от действий
        switch(action) {
            case 'feed':
                this.hunger = Math.max(0, this.hunger - 20);
                this.happiness = Math.min(100, this.happiness + 10);
                break;
            case 'play':
                this.happiness = Math.min(100, this.happiness + 15);
                this.energy = Math.max(0, this.energy - 10);
                this.hunger = Math.min(100, this.hunger + 5);
                break;
            case 'clean':
                this.happiness = Math.min(100, this.happiness + 5);
                this.cleanliness = 100;
                break;
            case 'sleep':
                this.energy = 100;
                this.isSleeping = true;
                setTimeout(() => this.isSleeping = false, 10000); // Спит 10 сек
                break;
        }
        
        // Добавляем опыт
        this.addXP(10);
        
        // Автосохранение
        this.save();
        
        return { 
            success: true, 
            message: `Действие "${action}" выполнено!` 
        };
    }
    
    // Добавление опыта и проверка уровня
    addXP(amount) {
        this.xp += amount;
        
        // Проверка повышения уровня
        if (this.xp >= this.maxXp) {
            this.level++;
            this.xp = 0;
            this.maxXp = Math.floor(this.maxXp * 1.5); // Увеличиваем требуемый опыт
            this.coins += 100;
            this.gems += 5;
            
            return { 
                levelUp: true, 
                newLevel: this.level,
                message: `🎉 Уровень повышен! Теперь уровень ${this.level}!`
            };
        }
        
        return { levelUp: false };
    }
    
    // Восстановление крови со временем (1 единица в 5 минут)
    restoreBlood() {
        const now = Date.now();
        const minutesPassed = (now - this.lastUpdate) / (1000 * 60);
        const bloodToRestore = Math.floor(minutesPassed / 5);
        
        if (bloodToRestore > 0) {
            this.blood = Math.min(this.maxBlood, this.blood + bloodToRestore);
            this.lastUpdate = now;
            return bloodToRestore;
        }
        
        return 0;
    }
    
    // Сохранение в localStorage
    save() {
        const saveData = {
            name: this.name,
            level: this.level,
            xp: this.xp,
            maxXp: this.maxXp,
            hunger: this.hunger,
            happiness: this.happiness,
            energy: this.energy,
            cleanliness: this.cleanliness,
            blood: this.blood,
            coins: this.coins,
            gems: this.gems,
            lastUpdate: this.lastUpdate
        };
        
        localStorage.setItem('batTamagotchi', JSON.stringify(saveData));
        
        // Также отправляем на сервер если есть соединение
        this.saveToServer();
    }
    
    // Сохранение на сервер
    async saveToServer() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/pet/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: playerData?.id,
                    petData: this.getData()
                })
            });
            return await response.json();
        } catch (error) {
            console.log('Сервер недоступен, сохранено локально');
            return null;
        }
    }
    
    // Загрузка из localStorage
    load() {
        const saved = localStorage.getItem('batTamagotchi');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(this, data);
            
            // Восстанавливаем кровь со времени последнего сохранения
            this.restoreBlood();
            
            return true;
        }
        return false;
    }
    
    // Получение данных для передачи
    getData() {
        return {
            name: this.name,
            level: this.level,
            xp: this.xp,
            maxXp: this.maxXp,
            hunger: this.hunger,
            happiness: this.happiness,
            energy: this.energy,
            cleanliness: this.cleanliness,
            blood: this.blood,
            coins: this.coins,
            gems: this.gems
        };
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ИГРЫ ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🦇 Игра "Мышька-летучка" загружается...');
    
    // 1. Инициализация Telegram Web App
    initTelegramWebApp();
    
    // 2. Создание или загрузка питомца
    initBat();
    
    // 3. Настройка интерфейса
    setupUI();
    
    // 4. Запуск автообновлений
    startAutoUpdates();
});

// Инициализация Telegram Web App
function initTelegramWebApp() {
    if (window.Telegram?.WebApp) {
        const tg = Telegram.WebApp;
        
        // Расширяем на весь экран
        tg.expand();
        
        // Предупреждение при закрытии
        tg.enableClosingConfirmation();
        
        // Получаем данные пользователя из Telegram
        const user = tg.initDataUnsafe?.user;
        if (user) {
            playerData = {
                id: user.id,
                name: user.first_name || user.username,
                avatar: user.photo_url
            };
            
            // Обновляем имя в интерфейсе
            document.getElementById('playerName').textContent = playerData.name;
            
            // Пытаемся загрузить данные с сервера
            loadFromServer(user.id);
        }
    } else {
        // Режим разработки (без Telegram)
        playerData = { id: 1, name: 'Игрок', avatar: null };
        console.log('Режим разработки: Telegram Web App не найден');
    }
}

// Инициализация питомца
function initBat() {
    currentBat = new BatTamagotchi();
    
    // Пытаемся загрузить сохранённые данные
    if (!currentBat.load()) {
        // Создаём нового питомца
        console.log('Создан новый питомец');
        currentBat.save();
    }
    
    // Обновляем интерфейс
    updateUI();
}

// Настройка пользовательского интерфейса
function setupUI() {
    // Кнопки действий
    document.querySelectorAll('.action-btn').forEach(btn => {
        const action = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (action) {
            btn.onclick = () => performAction(action);
        }
    });
    
    // Кнопки навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        const tab = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (tab) {
            btn.onclick = () => openTab(tab);
        }
    });
    
    // Кнопки магазина
    document.querySelectorAll('.plus-button').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const shopType = btn.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (shopType) openShop(shopType);
        };
    });
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ИГРЫ ==========

// Выполнение действия
async function performAction(action) {
    if (!currentBat) return;
    
    const result = currentBat.performAction(action);
    
    if (result.success) {
        // Показываем уведомление
        showNotification(result.message);
        
        // Обновляем интерфейс
        updateUI();
        
        // Анимация
        animateAction(action);
        
        // Проверяем повышение уровня
        const xpResult = currentBat.addXP(10);
        if (xpResult.levelUp) {
            showNotification(xpResult.message, 'success');
        }
    } else {
        showNotification(result.message, 'error');
    }
}

// Покупка в магазине
async function buyItem(itemType, amount, cost) {
    if (!currentBat) return;
    
    // Проверяем достаточно ли гемов
    if (currentBat.gems < cost) {
        showNotification(`Недостаточно гемов! Нужно: ${cost}, есть: ${currentBat.gems}`, 'error');
        return;
    }
    
    // Списание гемов
    currentBat.gems -= cost;
    
    // Начисление купленного
    if (itemType === 'gold') {
        currentBat.coins += amount;
    } else if (itemType === 'gems') {
        currentBat.gems += amount;
    }
    
    // Сохранение
    currentBat.save();
    
    // Обновление интерфейса
    updateUI();
    
    // Уведомление
    showNotification(`Куплено: ${amount} ${itemType === 'gold' ? 'золота' : 'гемов'}!`, 'success');
}

// ========== РАБОТА С СЕРВЕРОМ ==========

// Загрузка данных с сервера
async function loadFromServer(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/${userId}`);
        const data = await response.json();
        
        if (data.success && data.pet) {
            // Обновляем данные питомца с сервера
            Object.assign(currentBat, data.pet);
            updateUI();
            console.log('Данные загружены с сервера');
        }
    } catch (error) {
        console.log('Не удалось загрузить данные с сервера', error);
    }
}

// ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========

function updateUI() {
    if (!currentBat) return;
    
    // Уровень и опыт
    const xpPercent = (currentBat.xp / currentBat.maxXp) * 100;
    document.getElementById('currentLevel').textContent = currentBat.level;
    document.getElementById('levelBar').style.width = `${xpPercent}%`;
    document.getElementById('levelText').textContent = 
        `${currentBat.xp}/${currentBat.maxXp} XP`;
    
    // Ресурсы
    document.getElementById('bloodValue').textContent = 
        `${currentBat.blood}/${currentBat.maxBlood}`;
    document.getElementById('goldValue').textContent = 
        formatNumber(currentBat.coins);
    document.getElementById('gemValue').textContent = currentBat.gems;
    
    // Статус питомца
    document.getElementById('hungerValue').textContent = 
        `${Math.round(currentBat.hunger)}%`;
    document.getElementById('happinessValue').textContent = 
        `${Math.round(currentBat.happiness)}%`;
    
    // Прогресc-бары
    document.querySelector('.hunger').style.width = `${currentBat.hunger}%`;
    document.querySelector('.happiness').style.width = `${currentBat.happiness}%`;
    document.querySelector('.energy').style.width = `${currentBat.energy}%`;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// Форматирование чисел (1,000)
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Временное решение - alert
    // В реальном приложении сделайте красивый попап
    if (type === 'error') {
        alert(`❌ ${message}`);
    } else if (type === 'success') {
        alert(`✅ ${message}`);
    } else {
        alert(`ℹ️ ${message}`);
    }
}

// Анимация действия
function animateAction(action) {
    const bat = document.querySelector('.bat-character');
    if (!bat) return;
    
    // Сбрасываем анимацию
    bat.style.animation = 'none';
    
    // Запускаем заново
    setTimeout(() => {
        bat.style.animation = 'batHover 2s ease-in-out infinite';
    }, 10);
}

// Открытие вкладок
function openTab(tabName) {
    // Снимаем активный класс со всех кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Добавляем активный класс текущей кнопке
    event.target.closest('.nav-btn').classList.add('active');
    
    // Закрываем все модальные окна
    closeAllModals();
    
    // Открываем нужную вкладку
    switch(tabName) {
        case 'tasks':
            document.getElementById('tasksModal').style.display = 'block';
            break;
        case 'shop':
            openShop('gold');
            break;
        default:
            // Для остальных вкладок - заглушка
            showNotification(`Раздел "${tabName}" в разработке`, 'info');
    }
}

// Открытие магазина
function openShop(type) {
    closeAllModals();
    
    if (type === 'gold') {
        document.getElementById('goldShopModal').style.display = 'block';
    } else if (type === 'gems') {
        document.getElementById('gemShopModal').style.display = 'block';
    }
}

// Закрытие модальных окон
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// ========== АВТОМАТИЧЕСКИЕ ОБНОВЛЕНИЯ ==========

function startAutoUpdates() {
    // Восстановление крови каждые 5 минут
    setInterval(() => {
        if (currentBat) {
            const restored = currentBat.restoreBlood();
            if (restored > 0) {
                updateUI();
            }
        }
    }, 5 * 60 * 1000);
    
    // Добавление опыта за время в игре (1 XP в минуту)
    setInterval(() => {
        if (currentBat) {
            const result = currentBat.addXP(1);
            if (result.levelUp) {
                showNotification(result.message, 'success');
            }
            updateUI();
        }
    }, 60 * 1000);
    
    // Автосохранение каждую минуту
    setInterval(() => {
        if (currentBat) {
            currentBat.save();
        }
    }, 60 * 1000);
    
    // Обновление времени в окне
    updateWindowTime();
    setInterval(updateWindowTime, 60 * 1000);
}

// Обновление времени в окне башни
function updateWindowTime() {
    const now = new Date();
    const hour = now.getHours();
    const windowContent = document.getElementById('windowContent');
    
    if (!windowContent) return;
    
    // Определяем время суток по часам
    if (hour >= 6 && hour < 12) {
        windowContent.textContent = '🌅 Утро';
        windowContent.style.background = 'linear-gradient(to bottom, #ff7e5f, #feb47b)';
    } else if (hour >= 12 && hour < 18) {
        windowContent.textContent = '☀️ День';
        windowContent.style.background = 'linear-gradient(to bottom, #87CEEB, #E0F6FF)';
    } else if (hour >= 18 && hour < 22) {
        windowContent.textContent = '🌆 Вечер';
        windowContent.style.background = 'linear-gradient(to bottom, #654ea3, #da98b4)';
    } else {
        windowContent.textContent = '🌙 Ночь';
        windowContent.style.background = 'linear-gradient(to bottom, #0f0c29, #302b63)';
    }
}

// ========== ЭКСПОРТ ДЛЯ ГЛОБАЛЬНОГО ИСПОЛЬЗОВАНИЯ ==========
window.openTab = openTab;
window.performAction = performAction;
window.openShop = openShop;
window.buyItem = buyItem;
window.closeAllModals = closeAllModals;

// Закрытие модального окна (для onclick)
window.closeModal = function(modalId) {
    document.getElementById(modalId).style.display = 'none';
};