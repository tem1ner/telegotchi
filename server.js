/*
  СЕРВЕР NODE.JS ДЛЯ ИГРЫ
  
  Основные функции:
  1. Хранение данных пользователей в SQLite
  2. API для синхронизации между устройствами
  3. Обработка действий питомца
  4. Магазин и покупки
  5. Автосохранение
  
  Запуск: node server.js
  Порт: 3000 (или переменная окружения PORT)
  
  API endpoints:
  - POST /api/user/init - создание пользователя
  - GET /api/user/:id - получение данных
  - POST /api/pet/save - сохранение питомца
  - POST /api/pet/action - выполнение действия
  - POST /api/shop/buy - покупка в магазине
*/
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Подключаем базу данных SQLite
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к БД:', err.message);
    } else {
        console.log('✅ Подключено к SQLite базе данных');
        initializeDatabase();
    }
});

// Инициализация базы данных
function initializeDatabase() {
    // Таблица пользователей
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE NOT NULL,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Таблица питомцев
    db.run(`
        CREATE TABLE IF NOT EXISTS pets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT DEFAULT 'Мышька-летучка',
            type TEXT DEFAULT 'bat',
            level INTEGER DEFAULT 1,
            experience INTEGER DEFAULT 0,
            max_experience INTEGER DEFAULT 100,
            hunger INTEGER DEFAULT 50,
            happiness INTEGER DEFAULT 80,
            energy INTEGER DEFAULT 70,
            cleanliness INTEGER DEFAULT 90,
            health INTEGER DEFAULT 100,
            coins INTEGER DEFAULT 100,
            gems INTEGER DEFAULT 10,
            blood INTEGER DEFAULT 42,
            max_blood INTEGER DEFAULT 100,
            last_fed DATETIME,
            last_played DATETIME,
            last_cleaned DATETIME,
            last_slept DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(user_id)
        )
    `);
    
    // Таблица инвентаря
    db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
    
    // Таблица заданий
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            task_type TEXT NOT NULL,
            current_progress INTEGER DEFAULT 0,
            required_progress INTEGER NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            reward INTEGER NOT NULL,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
    
    // Таблица платежей (для гемов)
    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            telegram_payment_id TEXT UNIQUE,
            amount_stars INTEGER,
            amount_gems INTEGER,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);
    
    console.log('✅ База данных инициализирована');
}

// ========== API ЭНДПОИНТЫ ==========

