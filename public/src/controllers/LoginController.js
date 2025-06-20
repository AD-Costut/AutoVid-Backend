const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const axios = require("axios");
const User = require("../models/LoginModel");
const { hashPassword, verifyPassword } = require("../utils/Auth");
const secretKey = process.env.JWT_SECRET || "secret";
const { authenticateToken } = require("../utils/MiddlewareAuth");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and registration
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: secret123
 *               isAdmin:
 *                 type: boolean
 *                 example: false
 *               isGoogleUser:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: User successfully created
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Server error
 */
router.post("/register", async (req, res) => {
  const { email, password, isAdmin = false, isGoogleUser = false } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(409).json({ message: "Email already exists" });

    const hashedPassword = hashPassword(password);

    const user = new User({
      email,
      password: hashedPassword,
      isAdmin,
      isGoogleUser,
    });

    await user.save();
    res.json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login, returns JWT token
 *       401:
 *         description: Invalid password
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!verifyPassword(user.password, password))
      return res.status(401).json({ message: "Invalid password" });

    const payload = { id: user._id, email: user.email, isAdmin: user.isAdmin };
    const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });
    res.json({
      token,
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/is-admin:
 *   get:
 *     summary: Check if the current user is an admin
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Returns if the user is admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isAdmin:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: No token provided
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/is-admin", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ isAdmin: user.isAdmin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/google-login:
 *   post:
 *     summary: Login or register user with Google OAuth
 *     tags: [Auth]
 *     requestBody:
 *       description: User info from Google OAuth
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       200:
 *         description: Successful login, returns JWT token and user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token for authenticated session
 *                 user:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       500:
 *         description: Server error
 */
router.post("/google-login", async (req, res) => {
  const { email, name } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        name,
        isGoogleUser: true,
        password: null,
      });
      await user.save();
    }

    const payload = { id: user._id, email: user.email, isAdmin: user.isAdmin };
    const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });

    res.json({
      token,
      userId: user._id,
      user: {
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
