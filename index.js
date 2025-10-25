const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = 3000;

// Use express.json() middleware to parse JSON request bodies
app.use(express.json());

// --- Configuration ---
// IMPORTANT: In a real app, use a strong, secret key from environment variables
const JWT_SECRET = 'yourSuperSecretKeyForThisExercise';

// --- Mock Database ---
// We'll use simple in-memory objects to simulate our database
const users = {
  "user1": { password: "password123" }
  // Add more users here if you want
};

let accounts = {
  "user1": { balance: 1000 }
  // Add corresponding accounts here
};


// -----------------------------------------------------------------
// Middleware: Verify JWT
// -----------------------------------------------------------------
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // 1. Check if Authorization header exists
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  // 2. Check if format is "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: "Authorization header format must be 'Bearer <token>'" });
  }

  // 3. Verify the token
  const token = parts[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // This matches the "Invalid or expired token" output
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    
    // Token is valid! Attach the user payload to the request object
    // The payload we created in /login was { username: ... }
    req.user = user; 
    next(); // Proceed to the protected route
  });
};

// -----------------------------------------------------------------
// Public Route: Login
// -----------------------------------------------------------------
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // 1. Validate input
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  // 2. Check if user exists and password is correct
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  // 3. User is valid. Create a JWT.
  const payload = { username: username };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

  // 4. Send the token to the client
  // This matches the "token: ..." output
  res.status(200).json({ token: token });
});

// -----------------------------------------------------------------
// Protected Routes (All routes below this require a valid token)
// -----------------------------------------------------------------

// --- Get Account Balance ---
app.get('/balance', verifyToken, (req, res) => {
  // The 'verifyToken' middleware already ran and put the user info in req.user
  const username = req.user.username;
  const balance = accounts[username].balance;
  
  // This matches the "{ balance: 1000 }" output
  res.status(200).json({ balance: balance });
});

// --- Deposit Money ---
app.post('/deposit', verifyToken, (req, res) => {
  const { amount } = req.body;
  const username = req.user.username;

  // Validate amount
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: "Invalid deposit amount" });
  }

  // Update balance
  accounts[username].balance += amount;

  // This matches the "Deposited $250" output
  res.status(200).json({
    message: `Deposited $${amount}`,
    newBalance: accounts[username].balance
  });
});

// --- Withdraw Money ---
app.post('/withdraw', verifyToken, (req, res) => {
  const { amount } = req.body;
  const username = req.user.username;

  // Validate amount
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: "Invalid withdrawal amount" });
  }

  const currentBalance = accounts[username].balance;

  // Check for insufficient balance
  if (amount > currentBalance) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  // Update balance
  accounts[username].balance -= amount;

  res.status(200).json({
    message: `Withdrew $${amount}`,
    newBalance: accounts[username].balance
  });
});

// -----------------------------------------------------------------
// Start the Server
// -----------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
