
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const { verifyToken } = require("./middleware/auth.middleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Cho phep frontend goi API Gateway
app.use(cors());

// Health check
app.get("/health", (req, res) => {
    return res.status(200).json({
        service: "api-gateway",
        status: "OK"
    });
});

// Cau hinh cac microservice
const services = [
    {
        path: "/api/auth",
        target: process.env.AUTH_SERVICE_URL,
        requireAuth: false
    },
    {
        path: "/api/customers",
        target: process.env.CUSTOMER_SERVICE_URL,
        requireAuth: true
    },
    {
        path: "/api/products",
        target: process.env.PRODUCT_SERVICE_URL,
        requireAuth: true
    },
    {
        path: "/api/orders",
        target: process.env.ORDER_SERVICE_URL,
        requireAuth: true
    },
    {
        path: "/api/shipments",
        target: process.env.SHIPMENT_SERVICE_URL,
        requireAuth: true
    }
];

// Tao proxy cho tung microservice
services.forEach(({ path, target, requireAuth }) => {
    const middleware = [];

    // Kiem tra JWT voi cac API duoc bao ve
    if (requireAuth) {
        middleware.push(verifyToken);
    }

    middleware.push(
        createProxyMiddleware({
            target,
            changeOrigin: true,

            // Khoi phuc duong dan day du
            pathRewrite: (requestPath) => path + requestPath,

            on: {
                error: (error, req, res) => {
                    console.error(
                        `Gateway proxy error (${path}):`,
                        error.message
                    );

                    if (!res.headersSent) {
                        res.writeHead(502, {
                            "Content-Type": "application/json"
                        });
                    }

                    res.end(
                        JSON.stringify({
                            message: "Service temporarily unavailable"
                        })
                    );
                }
            }
        })
    );

    app.use(path, ...middleware);
});

// Xu ly duong dan khong ton tai
app.use((req, res) => {
    return res.status(404).json({
        message: "Gateway route not found"
    });
});

// Khoi dong API Gateway
app.listen(PORT, () => {
    console.log(`API Gateway running on port ${PORT}`);
});
