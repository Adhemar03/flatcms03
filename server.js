import express from 'express';
import cors from 'cors';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

const dataFile = path.join(__dirname, 'data.json');
const usersFile = path.join(__dirname, 'users.json');

const initFiles = () => {
  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(usersFile)) {
    const admin = {
      id: 1,
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin'
    };
    fs.writeFileSync(usersFile, JSON.stringify([admin], null, 2));
  }
};

initFiles();

const readData = () => {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
  } catch {
    return [];
  }
};

const saveData = (data) => {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

const readUsers = () => {
  try {
    return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  } catch {
    return [];
  }
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, 'secret_key');
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, 'secret_key', { expiresIn: '24h' });
  res.json({ token, role: user.role });
});

app.get('/api/content', (req, res) => {
  const data = readData();
  res.json(data);
});

app.get('/api/content/:id', (req, res) => {
  const data = readData();
  const content = data.find(item => item.id === parseInt(req.params.id));
  if (!content) return res.status(404).json({ error: 'Not found' });
  res.json(content);
});

app.post('/api/content', verifyToken, upload.single('file'), (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create content' });
  }

  const { title, description } = req.body;
  const data = readData();

  const newContent = {
    id: data.length > 0 ? Math.max(...data.map(d => d.id)) + 1 : 1,
    title,
    description,
    file: req.file ? `/uploads/${req.file.filename}` : null,
    fileName: req.file?.originalname,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.push(newContent);
  saveData(data);

  res.status(201).json(newContent);
});

app.post('/api/content/import', verifyToken, upload.single('jsonFile'), (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can import content' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const raw = fs.readFileSync(req.file.path, 'utf-8');
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error('JSON must be an array');
    const data = readData();
    let maxId = data.length > 0 ? Math.max(...data.map(d => d.id)) : 0;
    items.forEach(item => {
      maxId += 1;
      data.push({
        id: maxId,
        title: item.title || '',
        description: item.description || '',
        file: item.file || null,
        fileName: item.fileName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    saveData(data);
    fs.unlinkSync(req.file.path);
    res.json({ inserted: items.length });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Import error:', err);
    res.status(400).json({ error: 'Invalid JSON', details: err.message });
  }
});

app.put('/api/content/:id', verifyToken, upload.single('file'), (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can update content' });
  }

  const data = readData();
  const index = data.findIndex(item => item.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  const { title, description } = req.body;
  data[index].title = title || data[index].title;
  data[index].description = description || data[index].description;
  if (req.file) {
    data[index].file = `/uploads/${req.file.filename}`;
    data[index].fileName = req.file.originalname;
  }
  data[index].updatedAt = new Date().toISOString();

  saveData(data);
  res.json(data[index]);
});

app.delete('/api/content/:id', verifyToken, (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can delete content' });
  }

  const data = readData();
  const index = data.findIndex(item => item.id === parseInt(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Not found' });

  if (data[index].file) {
    const filePath = path.join(__dirname, data[index].file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  data.splice(index, 1);
  saveData(data);

  res.json({ message: 'Deleted successfully' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
