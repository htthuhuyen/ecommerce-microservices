
const express = require("express");

const {
    getCustomers,
    getCustomerByUserId,
    createCustomer,
    updateCustomer,
    addPoints
} = require("../controllers/customer.controller");


const router = express.Router();

router.get("/", getCustomers);
router.get("/:userId", getCustomerByUserId);
router.post("/", createCustomer);
router.put("/:userId", updateCustomer);
router.patch("/:userId/points", addPoints);

module.exports = router;
