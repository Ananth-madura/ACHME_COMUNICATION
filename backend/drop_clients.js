const db = require('./config/database');

db.query('DROP TABLE IF EXISTS `clients`', (err) => {
  if (err) console.error(err);
  else console.log('Deleted clients table');
  process.exit();
});
