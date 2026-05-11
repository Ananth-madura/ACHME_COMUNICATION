const db = require("../config/database");

db.ready.then(() => {
  db.query("DESCRIBE clients", (err, results) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  });
}).catch(err => {
  console.error(err);
  process.exit(1);
});
