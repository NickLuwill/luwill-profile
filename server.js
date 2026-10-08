const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'luwill2024';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database setup
const db = new Database(path.join(dataDir, 'employees.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_cn TEXT DEFAULT '',
    title TEXT DEFAULT '',
    title_cn TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    wechat TEXT DEFAULT '',
    linkedin TEXT DEFAULT '',
    instagram TEXT DEFAULT '',
    website TEXT DEFAULT '',
    avatar_path TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Multer config for avatar upload
const storage = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const slug = req.body.slug || 'avatar';
    cb(null, `${slug}-${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ===== Auth Middleware =====
function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth === `Bearer ${ADMIN_PASSWORD}`) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ===== API Routes =====

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Get all employees
app.get('/api/employees', (req, res) => {
  const employees = db.prepare('SELECT * FROM employees WHERE active = 1 ORDER BY sort_order ASC, id ASC').all();
  res.json(employees);
});

// Get single employee by slug
app.get('/api/employees/:slug', (req, res) => {
  const emp = db.prepare('SELECT * FROM employees WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

// Create employee
app.post('/api/employees', requireAuth, (req, res) => {
  const { slug, name, name_cn, title, title_cn, email, phone, wechat, linkedin, instagram, website, sort_order } = req.body;
  if (!slug || !name) return res.status(400).json({ error: 'slug and name are required' });

  const stmt = db.prepare(`
    INSERT INTO employees (slug, name, name_cn, title, title_cn, email, phone, wechat, linkedin, instagram, website, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(slug, name, name_cn || '', title || '', title_cn || '', email || '', phone || '', wechat || '', linkedin || '', instagram || '', website || '', sort_order || 0);
  res.json({ id: result.lastInsertRowid, slug });
});

// Update employee
app.put('/api/employees/:id', requireAuth, (req, res) => {
  const { name, name_cn, title, title_cn, email, phone, wechat, linkedin, instagram, website, avatar_path, sort_order, active } = req.body;
  const stmt = db.prepare(`
    UPDATE employees SET name=?, name_cn=?, title=?, title_cn=?, email=?, phone=?, wechat=?, linkedin=?, instagram=?, website=?, avatar_path=?, sort_order=?, active=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `);
  stmt.run(name, name_cn || '', title || '', title_cn || '', email || '', phone || '', wechat || '', linkedin || '', instagram || '', website || '', avatar_path || '', sort_order || 0, active !== undefined ? active : 1, req.params.id);
  res.json({ success: true });
});

// Delete employee
app.delete('/api/employees/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE employees SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Upload avatar
app.post('/api/upload', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ path: `/uploads/${req.file.filename}` });
});

// Generate QR code
app.get('/api/qrcode/:slug', async (req, res) => {
  const baseUrl = req.protocol + '://' + req.get('host');
  const url = `${baseUrl}/profile/${req.params.slug}`;
  try {
    const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 1 });
    res.json({ qr: qrDataUrl, url });
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// ===== Profile Page Route =====
app.get('/profile/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Home redirect
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LUWILL server running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
