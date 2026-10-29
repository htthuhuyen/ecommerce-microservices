
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const Product = require("../models/Product");

const PROTO_PATH = path.join(
    __dirname,
    "../../../../shared/proto/product.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const productProto =
    grpc.loadPackageDefinition(packageDefinition).product;

// Lay thong tin san pham
const getProduct = async (call, callback) => {
    try {
        const product = await Product.findOne({
            pid: call.request.pid
        });

        if (!product) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Product not found"
            });
        }

        callback(null, {
            pid: product.pid,
            pname: product.pname,
            price: product.price,
            quantity: product.quantity
        });
    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
        });
    }
};

// Lay danh sach san pham
const listProducts = async (call, callback) => {
    try {
        const products = await Product.find();

        callback(null, {
            products: products.map((product) => ({
                pid: product.pid,
                pname: product.pname,
                price: product.price,
                quantity: product.quantity
            }))
        });
    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
        });
    }
};

// Gan so luong ton kho moi
const updateStock = async (call, callback) => {
    try {
        const { pid, quantity } = call.request;

        if (!Number.isInteger(quantity) || quantity < 0) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Quantity must be a non-negative integer"
            });
        }

        const product = await Product.findOneAndUpdate(
            { pid },
            { $set: { quantity } },
            { new: true, runValidators: true }
        );

        if (!product) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Product not found"
            });
        }

        callback(null, {
            pid: product.pid,
            pname: product.pname,
            price: product.price,
            quantity: product.quantity
        });
    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
        });
    }
};

// Tru ton kho khi dat hang
const reserveStock = async (call, callback) => {
    try {
        const { pid, quantity } = call.request;

        if (
            !Number.isInteger(pid) ||
            pid <= 0 ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Invalid product ID or quantity"
            });
        }

        const product = await Product.findOneAndUpdate(
            {
                pid,
                quantity: { $gte: quantity }
            },
            {
                $inc: { quantity: -quantity }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            const existingProduct = await Product.findOne({ pid });

            return callback({
                code: existingProduct
                    ? grpc.status.FAILED_PRECONDITION
                    : grpc.status.NOT_FOUND,
                message: existingProduct
                    ? "Insufficient stock"
                    : "Product not found"
            });
        }

        callback(null, {
            pid: product.pid,
            pname: product.pname,
            price: product.price,
            quantity: product.quantity
        });
    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
        });
    }
};

// Hoan tra ton kho neu dat hang that bai
const releaseStock = async (call, callback) => {
    try {
        const { pid, quantity } = call.request;

        if (
            !Number.isInteger(pid) ||
            pid <= 0 ||
            !Number.isInteger(quantity) ||
            quantity <= 0
        ) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Invalid product ID or quantity"
            });
        }

        const product = await Product.findOneAndUpdate(
            { pid },
            { $inc: { quantity } },
            { new: true, runValidators: true }
        );

        if (!product) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Product not found"
            });
        }

        callback(null, {
            pid: product.pid,
            pname: product.pname,
            price: product.price,
            quantity: product.quantity
        });
    } catch (error) {
        callback({
            code: grpc.status.INTERNAL,
            message: error.message
        });
    }
};

// Khoi dong gRPC Server
const startGrpcServer = () => {
    const server = new grpc.Server();

    server.addService(
        productProto.ProductService.service,
        {
            GetProduct: getProduct,
            ListProducts: listProducts,
            UpdateStock: updateStock,
            ReserveStock: reserveStock,
            ReleaseStock: releaseStock
        }
    );

    const port = process.env.GRPC_PORT || 50053;

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, boundPort) => {
            if (error) {
                console.error("gRPC Server error:", error);
                return;
            }

            console.log(
                `Product gRPC Server running on port ${boundPort}`
            );
        }
    );
};

module.exports = startGrpcServer;
