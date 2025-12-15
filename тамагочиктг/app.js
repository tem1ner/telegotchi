// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    if (tg) {
        tg.expand();
        tg.enableClosingConfirmation();
        tg.setHeaderColor('#8b00ff');
        tg.setBackgroundColor('#0c0c2e');
        
        // Используем данные пользователя Telegram
        const user = tg.initDataUnsafe.user;
        if (user) {
            const userName = user.first_name || 'Друг';
            document.getElementById('userName').textContent = `${userName} и Мышька-летучка`;
        }
    }
    
    // Инициализация мышки
    initBat();
    
    // Авто-обновление статуса каждую минуту
    setInterval(() => bat.updateStatus(), 60000);
    
    // Проверка уведомлений каждые 30 секунд
    setInterval(checkBatNotifications, 30000);
    
    // Анимация крыльев
    setInterval(animateWings, 2000);
});

// Инициализация летучей мышки
function initBat() {
    bat.loadFromLocalStorage();
    updateBatUI();
    
    // Если мышка новая
    if (!localStorage.getItem('batTamagotchi')) {
        setTimeout(() => {
            const name = prompt('Дайте имя вашей летучей мышке:', 'Мышька-летучка');
            if (name) {
                bat.name = name;
                bat.saveToLocalStorage();
                updateBatUI();
                bat.sayPhrase(`Привет! Я ${name}! Рада встрече! 🦇`);
            }
        }, 1500);
    } else {
        bat.sayRandomPhrase();
    }
}

// Обновление интерфейса мышки
function updateBatUI() {
    // Обновляем бары статуса
    document.querySelector('.blood-thirst').style.width = `${100 - bat.bloodThirst}%`;
    document.querySelector('.night-energy').style.width = `${bat.nightEnergy}%`;
    document.querySelector('.mood').style.width = `${bat.mood}%`;
    document.querySelector('.wing-cleanliness').style.width = `${bat.wingCleanliness}%`;
    
    // Обновляем статистику
    document.getElementById('nightCoins').textContent = bat.nightCoins;
    document.getElementById('level').textContent = bat.level;
    document.getElementById('health').textContent = Math.round(bat.health);
    
    // Обновляем анимацию в зависимости от состояния
    updateBatAnimation();
}

// Анимация мышки в зависимости от состояния
function updateBatAnimation() {
    const batBody = document.getElementById('batBody');
    const mouth = document.getElementById('mouth');
    const state = bat.getState();
    
    // Сбрасываем все классы состояний
    batBody.classList.remove('sleeping', 'flying', 'thirsty', 'happy', 'sad');
    
    switch(state) {
        case 'sleeping':
            batBody.classList.add('sleeping');
            mouth.style.display = 'none';
            break;
        case 'flying':
            batBody.classList.add('flying');
            // Ускоряем анимацию крыльев
            document.querySelector('.left-wing').style.animationDuration = '0.5s';
            document.querySelector('.right-wing').style.animationDuration = '0.5s';
            break;
        case 'thirsty':
            batBody.classList.add('thirsty');
            mouth.style.background = '#8b0000';
            break;
        case 'happy':
            batBody.classList.add('happy');
            mouth.style.height = '25px';
            break;
        case 'sad':
            batBody.classList.add('sad');
            mouth.style.borderRadius = '20px 20px 0 0';
            break;
        default:
            mouth.style.display = 'block';
            mouth.style.background = '#ff0066';
            mouth.style.height = '20px';
            mouth.style.borderRadius = '0 0 20px 20px';
    }
}

// Анимация крыльев
function animateWings() {
    if (bat.isFlying) {
        const wings = document.querySelectorAll('.wing');
        wings.forEach(wing => {
            wing.style.animationDuration = `${0.3 + Math.random() * 0.2}s`;
        });
    }
}

// Выполнение действий
function performAction(action) {
    const batBody = document.getElementById('batBody');
    
    switch(action) {
        case 'feed':
            if (bat.feedBlood()) {
                batBody.classList.add('eating');
                createBloodEffect();
                setTimeout(() => batBody.classList.remove('eating'), 500);
            } else {
                showBatAlert('Мышка не хочет крови!');
            }
            break;
        case 'play':
            if (bat.scare()) {
                createScareEffect();
                animateScare();
            } else {
                showBatAlert('Мышка слишком устала для игр!');
            }
            break;
        case 'fly':
            if (bat.fly()) {
                createFlightEffect();
                document.querySelector('.pet').classList.add('flying-mode');
                setTimeout(() => {
                    document.querySelector('.pet').classList.remove('flying-mode');
                }, 5000);
            } else {
                showBatAlert('Не хватает энергии для полёта!');
            }
            break;
        case 'sleep':
            bat.sleepInCave();
            createSleepEffect();
            break;
    }
    
    updateBatUI();
    saveBatGame();
}

// Создание эффекта крови
function createBloodEffect() {
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            bat.createEffect('💉', '#ff0000');
        }, i * 100);
    }
}

