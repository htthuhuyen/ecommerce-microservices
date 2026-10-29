
const express = require("express");

const router = express.Router();

const {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/product.controller");

router.get("/", getProducts);
router.post("/", createProduct);
router.put("/:pid", updateProduct);
router.delete("/:pid", deleteProduct);

module.exports = router;
