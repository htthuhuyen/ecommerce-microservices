
const { pool } = require("../config/db");

// Lấy danh sách khách hàng
const getCustomers = async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT c.*, m.name AS membership_name
      FROM customers c
      LEFT JOIN memberships m ON c.membership_id = m.id
      ORDER BY c.id
    `);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

// Lấy khách hàng theo user_id
const getCustomerByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT c.*, m.name AS membership_name
       FROM customers c
       LEFT JOIN memberships m ON c.membership_id = m.id
       WHERE c.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const createCustomer = async (req, res) => {
    try {
        const { user_id, fullname, email, phone } = req.body;

        if (!Number.isInteger(user_id) || user_id <= 0 ||
            typeof fullname !== "string" || !fullname.trim()) {
            return res.status(400).json({
                message: "Valid user_id and fullname are required"
            });
        }

        const result = await pool.query(
            `INSERT INTO customers
       (user_id, fullname, email, phone, points, membership_id)
       VALUES (
         $1, $2, $3, $4, 0,
         (SELECT id FROM memberships WHERE name = 'NORMAL')
       )
       RETURNING *`,
            [user_id, fullname.trim(), email || null, phone || null]
        );

        res.status(201).json({
            message: "Customer created successfully",
            customer: result.rows[0]
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Customer already exists"
            });
        }

        console.error(error.message);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};


const updateCustomer = async (req, res) => {
    try {
        const { userId } = req.params;
        const { fullname, email, phone } = req.body;

        if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        if (typeof fullname !== "string" || !fullname.trim()) {
            return res.status(400).json({
                message: "Fullname is required"
            });
        }

        const result = await pool.query(
            `UPDATE customers
       SET fullname = $1,
           email = $2,
           phone = $3
       WHERE user_id = $4
       RETURNING *`,
            [fullname.trim(), email || null, phone || null, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        res.status(200).json({
            message: "Customer updated successfully",
            customer: result.rows[0]
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};

const addPoints = async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        const { points } = req.body;

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        if (!Number.isSafeInteger(points) || points <= 0) {
            return res.status(400).json({
                message: "Points must be a positive integer"
            });
        }

        const result = await pool.query(
            `UPDATE customers
       SET points = points + $1,
           membership_id = (
             SELECT m.id
             FROM memberships m
             WHERE m.min_points <= customers.points + $1
             ORDER BY m.min_points DESC
             LIMIT 1
           )
       WHERE user_id = $2
         AND points <= 2147483647 - $1
       RETURNING *`,
            [points, userId]
        );

        if (result.rows.length === 0) {
            const existing = await pool.query(
                "SELECT id FROM customers WHERE user_id = $1",
                [userId]
            );

            return res.status(existing.rows.length ? 400 : 404).json({
                message: existing.rows.length
                    ? "Points exceed allowed limit"
                    : "Customer not found"
            });
        }

        const membership = await pool.query(
            "SELECT name FROM memberships WHERE id = $1",
            [result.rows[0].membership_id]
        );

        res.status(200).json({
            message: "Points added successfully",
            customer: result.rows[0],
            membership_name: membership.rows[0].name
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({
            message: "Internal server error"
        });
    }
};


module.exports = {
    getCustomers,
    getCustomerByUserId,
    createCustomer,
    updateCustomer,
    addPoints
};
