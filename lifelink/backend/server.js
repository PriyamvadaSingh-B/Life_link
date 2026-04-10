const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Data file paths
const DATA_DIR = path.join(__dirname, '../data');
const DONORS_FILE = path.join(DATA_DIR, 'donors.json');
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const INVENTORY_FILE = path.join(DATA_DIR, 'inventory.json');
const DONATIONS_FILE = path.join(DATA_DIR, 'donations.json');

// Ensure data directory and files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const initFile = (file, defaultData) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
  }
};

initFile(DONORS_FILE, []);
initFile(REQUESTS_FILE, []);
initFile(USERS_FILE, []);
initFile(DONATIONS_FILE, []);
initFile(INVENTORY_FILE, {
  'A+': { units: 45, lastUpdated: new Date().toISOString() },
  'A-': { units: 12, lastUpdated: new Date().toISOString() },
  'B+': { units: 38, lastUpdated: new Date().toISOString() },
  'B-': { units: 8, lastUpdated: new Date().toISOString() },
  'AB+': { units: 20, lastUpdated: new Date().toISOString() },
  'AB-': { units: 5, lastUpdated: new Date().toISOString() },
  'O+': { units: 60, lastUpdated: new Date().toISOString() },
  'O-': { units: 15, lastUpdated: new Date().toISOString() }
});

// Helpers
const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf-8'));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'lifelink_secret_2024';

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ===== AUTH ROUTES =====
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, phone, bloodGroup, city, age, weight } = req.body;
    const users = readJSON(USERS_FILE);
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: uuidv4(),
      name, email, password: hashedPassword, role,
      phone, bloodGroup, city, age, weight,
      createdAt: new Date().toISOString(),
      isActive: true
    };
    users.push(user);
    writeJSON(USERS_FILE, users);

    // If donor, add to donors list
    if (role === 'donor') {
      const donors = readJSON(DONORS_FILE);
      donors.push({
        id: user.id,
        userId: user.id,
        name, email, phone, bloodGroup, city, age, weight,
        isAvailable: true,
        totalDonations: 0,
        lastDonation: null,
        createdAt: new Date().toISOString(),
        badges: [],
        rating: 0
      });
      writeJSON(DONORS_FILE, donors);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// ===== DONOR ROUTES =====
app.get('/api/donors', (req, res) => {
  const donors = readJSON(DONORS_FILE);
  const { bloodGroup, city, available } = req.query;
  let filtered = donors;
  if (bloodGroup) filtered = filtered.filter(d => d.bloodGroup === bloodGroup);
  if (city) filtered = filtered.filter(d => d.city.toLowerCase().includes(city.toLowerCase()));
  if (available === 'true') filtered = filtered.filter(d => d.isAvailable);
  res.json(filtered);
});

app.get('/api/donors/:id', (req, res) => {
  const donors = readJSON(DONORS_FILE);
  const donor = donors.find(d => d.id === req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });
  res.json(donor);
});

app.put('/api/donors/:id', authMiddleware, (req, res) => {
  const donors = readJSON(DONORS_FILE);
  const idx = donors.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Donor not found' });
  donors[idx] = { ...donors[idx], ...req.body, id: req.params.id };
  writeJSON(DONORS_FILE, donors);
  res.json(donors[idx]);
});

