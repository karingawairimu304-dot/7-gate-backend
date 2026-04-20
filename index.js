const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "7gates_secret_key";

// ================= DATABASE (TEMP MEMORY) =================
let admins = [];
let agents = [];
let customers = [];
let properties = [];
let payments = [];

// ================= SUPER ADMIN (FIRST SETUP) =================
app.post("/setup-superadmin", async (req, res) => {
  const { username, password } = req.body;

  if (admins.length > 0) {
    return res.json({ message: "Super admin already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const admin = {
    id: Date.now(),
    username,
    password: hashed,
    role: "superadmin"
  };

  admins.push(admin);

  res.json({ success: true, admin });
});

// ================= LOGIN (ALL USERS) =================
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user =
    admins.find(u => u.username === username) ||
    agents.find(u => u.username === username) ||
    customers.find(u => u.username === username);

  if (!user) return res.json({ success: false, message: "User not found" });

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) return res.json({ success: false, message: "Wrong password" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({ success: true, token, user });
});

// ================= AUTH MIDDLEWARE =================
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.json({ message: "No token" });

  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.json({ message: "Invalid token" });
  }
}

// ================= ROLE CHECK =================
function isAdmin(req, res, next) {
  if (req.user.role !== "superadmin" && req.user.role !== "admin") {
    return res.json({ message: "Access denied" });
  }
  next();
}

// ================= ADMIN CONTROL =================
app.post("/admins", auth, isAdmin, async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const admin = {
    id: Date.now(),
    username,
    password: hashed,
    role: "admin"
  };

  admins.push(admin);

  res.json(admin);
});

// ================= AGENTS =================
app.post("/agents", auth, isAdmin, async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  const agent = {
    id: Date.now(),
    username,
    password: hashed,
    role: "agent"
  };

  agents.push(agent);

  res.json(agent);
});

// ================= CUSTOMERS =================
app.post("/customers", (req, res) => {
  const customer = {
    id: Date.now(),
    ...req.body,
    role: "customer"
  };

  customers.push(customer);

  res.json(customer);
});

// ================= PROPERTIES (FULL CONTROL) =================
app.get("/properties", (req, res) => {
  res.json(properties);
});

app.post("/properties", auth, isAdmin, (req, res) => {
  const property = {
    id: Date.now(),
    ...req.body
  };

  properties.push(property);

  res.json(property);
});

app.put("/properties/:id", auth, isAdmin, (req, res) => {
  const id = Number(req.params.id);

  properties = properties.map(p =>
    p.id === id ? { ...p, ...req.body } : p
  );

  res.json({ success: true });
});

app.delete("/properties/:id", auth, isAdmin, (req, res) => {
  const id = Number(req.params.id);

  properties = properties.filter(p => p.id !== id);

  res.json({ success: true });
});

// ================= PAYMENTS (READY FOR MPESA/STRIPE) =================
app.post("/pay", auth, (req, res) => {
  const { method, amount, propertyId } = req.body;

  const payment = {
    id: Date.now(),
    userId: req.user.id,
    method,
    amount,
    propertyId,
    status: "pending"
  };

  payments.push(payment);

  res.json({
    success: true,
    message: "Payment initiated",
    payment
  });
});

// ================= START SERVER =================
app.listen(3000, () => {
  console.log("🔥 7Gates FULL REAL ESTATE SYSTEM RUNNING");
});
