
const Product = require("../models/Product");

// Lấy danh sách sản phẩm
const getProducts = async (req, res) => {
    try {
        const products = await Product.find();

        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({
            message: "Failed to get products",
            error: error.message
        });
    }
};

// Thêm sản phẩm mới
const createProduct = async (req, res) => {
    try {
        const { pid, pname, price, quantity } = req.body;

        if (
            !Number.isInteger(pid) ||
            typeof pname !== "string" ||
            !pname.trim() ||
            typeof price !== "number" ||
            !Number.isFinite(price) ||
            price < 0 ||
            !Number.isInteger(quantity) ||
            quantity < 0
        ) {
            return res.status(400).json({
                message: "Invalid product information"
            });
        }

        const existingProduct = await Product.findOne({ pid });

        if (existingProduct) {
            return res.status(409).json({
                message: "Product ID already exists"
            });
        }

        const product = await Product.create({
            pid,
            pname: pname.trim(),
            price,
            quantity
        });

        res.status(201).json({
            message: "Product created successfully",
            product
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Product ID already exists"
            });
        }

        res.status(500).json({
            message: "Failed to create product",
            error: error.message
        });
    }
};


const updateProduct = async (req, res) => {
    try {
        const pid = Number(req.params.pid);
        const { pname, price, quantity } = req.body;

        if (
            !Number.isInteger(pid) ||
            !Number.isInteger(quantity) ||
            quantity < 0 ||
            typeof pname !== "string" ||
            !pname.trim() ||
            typeof price !== "number" ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            return res.status(400).json({
                message: "Invalid product information"
            });
        }

        const product = await Product.findOneAndUpdate(
            { pid },
            { $set: { pname: pname.trim(), price, quantity } },
            { new: true, runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json({
            message: "Product updated successfully",
            product
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to update product",
            error: error.message
        });
    }
};


const deleteProduct = async (req, res) => {
    try {
        const pid = Number(req.params.pid);

        if (!Number.isInteger(pid)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product = await Product.findOneAndDelete({ pid });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json({
            message: "Product deleted successfully",
            product
        });
    } catch (error) {
        res.status(500).json({
            message: "Failed to delete product",
            error: error.message
        });
    }
};

module.exports = {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct
};
