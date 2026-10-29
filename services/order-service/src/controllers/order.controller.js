
const { pool } = require("../config/db");
const productClient = require("../grpc/product.client");

// Goi Product Service qua gRPC
const callProductGrpc = (method, data) => {
    return new Promise((resolve, reject) => {
        productClient[method](data, (error, response) => {
            if (error) {
                return reject(error);
            }
            resolve(response);
        });
    });
};

// Tao don hang
const createOrder = async (req, res) => {
    const { user_id, product_id, quantity } = req.body;

    if (
        !Number.isInteger(user_id) ||
        user_id <= 0 ||
        !Number.isInteger(product_id) ||
        product_id <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {
        return res.status(400).json({
            message: "Invalid order information"
        });
    }

    let client;
    let reserved = false;
    let transactionStarted = false;

    try {
        // Lay thong tin san pham
        const product = await callProductGrpc("GetProduct", {
            pid: product_id
        });

        if (!Number.isFinite(product.price) || product.price < 0) {
            return res.status(400).json({
                message: "Invalid product price"
            });
        }

        // Tru ton kho
        await callProductGrpc("ReserveStock", {
            pid: product_id,
            quantity
        });

        reserved = true;

        const totalAmount = product.price * quantity;

        client = await pool.connect();

        await client.query("BEGIN");
        transactionStarted = true;

        // Luu don hang
        const orderResult = await client.query(
            `INSERT INTO orders (user_id, total_amount, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [user_id, totalAmount, "PENDING"]
        );

        const order = orderResult.rows[0];

        // Luu chi tiet don hang
        await client.query(
            `INSERT INTO order_details
       (order_id, product_id, quantity, unit_price, subtotal)
       VALUES ($1, $2, $3, $4, $5)`,
            [
                order.id,
                product_id,
                quantity,
                product.price,
                totalAmount
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            message: "Order created successfully",
            order
        });
    } catch (error) {
        if (client && transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback error:", rollbackError.message);
            }
        }

        if (reserved) {
            try {
                await callProductGrpc("ReleaseStock", {
                    pid: product_id,
                    quantity
                });
            } catch (releaseError) {
                console.error(
                    "Stock compensation failed:",
                    releaseError.message
                );

                return res.status(500).json({
                    message: "Order failed and stock recovery needs attention"
                });
            }
        }

        console.error("Create order error:", error.message);

        if (error.code === 5) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        if (error.code === 9) {
            return res.status(400).json({
                message: "Insufficient stock"
            });
        }

        return res.status(500).json({
            message: "Failed to create order"
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Lay danh sach don hang
const getOrders = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM orders ORDER BY id DESC"
        );

        res.json(result.rows);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get orders",
            error: error.message
        });
    }
};

// Lay chi tiet don hang
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        const orderResult = await pool.query(
            "SELECT * FROM orders WHERE id = $1",
            [id]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const detailsResult = await pool.query(
            "SELECT * FROM order_details WHERE order_id = $1",
            [id]
        );

        res.json({
            ...orderResult.rows[0],
            details: detailsResult.rows
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to get order",
            error: error.message
        });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById
};
