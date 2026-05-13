require('dotenv').config();
const db = require('./config/database');

db.query("ALTER TABLE clients ADD COLUMN service VARCHAR(255) DEFAULT NULL", (err) => {
    if (err && !err.message.includes('Duplicate column name')) {
        console.error('Error adding column:', err);
    } else {
        console.log('Service column added or already exists.');
    }
    process.exit();
});
