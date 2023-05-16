const express = require("express"),
multer = require("multer"),
fs = require("fs"),
path = require("path"),
xlsx = require("xlsx"),
db = require("./database"),
iconv = require("iconv-lite"),
app = express(),
session = require("express-session"),
storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname),
    name = iconv.decode(Buffer.from(path.basename(file.originalname, ext), "binary"), "utf-8");
    let newName = name,
    index = 1;
    while(fs.existsSync(`uploads/${newName}${ext}`)) {
      newName = `${name}-${index}`;
      index++;
    }
    cb(null, newName + ext);
  }
}),
upload = multer({storage: storage}),
bcrypt = require("bcrypt"),
saltRounds = 10;

app.use(session({
  secret: "wgergseg43234tegersg3434hg",
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self' https://cdn.jsdelivr.net; script-src 'self' 'unsafe-inline'");
  next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Authentication Middleware
function checkAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login.html');
  }
}

// Check if user is admin
function checkAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
}

app.get("/", checkAuth, (req, res) => {
  if(req.session.user.isAdmin){
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    res.redirect('/products.html');
  }
});

app.get('/uploads', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err) return res.status(500).send('Error reading files');
    res.json(files.map(file => decodeURIComponent(path.basename(file, path.extname(file))) + path.extname(file)));
  });
});


app.get("/products", checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "products.html"));
});

app.post('/upload', upload.single('file'), (req, res) => {
  res.redirect('/');
});

app.delete("/delete/:filename",((e,s)=>{
  const{filename:r}=e.params,
  n=path.join("uploads",decodeURIComponent(r));
  
  // Unbind file from all users
  db.run("DELETE FROM user_files WHERE file_name = ?", [decodeURIComponent(r)], function(err){
    if (err) {
      console.error(err.message);
      return s.status(500).send("Error unbinding file from users");
    }

    // Then delete the file
    fs.unlink(n,(e=>{
      if(e) return s.status(500).send("Error deleting file");
      s.send("File deleted and unbound successfully");
    }));
  });
}));



app.get('/view/:filename', (req, res) => {
  const { filename } = req.params;
  const fileExtension = path.extname(filename);
  const baseName = path.basename(filename, fileExtension);
  const encodedFilename = Buffer.from(baseName, 'utf8').toString('base64') + fileExtension;
  const filePath = path.join('uploads', encodedFilename);

  try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error reading file');
  }
});


app.get('/latest', (req, res) => {
  fs.readdir('uploads', (err, files) => {
    if (err || files.length === 0) return res.status(404).send('No files found');
    files.sort((a, b) => fs.statSync(path.join('uploads', decodeURIComponent(a))).mtime - fs.statSync(path.join('uploads', decodeURIComponent(b))).mtime);
    res.json({ latest: files[0] });
  });
});

app.post('/register', async (req, res) => {
  const { email, password, company_name } = req.body;

  if (!email || !password || !company_name) {
    res.status(400).send('All fields are required');
    return;
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  db.run('INSERT INTO users (email, password, company_name) VALUES (?, ?, ?)', [email, hashedPassword, company_name], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error registering user');
      return;
    }
    res.send('User registered successfully');
  });
});

app.post("/login",((e,s)=>{const{email:r,password:n}=e.body;db.get("SELECT * FROM users WHERE email = ?",[r],(async(r,t)=>r?(console.error(r.message),s.status(500).send("Error logging in")):t&&await bcrypt.compare(n,t.password)?(e.session.user=t,t.isAdmin?s.redirect("/index.html"):s.redirect("/products.html")):s.status(401).send("Invalid email or password")))}));


app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.post("/logoff", ((req, res) => {
    req.session.destroy(err => {
        if(err) {
            return res.status(500).send("There was an error logging off. Please try again.");
        }
        res.clearCookie('connect.sid'); // replace 'connect.sid' with the name of your session ID if different
        res.redirect("/login.html");
    });
}));


app.get('/users', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving users');
      return;
    }
    rows.forEach(row => row.file_name = null);
    res.json(rows);
  });
});

app.post('/bind', (req, res) => {
  const { userId, fileName } = req.body;

  // Check if the user already has a bound file
  db.get('SELECT * FROM user_files WHERE user_id = ?', [userId], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error checking bound file');
      return;
    }

    if (row) {
      // Update the bound file for the user
      db.run('UPDATE user_files SET file_name = ? WHERE user_id = ?', [fileName, userId], function (err) {
        if (err) {
          console.error(err.message);
          res.status(500).send('Error updating bound file');
          return;
        }
        res.send();
      });
    } else {
      // Bind the file to the user if they don't have a bound file
      db.run('INSERT INTO user_files (user_id, file_name) VALUES (?, ?)', [userId, fileName], function (err) {
        if (err) {
          console.error(err.message);
          res.status(500).send('Error binding file');
          return;
        }
        res.send();
      });
    }
  });
});

app.post('/unbind', (req, res) => {
  const { userId } = req.body;
  db.run('DELETE FROM user_files WHERE user_id = ?', [userId], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error unbinding files');
      return;
    }
    res.send('Files unbound successfully');
  });
});

app.get("/",((e,s)=>{e.session.user?e.session.user.isAdmin?s.sendFile(path.join(__dirname,"public","index.html")):s.sendFile(path.join(__dirname,"public","products.html")):s.redirect("/login.html")}));

app.delete('/delete_user/:userId', (req, res) => {
  const { userId } = req.params;

  db.run('DELETE FROM users WHERE id = ?', [userId], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error deleting user');
      return;
    }
    res.send('User deleted successfully');
  });
});

app.get('/users_with_files', (req, res) => {
  const sql = `
    SELECT users.id, users.company_name, user_files.file_name
    FROM users
    LEFT JOIN user_files ON users.id = user_files.user_id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send('Error retrieving users with files');
      return;
    }
    res.json(rows);
  });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

