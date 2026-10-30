
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");
const { publishUserRegistered } = require("../kafka/producer");

// Register a new user
const register = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            !username.trim() ||
            typeof password !== "string" ||
            password.length < 6
        ) {
            return res.status(400).json({
                message: "Username is required and password must have at least 6 characters"
            });
        }

        const normalizedUsername = username.trim();

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [normalizedUsername]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (username, password_hash)
             VALUES ($1, $2)
             RETURNING id, username, created_at`,
            [normalizedUsername, passwordHash]
        );

        const user = result.rows[0];

        // Publish event after saving the user
        try {
            await publishUserRegistered(user);
        } catch (kafkaError) {
            console.error(
                "Failed to publish user-registered:",
                kafkaError.message
            );
        }

        return res.status(201).json({
            message: "User registered successfully",
            user
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        console.error("Register error:", error.message);

        return res.status(500).json({
            message: "Registration failed"
        });
    }
};

// Login
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (
            typeof username !== "string" ||
            !username.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        const result = await pool.query(
            "SELECT id, username, password_hash FROM users WHERE username = $1",
            [username.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d"
            }
        );

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                username: user.username
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "Login failed"
        });
    }
};

module.exports = {
    register,
    login
};
