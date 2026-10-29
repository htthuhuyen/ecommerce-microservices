
const express = require("express");
const router = express.Router();

const {
    createShipment,
    getShipments,
    getShipmentById,
    updateShipmentStatus
} = require("../controllers/shipment.controller");

// Tao thong tin van chuyen
router.post("/", createShipment);

// Lay danh sach van chuyen
router.get("/", getShipments);

// Lay chi tiet van chuyen
router.get("/:id", getShipmentById);

// Cap nhat trang thai van chuyen
router.patch("/:id/status", updateShipmentStatus);

module.exports = router;
