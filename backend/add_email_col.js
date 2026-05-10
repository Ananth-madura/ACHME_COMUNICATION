require('dotenv').config();
const db = require('./config/database');

const addCol = (table, col) => {
    return new Promise((resolve) => {
        db.query(`ALTER TABLE ${table} ADD COLUMN ${col} VARCHAR(255) DEFAULT NULL`, (err) => {
            if (err && !err.message.includes('Duplicate column name')) {
                console.error(`Error adding column to ${table}:`, err);
            } else {
                console.log(`Column ${col} added or exists in ${table}.`);
            }
            resolve();
        });
    });
};

const run = async () => {
    await addCol('Walkins', 'email');
    await addCol('fields', 'email');
    process.exit();
};

run();
