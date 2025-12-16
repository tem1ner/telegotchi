const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

console.log('=== ПОЛЬЗОВАТЕЛИ ===');
db.all('SELECT * FROM users', (err, rows) => {
    rows.forEach(row => console.log(row));
});

console.log('\n=== ПИТОМЦЫ ===');
db.all('SELECT * FROM pets', (err, rows) => {
    rows.forEach(row => console.log(row));
});

db.close();