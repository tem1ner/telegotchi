class BatTamagotchi {
    constructor(name = 'Мышька-летучка') {
        this.name = name;
        this.bloodThirst = 50;       // 0-100 (жажда крови)
        this.nightEnergy = 80;       // 0-100 (ночная энергия)
        this.mood = 70;             // 0-100 (настроение)
        this.wingCleanliness = 90;   // 0-100 (чистота крыльев)
        this.health = 100;           // 0-100
        this.nightCoins = 100;       // лунные монеты
        this.level = 1;
        this.xp = 0;
        this.isSleeping = false;     // спит в пещере
        this.isFlying = false;       // в полёте
        this.lastUpdate = Date.now();
        this.phrases = [
            "Хочу крови! 🩸",
            "Полетай со мной! 🦇",
            "Темнота - мой друг 🌙",
            "Кыш-кыш, я страшный! 👻",
            "Обожаю ночные прогулки ✨",
            "Мои клыки остры как бритва 😈",
            "Давай поиграем в темноте! 🎮",
            "Я вижу в темноте! 🔴"
        ];
    }

    // Покормить кровью
    feedBlood(amount = 20) {
        if (this.bloodThirst > 0) {
            this.bloodThirst = Math.max(0, this.bloodThirst - amount);
            this.mood = Math.min(100, this.mood + 10);
            this.nightEnergy = Math.min(100, this.nightEnergy + 5);
            this.gainXP(15);
            return true;
        }
        return false;
    }

    // Напугать (игра)
    scare() {
        if (this.nightEnergy > 15) {
            this.mood = Math.min(100, this.mood + 20);
            this.nightEnergy = Math.max(0, this.nightEnergy - 15);
            this.bloodThirst = Math.min(100, this.bloodThirst + 10);
            this.gainXP(25);
            this.sayRandomPhrase();
            return true;
        }
        return false;
    }

    // Полетать
    fly() {
        if (this.nightEnergy > 30 && !this.isSleeping) {
            this.isFlying = true;
            this.nightEnergy -= 25;
            this.mood += 30;
            this.wingCleanliness = Math.max(0, this.wingCleanliness - 10);
            this.gainXP(30);
            
            setTimeout(() => {
                this.isFlying = false;
                this.updateStatus();
            }, 5000); // Полёт длится 5 секунд
            
            return true;
        }
        return false;
    }

    // Спать в пещере
    sleepInCave() {
        this.isSleeping = true;
        this.isFlying = false;
        
        // Восстановление во сне
        const restore = () => {
            this.nightEnergy = Math.min(100, this.nightEnergy + 10);
            this.health = Math.min(100, this.health + 5);
            
            if (this.nightEnergy < 100) {
                setTimeout(restore, 1000);
            } else {
                this.isSleeping = false;
                this.gainXP(40);
                this.sayPhrase("Выспалась! Готова к ночным приключениям! 🌙");
            }
            this.updateStatus();
        };
        
        setTimeout(restore, 1000);
        return true;
    }

    // Почистить крылья
    cleanWings() {
        this.wingCleanliness = 100;
        this.mood = Math.min(100, this.mood + 15);
        this.gainXP(10);
        this.sayPhrase("Крылья блестят! ✨");
    }

    // Сказать случайную фразу
    sayRandomPhrase() {
        const randomPhrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];
        this.sayPhrase(randomPhrase);
    }

    sayPhrase(phrase) {
        const bubble = document.getElementById('bubbleText');
        if (bubble) {
            bubble.textContent = phrase;
            // Автоскрытие через 3 секунды
            setTimeout(() => {
                bubble.textContent = "Мышька наблюдает... 👀";
            }, 3000);
        }
    }

    gainXP(amount) {
        this.xp += amount;
        if (this.xp >= this.level * 100) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.xp = 0;
        this.nightCoins += 75;
        this.health = 100;
        this.sayPhrase(`🎉 Я выросла! Теперь уровень ${this.level}!`);
        
        // Визуальный эффект уровня
        this.createEffect('✨', '#ffcc00');
    }

    // Обновление статуса со временем
    updateStatus() {
        const now = Date.now();
        const timePassed = (now - this.lastUpdate) / 60000; // в минутах
        
        if (!this.isSleeping) {
            // Жажда крови растёт
            this.bloodThirst = Math.min(100, this.bloodThirst + timePassed * 0.8);
            
            // Настроение падает, если скучно
            this.mood = Math.max(0, this.mood - timePassed * 0.4);
            
            // Крылья пачкаются
            this.wingCleanliness = Math.max(0, this.wingCleanliness - timePassed * 0.3);
            
            // Энергия восстанавливается ночью, тратится днём
            const isNight = new Date().getHours() >= 18 || new Date().getHours() < 6;
            if (isNight) {
                this.nightEnergy = Math.min(100, this.nightEnergy + timePassed * 0.5);
            } else {
                this.nightEnergy = Math.max(0, this.nightEnergy - timePassed * 0.7);
            }
            
            // Здоровье страдает, если очень хочется крови
            if (this.bloodThirst > 85) {
                this.health = Math.max(0, this.health - timePassed * 1.5);
                this.sayPhrase("Очень хочу крови! 🩸");
            }
            
            // Здоровье страдает, если грязные крылья
            if (this.wingCleanliness < 20) {
                this.health = Math.max(0, this.health - timePassed * 0.8);
            }
        }
        
        this.lastUpdate = now;
        this.saveToLocalStorage();
        this.updateUI();
        
        // Автоматические фразы
        if (Math.random() < 0.1) {
            this.sayRandomPhrase();
        }
    }

    // Создание визуального эффекта
    createEffect(emoji, color) {
        const container = document.getElementById('effectsContainer');
        const effect = document.createElement('div');
        
        effect.textContent = emoji;
        effect.style.cssText = `
            position: fixed;
            font-size: 40px;
            animation: sparkle 1s ease-out forwards;
            z-index: 1000;
            pointer-events: none;
            color: ${color};
            text-shadow: 0 0 10px ${color};
        `;
        
        // Случайная позиция
        effect.style.left = `${Math.random() * 80 + 10}%`;
        effect.style.top = `${Math.random() * 80 + 10}%`;
        
        container.appendChild(effect);
        
        setTimeout(() => effect.remove(), 1000);
    }

    saveToLocalStorage() {
        const batData = {
            name: this.name,
            bloodThirst: this.bloodThirst,
            nightEnergy: this.nightEnergy,
            mood: this.mood,
            wingCleanliness: this.wingCleanliness,
            health: this.health,
            nightCoins: this.nightCoins,
            level: this.level,
            xp: this.xp,
            lastUpdate: this.lastUpdate
        };
        localStorage.setItem('batTamagotchi', JSON.stringify(batData));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('batTamagotchi');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(this, data);
            this.lastUpdate = data.lastUpdate || Date.now();
            this.updateStatus();
        }
    }

    // Получить текущее состояние для анимаций
    getState() {
        if (this.isSleeping) return 'sleeping';
        if (this.isFlying) return 'flying';
        if (this.bloodThirst > 80) return 'thirsty';
        if (this.mood > 80) return 'happy';
        if (this.mood < 30) return 'sad';
        return 'normal';
    }
}

// Глобальный экземпляр
let bat = new BatTamagotchi();