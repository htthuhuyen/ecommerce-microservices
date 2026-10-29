
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const connectDB = require("./config/db");
const startGrpcServer = require("./grpc/product.grpc");
const productRoutes = require("./routes/product.routes");

const app = express();

app.use(express.json());

// Product API
app.use("/api/products", productRoutes);

// Health check
app.get("/health", (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;

    res.status(isConnected ? 200 : 503).json({
        service: "product-service",
        status: isConnected ? "UP" : "DOWN",
        database: isConnected ? "connected" : "disconnected"
    });
});

const PORT = process.env.PORT || 3003;

const startServer = async () => {
    await connectDB();

    startGrpcServer();

    app.listen(PORT, () => {
        console.log(`Product HTTP Server running on port ${PORT}`);
    });
};

startServer().catch((error) => {
    console.error("Product Service startup error:", error);
    process.exit(1);
});
