
require("dotenv").config();

const express = require("express");
const { connectDB, pool } = require("./config/db");
const { startGrpcServer } = require("./grpc/customer.grpc");
const { startKafkaConsumer } = require("./kafka/consumer");
const customerRoutes = require("./routes/customer.routes");

const app = express();

app.use(express.json());

app.get("/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.status(200).json({
            service: "customer-service",
            status: "UP",
            database: "connected"
        });
    } catch (error) {
        res.status(503).json({
            service: "customer-service",
            status: "DOWN",
            database: "disconnected"
        });
    }
});

app.use("/api/customers", customerRoutes);

const PORT = process.env.PORT || 3002;

const startServer = async () => {
    try {
        await connectDB();

        await startKafkaConsumer();

        app.listen(PORT, () => {
            console.log(
                `Customer Service running on port ${PORT}`
            );

            startGrpcServer();
        });
    } catch (error) {
        console.error(
            "Failed to start Customer Service:",
            error.message
        );

        process.exit(1);
    }
};

startServer();