// Создание эффекта страха
function createScareEffect() {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            bat.createEffect('👻', '#8b00ff');
        }, i * 200);
    }
    
    // Анимация испуга
    const eyes = document.querySelectorAll('.eye');
    eyes.forEach(eye => {
        eye.style.transform = 'scale(1.3)';
        setTimeout(() => eye.style.transform = 'scale(1)', 500);
    });
}

// Создание эффекта полёта
function createFlightEffect() {
    const effects = ['🦇', '💨', '✨', '🌙'];
    effects.forEach((emoji, index) => {
        setTimeout(() => {
            bat.createEffect(emoji, index === 3 ? '#ffcc00' : '#00ccff');
        }, index * 300);
    });
}

// Создание эффекта сна
function createSleepEffect() {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            bat.createEffect('💤', '#66ccff');
        }, i * 500);
    }
}

// Анимация испуга
function animateScare() {
    const batElem = document.querySelector('.pet');
    batElem.style.transform = 'scale(1.1)';
    batElem.style.filter = 'brightness(1.5)';
    
    setTimeout(() => {
        batElem.style.transform = 'scale(1)';
        batElem.style.filter = 'brightness(1)';
    }, 300);
}

// Покупка предметов
function buyItem(item) {
    const prices = {
        'blood': 25,
        'crown': 100,
        'cloak': 75,
        'amulet': 150
    };
    
    if (bat.nightCoins >= prices[item]) {
        bat.nightCoins -= prices[item];
        
        switch(item) {
            case 'blood':
                bat.feedBlood(40);
                break;
            case 'crown':
                bat.mood = Math.min(100, bat.mood + 50);
                bat.level += 0.5;
                break;
            case 'cloak':
                bat.nightEnergy = Math.min(100, bat.nightEnergy + 30);
                break;
            case 'amulet':
                bat.health = 100;
                break;
        }
        
        updateBatUI();
        saveBatGame();
        
        // Эффект покупки
        bat.createEffect('🎁', '#ffcc00');
        showBatAlert('Покупка успешна!');
    } else {
        showBatAlert('Недостаточно лунных монет!');
    }
}

// Проверка уведомлений для мышки
function checkBatNotifications() {
    if (bat.bloodThirst > 85) {
        showNotification('🩸 Мышька жаждет крови! Срочно покормите!');
    } else if (bat.mood < 20) {
        showNotification('😢 Мышьке грустно! Поиграйте с ней!');
    } else if (bat.wingCleanliness < 20) {
        showNotification('✨ Крылья мышки грязные! Пора почистить!');
    } else if (bat.health < 50) {
        showNotification('❤️‍🩹 Мышька плохо себя чувствует! Позаботьтесь о ней!');
    } else if (bat.nightEnergy < 30 && !bat.isSleeping) {
        showNotification('🌙 Мышька устала! Отведите в пещеру!');
    }
}

// Показать уведомление
function showNotification(message) {
    if (tg && tg.showPopup) {
        tg.showPopup({
            title: '🦇 Внимание!',
            message: message,
            buttons: [{ type: 'ok', text: 'Понятно' }]
        });
    } else {
        showBatAlert(message);
    }
}

// Показать всплывающее окно
function showBatAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'bat-alert';
    alertDiv.innerHTML = `
        <div class="alert-content">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Сохранение игры
function saveBatGame() {
    bat.saveToLocalStorage();
    
    // Отправляем данные в Telegram бот
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            action: 'saveBat',
            data: {
                name: bat.name,
                level: bat.level,
                coins: bat.nightCoins
            }
        }));
    }
}

// Управление модальными окнами
function openTab(tabName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.nav-btn').classList.add('active');
    
    if (tabName === 'shop') {
        document.getElementById('shopModal').style.display = 'block';
    } else if (tabName === 'inventory') {
        document.getElementById('inventoryModal').style.display = 'block';
    }
}

function closeModal() {
    document.getElementById('shopModal').style.display = 'none';
    document.getElementById('inventoryModal').style.display = 'none';
    document.querySelector('.nav-btn[onclick*="main"]').click();
}

// Добавляем стили для уведомлений
const alertStyle = document.createElement('style');
alertStyle.textContent = `
    .bat-alert {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(90deg, #ff0066, #8b00ff);
        color: white;
        padding: 15px 25px;
        border-radius: 15px;
        z-index: 9999;
        animation: slideDown 0.3s ease-out;
        box-shadow: 0 5px 20px rgba(255, 0, 102, 0.5);
        border: 2px solid #ffcc00;
        max-width: 90%;
    }
    
    .alert-content {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
    }
    
    .alert-content i {
        font-size: 20px;
        color: #ffcc00;
    }
    
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    .flying-mode .bat-body {
        animation: flyingMove 5s ease-in-out infinite;
    }
    
    @keyframes flyingMove {
        0%, 100% { transform: translateX(-50%) translateY(0); }
        50% { transform: translateX(-50%) translateY(-20px); }
    }
`;
document.head.appendChild(alertStyle);