app.post('/api/donors/:id/donate', authMiddleware, (req, res) => {
  const donors = readJSON(DONORS_FILE);
  const inventory = readJSON(INVENTORY_FILE);
  const donations = readJSON(DONATIONS_FILE);
  const idx = donors.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Donor not found' });

  const donor = donors[idx];
  const { units = 1 } = req.body;

  // Update donor record
  donors[idx].totalDonations += 1;
  donors[idx].lastDonation = new Date().toISOString();
  donors[idx].isAvailable = false; // Unavailable for 3 months after donation

  // Add badges
  if (donors[idx].totalDonations >= 1) donors[idx].badges = [...new Set([...donors[idx].badges, 'First Drop'])];
  if (donors[idx].totalDonations >= 5) donors[idx].badges = [...new Set([...donors[idx].badges, 'Life Saver'])];
  if (donors[idx].totalDonations >= 10) donors[idx].badges = [...new Set([...donors[idx].badges, 'Blood Hero'])];

  // Update inventory
  if (inventory[donor.bloodGroup]) {
    inventory[donor.bloodGroup].units += units;
    inventory[donor.bloodGroup].lastUpdated = new Date().toISOString();
  }

  // Record donation
  donations.push({
    id: uuidv4(),
    donorId: donor.id,
    donorName: donor.name,
    bloodGroup: donor.bloodGroup,
    units,
    date: new Date().toISOString(),
    status: 'completed'
  });

  writeJSON(DONORS_FILE, donors);
  writeJSON(INVENTORY_FILE, inventory);
  writeJSON(DONATIONS_FILE, donations);
  res.json({ message: 'Donation recorded successfully', donor: donors[idx] });
});

// ===== BLOOD REQUESTS ROUTES =====
app.get('/api/requests', authMiddleware, (req, res) => {
  const requests = readJSON(REQUESTS_FILE);
  const { status, bloodGroup } = req.query;
  let filtered = requests;
  if (status) filtered = filtered.filter(r => r.status === status);
  if (bloodGroup) filtered = filtered.filter(r => r.bloodGroup === bloodGroup);
  res.json(filtered);
});

app.post('/api/requests', authMiddleware, (req, res) => {
  const requests = readJSON(REQUESTS_FILE);
  const request = {
    id: uuidv4(),
    ...req.body,
    requesterId: req.user.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
    responses: []
  };
  requests.push(request);
  writeJSON(REQUESTS_FILE, requests);
  res.json(request);
});

app.put('/api/requests/:id', authMiddleware, (req, res) => {
  const requests = readJSON(REQUESTS_FILE);
  const idx = requests.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });
  requests[idx] = { ...requests[idx], ...req.body, id: req.params.id };
  writeJSON(REQUESTS_FILE, requests);
  res.json(requests[idx]);
});

app.post('/api/requests/:id/respond', authMiddleware, (req, res) => {
  const requests = readJSON(REQUESTS_FILE);
  const idx = requests.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Request not found' });
  const response = {
    donorId: req.user.id,
    donorName: req.body.donorName,
    message: req.body.message,
    phone: req.body.phone,
    respondedAt: new Date().toISOString()
  };
  requests[idx].responses.push(response);
  requests[idx].status = 'responded';
  writeJSON(REQUESTS_FILE, requests);
  res.json(requests[idx]);
});

// ===== INVENTORY ROUTES =====
app.get('/api/inventory', (req, res) => {
  res.json(readJSON(INVENTORY_FILE));
});

app.put('/api/inventory/:bloodGroup', authMiddleware, (req, res) => {
  const inventory = readJSON(INVENTORY_FILE);
  const bg = req.params.bloodGroup;
  if (!inventory[bg]) return res.status(404).json({ error: 'Blood group not found' });
  inventory[bg] = { ...inventory[bg], ...req.body, lastUpdated: new Date().toISOString() };
  writeJSON(INVENTORY_FILE, inventory);
  res.json(inventory[bg]);
});

// ===== DONATIONS HISTORY =====
app.get('/api/donations', authMiddleware, (req, res) => {
  const donations = readJSON(DONATIONS_FILE);
  res.json(donations);
});

// ===== STATS =====
app.get('/api/stats', (req, res) => {
  const donors = readJSON(DONORS_FILE);
  const requests = readJSON(REQUESTS_FILE);
  const donations = readJSON(DONATIONS_FILE);
  const inventory = readJSON(INVENTORY_FILE);
  const totalUnits = Object.values(inventory).reduce((sum, bg) => sum + bg.units, 0);
  res.json({
    totalDonors: donors.length,
    activeDonors: donors.filter(d => d.isAvailable).length,
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    fulfilledRequests: requests.filter(r => r.status === 'fulfilled').length,
    totalDonations: donations.length,
    totalUnits,
    inventory
  });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🩸 LifeLink Blood Bank Server running on http://localhost:${PORT}\n`);
});
