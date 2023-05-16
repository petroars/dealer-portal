const db = require('./database');

const email = 'admin@example.com'; // replace with your admin email
const password = 'admin@example.com'; // replace with your admin password (use hash in production)
const company_name = 'admin@example.com'; // replace with your admin company name

const addAdmin = () => {
  db.get('SELECT * FROM users WHERE email = ?', email, (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    
    // If the admin user does not exist, create a new one
    if (!row) {
      db.run('INSERT INTO users (email, password, company_name) VALUES (?, ?, ?)', [email, password, company_name], (err) => {
        if (err) {
          return console.error(err.message);
        }
        console.log('Admin user has been successfully created.');
      });
    } else {
      console.log('Admin user already exists.');
    }
  });
};

addAdmin();
