
const { pool } = require("../config/db");
const productClient = require("../grpc/product.client");
const customerClient = require("../grpc/customer.client");
const { publishOrderCreated } = require("../kafka/producer");

// Goi gRPC va nhan ket qua
const callGrpc = (grpcClient, method, data) => {
    return new Promise((resolve, reject) => {
        grpcClient[method](data, (error, response) => {
            if (error) {
                return reject(error);
            }

            resolve(response);
        });
    });
};

// Tao don hang
const createOrder = async (req, res) => {
    const { user_id, product_id, quantity, address } = req.body;

    if (
        !Number.isInteger(user_id) ||
        user_id <= 0 ||
        !Number.isInteger(product_id) ||
        product_id <= 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0 ||
        typeof address !== "string" ||
        !address.trim()
    ) {
        return res.status(400).json({
            message: "Invalid order information"
        });
    }

    let client;
    let reserved = false;
    let transactionStarted = false;
    let orderCommitted = false;
    let order;

    try {
        // Lay thong tin khach hang bang gRPC
        const customer = await callGrpc(
            customerClient,
            "GetCustomer",
            { userId: user_id }
        );

        if (!customer.found) {
            return res.status(404).json({
                message: "Customer not found"
            });
        }

        // Lay thong tin san pham bang gRPC
        const product = await callGrpc(
            productClient,
            "GetProduct",
            { pid: product_id }
        );

        if (!Number.isFinite(product.price) || product.price < 0) {
            return res.status(400).json({
                message: "Invalid product price"
            });
        }

        // Tinh gia va giam gia thanh vien GOLD
        const originalAmount = product.price * quantity;

        const membershipName =
            (customer.membershipName || "").toUpperCase();

        const discountRate =
            membershipName === "GOLD" ? 0.10 : 0;

        const discountAmount =
            Math.round(originalAmount * discountRate);

        const totalAmount =
            originalAmount - discountAmount;

        // Tru ton kho
        await callGrpc(
            productClient,
            "ReserveStock",
            {
                pid: product_id,
                quantity
            }
        );

        reserved = true;

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

        order = orderResult.rows[0];

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
                originalAmount
            ]
        );

        await client.query("COMMIT");
        transactionStarted = false;
        orderCommitted = true;

        // Bo sung thong tin giam gia vao ket qua
        order.membership_name = membershipName;
        order.original_amount = originalAmount;
        order.discount_rate = discountRate;
        order.discount_amount = discountAmount;

    } catch (error) {
        if (client && transactionStarted) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error(
                    "Rollback error:",
                    rollbackError.message
                );
            }
        }

        if (reserved && !orderCommitted) {
            try {
                await callGrpc(
                    productClient,
                    "ReleaseStock",
                    {
                        pid: product_id,
                        quantity
                    }
                );
            } catch (releaseError) {
                console.error(
                    "Stock compensation failed:",
                    releaseError.message
                );

                return res.status(500).json({
                    message:
                        "Order failed and stock recovery needs attention"
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

    // Don hang da luu, gui su kien qua Kafka
    try {
        await publishOrderCreated({
            order_id: order.id,
            user_id,
            product_id,
            quantity,
            total_amount: order.total_amount,
            address: address.trim(),
            created_at: order.created_at
        });

        return res.status(201).json({
            message: "Order created and Kafka event published",
            order,
            shipment_status: "PENDING"
        });

    } catch (error) {
        console.error(
            "Publish order-created event failed:",
            error.message
        );

        // Khong hoan ton kho vi don hang da luu
        return res.status(201).json({
            message:
                "Order created but Kafka publishing needs attention",
            order,
            shipment_status: "NEEDS_ATTENTION"
        });
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
