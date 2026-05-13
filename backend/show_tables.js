require('dotenv').config();
const db = require('./config/database');
db.query('SHOW TABLES', (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows));
    process.exit();
});
