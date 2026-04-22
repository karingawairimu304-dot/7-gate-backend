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
 let properties = [
  {
    id: 1,
    title: "Modern Apartment in Westlands",
    description: "Spacious 4-bedroom apartment with gym, parking, and security.",
    location: "Westlands, Nairobi",
    price: 85000,
    bedrooms: 4,
    bathrooms: 4,
    amenities: ["WiFi", "Parking", "Gym"],
    image: "apt1.jpg"
  },
  {
    id: 2,
    title: "Cozy Studio in Kilimani",
    description: "Stylish studio perfect for solo living, close to malls and cafes.",
    location: "Kilimani, Nairobi",
    price: 45000,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["WiFi", "Security"],
    image: "apt2.jpg"
  },
  {
    id: 3,
    title: "Luxury Penthouse",
    description: "High-end penthouse with city views and rooftop pool.",
    location: "Upper Hill, Nairobi",
    price: 250000,
    bedrooms: 3,
    bathrooms: 3,
    amenities: ["Pool", "Gym", "Elevator"],
    image: "apt3.jpg"
  },
  {
    id: 4,
    title: "Family Home in Karen",
    description: "Large 5-bedroom house with garden and private parking.",
    location: "Karen, Nairobi",
    price: 180000,
    bedrooms: 5,
    bathrooms: 3,
    amenities: ["Garden", "Parking", "Security"],
    image: "house1.jpg"
  },
  {
    id: 5,
    title: "Budget Apartment",
    description: "Affordable clean apartment near transport routes.",
    location: "Rongai, Nairobi",
    price: 25000,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Security"],
    image: "apt4.jpg"
  },
  {
    id: 6,
    title: "City View Loft",
    description: "Modern loft with glass windows and open kitchen design.",
    location: "CBD, Nairobi",
    price: 90000,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["WiFi", "Security", "Elevator"],
    image: "loft1.jpg"
  },
  {
    id: 7,
    title: "Serviced Apartment",
    description: "Fully furnished serviced unit with housekeeping included.",
    location: "Lavington, Nairobi",
    price: 120000,
    bedrooms: 2,
    bathrooms: 2,
    amenities: ["WiFi", "Cleaning", "Parking"],
    image: "apt5.jpg"
  },
  {
    id: 8,
    title: "Luxury Villa",
    price: "KSh 120,000",
    location: "Karen",
    image: "https://via.placeholder.com/300"
  }
];

app.get("/properties", (req, res) => {
  res.json(properties);
});
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
