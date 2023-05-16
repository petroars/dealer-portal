const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./myDatabase.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT, company_name TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS user_files (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, file_name TEXT)');
  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT, company_name TEXT, isAdmin INTEGER)');

});

module.exports = db;
