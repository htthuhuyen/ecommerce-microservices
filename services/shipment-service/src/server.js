
require("dotenv").config();

const express = require("express");
const { pool, connectDB } = require("./config/db");
const shipmentRoutes = require("./routes/shipment.routes");
const { startGrpcServer } = require("./grpc/shipment.grpc");
const { startKafkaConsumer } = require("./kafka/consumer");

const app = express();

const PORT = process.env.PORT || 3005;

app.use(express.json());

// Health check
app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        return res.status(200).json({
            service: "shipment-service",
            status: "OK",
            database: "connected"
        });
    } catch (error) {
        return res.status(503).json({
            service: "shipment-service",
            status: "ERROR",
            database: "disconnected"
        });
    }
});

// Shipment REST APIs
app.use("/api/shipments", shipmentRoutes);

// Start HTTP, gRPC and Kafka Consumer
const startServer = async () => {
    try {
        await connectDB();

        await startKafkaConsumer();

        app.listen(PORT, () => {
            console.log(
                `Shipment Service HTTP Server running on port ${PORT}`
            );
        });

        startGrpcServer();
    } catch (error) {
        console.error(
            "Failed to start Shipment Service:",
            error.message
        );

        process.exit(1);
    }
};

startServer();
