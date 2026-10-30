
require("dotenv").config();

const express = require("express");
const { connectDB, pool } = require("./config/db");
const { connectKafka } = require("./kafka/producer");
const orderRoutes = require("./routes/order.routes");

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

// Health check
app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            service: "order-service",
            status: "OK",
            database: "connected"
        });
    } catch (error) {
        res.status(500).json({
            service: "order-service",
            status: "ERROR",
            database: "disconnected"
        });
    }
});

// Order API
app.use("/api/orders", orderRoutes);

// Start server
const startServer = async () => {
    try {
        await connectDB();

        await connectKafka();

        app.listen(PORT, () => {
            console.log(
                `Order Service running on port ${PORT}`
            );
        });
    } catch (error) {
        console.error(
            "Failed to start Order Service:",
            error.message
        );

        process.exit(1);
    }
};

startServer();
