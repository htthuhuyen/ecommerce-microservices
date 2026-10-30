
require("dotenv").config();

const express = require("express");
const { pool, connectDB } = require("./config/db");
const authRoutes = require("./routes/auth.routes");
const { startGrpcServer } = require("./grpc/auth.grpc");
const { connectKafka } = require("./kafka/producer");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            service: "auth-service",
            status: "UP",
            database: "connected"
        });
    } catch (error) {
        res.status(503).json({
            service: "auth-service",
            status: "DOWN",
            database: "disconnected"
        });
    }
});

// Auth routes
app.use("/api/auth", authRoutes);

// Start HTTP, gRPC and Kafka
const startServer = async () => {
    try {
        await connectDB();

        // Connect Kafka Producer
        await connectKafka();

        app.listen(PORT, () => {
            console.log(`Auth Service running on port ${PORT}`);
        });

        startGrpcServer();
    } catch (error) {
        console.error(
            "Failed to start Auth Service:",
            error.message
        );
        process.exit(1);
    }
};

startServer();
