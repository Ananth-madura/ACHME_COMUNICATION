require('dotenv').config();
const db = require('./config/database');
db.query('DESCRIBE from_addresses', (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows));
    process.exit();
});
