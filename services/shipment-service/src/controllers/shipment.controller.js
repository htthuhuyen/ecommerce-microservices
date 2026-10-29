
const { pool } = require("../config/db");

// Tao thong tin van chuyen
const createShipment = async (req, res) => {
    try {
        const { order_id, address } = req.body;

        if (
            !Number.isInteger(order_id) ||
            order_id <= 0 ||
            typeof address !== "string" ||
            !address.trim()
        ) {
            return res.status(400).json({
                message: "Invalid shipment information"
            });
        }

        const result = await pool.query(
            `INSERT INTO shipments (order_id, address, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [order_id, address.trim(), "PENDING"]
        );

        return res.status(201).json({
            message: "Shipment created successfully",
            shipment: result.rows[0]
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                message: "Shipment already exists for this order"
            });
        }

        console.error("Create shipment error:", error.message);

        return res.status(500).json({
            message: "Failed to create shipment"
        });
    }
};

// Lay danh sach van chuyen
const getShipments = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM shipments ORDER BY id DESC"
        );

        return res.status(200).json(result.rows);
    } catch (error) {
        console.error("Get shipments error:", error.message);

        return res.status(500).json({
            message: "Failed to get shipments"
        });
    }
};

// Lay chi tiet van chuyen
const getShipmentById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                message: "Invalid shipment ID"
            });
        }

        const result = await pool.query(
            "SELECT * FROM shipments WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Shipment not found"
            });
        }

        return res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Get shipment error:", error.message);

        return res.status(500).json({
            message: "Failed to get shipment"
        });
    }
};

// Cap nhat trang thai van chuyen
const updateShipmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!/^[1-9]\d*$/.test(id)) {
            return res.status(400).json({
                message: "Invalid shipment ID"
            });
        }

        const allowedStatuses = [
            "PENDING",
            "SHIPPING",
            "DELIVERED"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid shipment status"
            });
        }

        const result = await pool.query(
            `UPDATE shipments
       SET status = $1
       WHERE id = $2
       RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Shipment not found"
            });
        }

        return res.status(200).json({
            message: "Shipment status updated successfully",
            shipment: result.rows[0]
        });
    } catch (error) {
        console.error("Update shipment error:", error.message);

        return res.status(500).json({
            message: "Failed to update shipment status"
        });
    }
};

module.exports = {
    createShipment,
    getShipments,
    getShipmentById,
    updateShipmentStatus
};
