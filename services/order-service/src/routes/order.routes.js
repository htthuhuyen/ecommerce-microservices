
const express = require("express");
const router = express.Router();

const {
    createOrder,
    getOrders,
    getOrderById
} = require("../controllers/order.controller");

// Tao don hang
router.post("/", createOrder);

// Lay danh sach don hang
router.get("/", getOrders);

// Lay chi tiet don hang
router.get("/:id", getOrderById);

module.exports = router;