// 1. Получение или создание пользователя и питомца
app.post('/api/user/init', async (req, res) => {
    try {
        const { telegramId, username, firstName, lastName } = req.body;
        
        if (!telegramId) {
            return res.status(400).json({ error: 'Telegram ID обязателен' });
        }
        
        // Начинаем транзакцию
        await new Promise((resolve, reject) => {
            db.run('BEGIN TRANSACTION');
            resolve();
        });
        
        // Проверяем существование пользователя
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        let userId;
        
        if (user) {
            // Пользователь уже существует
            userId = user.id;
        } else {
            // Создаем нового пользователя
            const result = await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO users (telegram_id, username, first_name, last_name) 
                     VALUES (?, ?, ?, ?)`,
                    [telegramId, username, firstName, lastName],
                    function(err) {
                        if (err) reject(err);
                        else resolve(this.lastID);
                    }
                );
            });
            
            userId = result;
            
            // Создаем питомца для нового пользователя
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO pets (user_id) VALUES (?)`,
                    [userId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
            // Создаем базовые задания
            const defaultTasks = [
                ['feed', 3, 50],
                ['play', 5, 100],
                ['daily', 7, 200]
            ];
            
            for (const [taskType, required, reward] of defaultTasks) {
                await new Promise((resolve, reject) => {
                    db.run(
                        `INSERT INTO tasks (user_id, task_type, required_progress, reward) 
                         VALUES (?, ?, ?, ?)`,
                        [userId, taskType, required, reward],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
        }
        
        // Получаем полные данные пользователя
        const userData = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM users WHERE id = ?`,
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        // Получаем данные питомца
        const petData = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM pets WHERE user_id = ?`,
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        // Получаем задания
        const tasksData = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM tasks WHERE user_id = ?`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        // Получаем инвентарь
        const inventoryData = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM inventory WHERE user_id = ?`,
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        // Завершаем транзакцию
        await new Promise((resolve, reject) => {
            db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        res.json({
            success: true,
            user: userData,
            pet: petData,
            tasks: tasksData,
            inventory: inventoryData
        });
        
    } catch (error) {
        // Откатываем транзакцию при ошибке
        db.run('ROLLBACK');
        console.error('Ошибка инициализации пользователя:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

// 2. Сохранение данных питомца
app.post('/api/pet/save', async (req, res) => {
    try {
        const { userId, petData } = req.body;
        
        if (!userId || !petData) {
            return res.status(400).json({ error: 'Недостаточно данных' });
        }
        
        const result = await new Promise((resolve, reject) => {
            db.run(
                `UPDATE pets SET 
                    name = ?,
                    level = ?,
                    experience = ?,
                    max_experience = ?,
                    hunger = ?,
                    happiness = ?,
                    energy = ?,
                    cleanliness = ?,
                    health = ?,
                    coins = ?,
                    gems = ?,
                    blood = ?,
                    max_blood = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ?`,
                [
                    petData.name,
                    petData.level,
                    petData.experience,
                    petData.max_experience,
                    petData.hunger,
                    petData.happiness,
                    petData.energy,
                    petData.cleanliness,
                    petData.health,
                    petData.coins,
                    petData.gems,
                    petData.blood,
                    petData.max_blood,
                    userId
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes });
                }
            );
        });
        
        res.json({
            success: true,
            message: 'Данные питомца сохранены',
            changes: result.changes
        });
        
    } catch (error) {
        console.error('Ошибка сохранения питомца:', error);
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// 3. Выполнение действия с питомцем
app.post('/api/pet/action', async (req, res) => {
    try {
        const { userId, action, cost } = req.body;
        
        // Получаем текущие данные питомца
        const pet = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM pets WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!pet) {
            return res.status(404).json({ error: 'Питомец не найден' });
        }
        
        // Проверяем достаточно ли крови
        if (pet.blood < cost) {
            return res.status(400).json({ 
                success: false, 
                error: 'Недостаточно крови' 
            });
        }
        
        // Обновляем данные в зависимости от действия
        let updates = {};
        let taskUpdate = null;
        
        switch (action) {
            case 'feed':
                updates.hunger = Math.max(0, pet.hunger - 20);
                updates.happiness = Math.min(100, pet.happiness + 10);
                updates.blood = pet.blood - cost;
                updates.last_fed = new Date().toISOString();
                taskUpdate = { type: 'feed', progress: 1 };
                break;
                
            case 'play':
                updates.happiness = Math.min(100, pet.happiness + 15);
                updates.energy = Math.max(0, pet.energy - 10);
                updates.hunger = Math.min(100, pet.hunger + 5);
                updates.blood = pet.blood - cost;
                updates.last_played = new Date().toISOString();
                taskUpdate = { type: 'play', progress: 1 };
                break;
                
            case 'clean':
                updates.happiness = Math.min(100, pet.happiness + 5);
                updates.cleanliness = 100;
                updates.blood = pet.blood - cost;
                updates.last_cleaned = new Date().toISOString();
                break;
                
            case 'sleep':
                updates.energy = 100;
                updates.last_slept = new Date().toISOString();
                break;
                
            default:
                return res.status(400).json({ error: 'Неизвестное действие' });
        }
        
        // Обновляем питомца
        await new Promise((resolve, reject) => {
            const setClause = Object.keys(updates)
                .map(key => `${key} = ?`)
                .join(', ');
            
            const values = Object.values(updates);
            values.push(userId);
            
            db.run(
                `UPDATE pets SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
                 WHERE user_id = ?`,
                values,
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Обновляем задание если нужно
        if (taskUpdate) {
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE tasks SET 
                        current_progress = current_progress + ?,
                        last_updated = CURRENT_TIMESTAMP
                     WHERE user_id = ? AND task_type = ? AND completed = FALSE`,
                    [taskUpdate.progress, userId, taskUpdate.type],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            
            // Проверяем выполнение задания
            const task = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT * FROM tasks 
                     WHERE user_id = ? AND task_type = ?`,
                    [userId, taskUpdate.type],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });
            
            if (task && task.current_progress >= task.required_progress && !task.completed) {
                // Награждаем за выполнение задания
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE pets SET coins = coins + ? WHERE user_id = ?`,
                        [task.reward, userId],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
                
                await new Promise((resolve, reject) => {
                    db.run(
                        `UPDATE tasks SET completed = TRUE WHERE id = ?`,
                        [task.id],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
        }
        
        // Получаем обновленные данные
        const updatedPet = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM pets WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        res.json({
            success: true,
            pet: updatedPet,
            message: `Действие "${action}" выполнено`
        });
        
    } catch (error) {
        console.error('Ошибка выполнения действия:', error);
        res.status(500).json({ error: 'Ошибка выполнения действия' });
    }
});

// 4. Покупка в магазине
app.post('/api/shop/buy', async (req, res) => {
    try {
        const { userId, itemType, itemId, priceGems, priceCoins } = req.body;
        
        // Получаем данные пользователя
        const pet = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM pets WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        // Проверяем достаточно ли ресурсов
        if (priceGems && pet.gems < priceGems) {
            return res.status(400).json({ error: 'Недостаточно гемов' });
        }
        
        if (priceCoins && pet.coins < priceCoins) {
            return res.status(400).json({ error: 'Недостаточно монет' });
        }
        
        // Списание ресурсов
        await new Promise((resolve, reject) => {
            let updateQuery = 'UPDATE pets SET updated_at = CURRENT_TIMESTAMP';
            const values = [];
            
            if (priceGems) {
                updateQuery += ', gems = gems - ?';
                values.push(priceGems);
            }
            
            if (priceCoins) {
                updateQuery += ', coins = coins - ?';
                values.push(priceCoins);
            }
            
            updateQuery += ' WHERE user_id = ?';
            values.push(userId);
            
            db.run(updateQuery, values, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        
        // Добавление в инвентарь
        const existingItem = await new Promise((resolve, reject) => {
            db.get(
                `SELECT * FROM inventory 
                 WHERE user_id = ? AND item_type = ? AND item_id = ?`,
                [userId, itemType, itemId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (existingItem) {
            // Увеличиваем количество
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE inventory SET quantity = quantity + 1 
                     WHERE id = ?`,
                    [existingItem.id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        } else {
            // Добавляем новый предмет
            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO inventory (user_id, item_type, item_id) 
                     VALUES (?, ?, ?)`,
                    [userId, itemType, itemId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
        
        // Получаем обновленные данные
        const updatedPet = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM pets WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        res.json({
            success: true,
            pet: updatedPet,
            message: 'Покупка успешна'
        });
        
    } catch (error) {
        console.error('Ошибка покупки:', error);
        res.status(500).json({ error: 'Ошибка покупки' });
    }
});

// 5. Восстановление крови со временем
app.post('/api/pet/restore-blood', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // Рассчитываем сколько времени прошло
        const pet = await new Promise((resolve, reject) => {
            db.get(
                `SELECT *, 
                 (strftime('%s', 'now') - strftime('%s', updated_at)) as seconds_passed 
                 FROM pets WHERE user_id = ?`,
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!pet) {
            return res.status(404).json({ error: 'Питомец не найден' });
        }
        
        // Восстанавливаем 1 кровь каждые 5 минут (300 секунд)
        const bloodToRestore = Math.floor(pet.seconds_passed / 300);
        const newBlood = Math.min(pet.max_blood, pet.blood + bloodToRestore);
        
        if (newBlood > pet.blood) {
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE pets SET blood = ?, updated_at = CURRENT_TIMESTAMP 
                     WHERE user_id = ?`,
                    [newBlood, userId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
        
        const updatedPet = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM pets WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        res.json({
            success: true,
            pet: updatedPet,
            restored: newBlood - pet.blood
        });
        
    } catch (error) {
        console.error('Ошибка восстановления крови:', error);
        res.status(500).json({ error: 'Ошибка восстановления' });
    }
});

// 6. Получение данных пользователя (для загрузки игры)
app.get('/api/user/:telegramId', async (req, res) => {
    try {
        const telegramId = req.params.telegramId;
        
        const user = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const pet = await new Promise((resolve, reject) => {
            db.get(
                'SELECT * FROM pets WHERE user_id = ?',
                [user.id],
                (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                }
            );
        });
        
        const tasks = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM tasks WHERE user_id = ?',
                [user.id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        const inventory = await new Promise((resolve, reject) => {
            db.all(
                'SELECT * FROM inventory WHERE user_id = ?',
                [user.id],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });
        
        res.json({
            success: true,
            user,
            pet,
            tasks,
            inventory
        });
        
    } catch (error) {
        console.error('Ошибка получения данных:', error);
        res.status(500).json({ error: 'Ошибка получения данных' });
    }
});

// 7. Автосохранение при закрытии (через Beacon API)
app.post('/api/pet/autosave', async (req, res) => {
    try {
        const { userId, petData } = req.body;
        
        if (!userId || !petData) {
            return res.status(400).json({ error: 'Недостаточно данных' });
        }
        
        await new Promise((resolve, reject) => {
            db.run(
                `UPDATE pets SET 
                    hunger = ?,
                    happiness = ?,
                    energy = ?,
                    cleanliness = ?,
                    health = ?,
                    coins = ?,
                    gems = ?,
                    blood = ?,
                    updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ?`,
                [
                    petData.hunger,
                    petData.happiness,
                    petData.energy,
                    petData.cleanliness,
                    petData.health,
                    petData.coins,
                    petData.gems,
                    petData.blood,
                    userId
                ],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        // Отправляем быстрый ответ (важно для Beacon API)
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        
    } catch (error) {
        console.error('Ошибка автосохранения:', error);
        res.status(500).json({ error: 'Ошибка сохранения' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`🌐 API доступен по адресу: http://localhost:${PORT}`);
});