
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const Product = require("../models/Product");

const PROTO_PATH = path.join(
    __dirname,
    "../../../../shared/proto/product.proto"
);

const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    }
);

const productProto = grpc.loadPackageDefinition(
    packageDefinition
).product;

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
            { pid: pid },
            { $set: { quantity: quantity } },
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


const startGrpcServer = () => {
    const server = new grpc.Server();

    server.addService(
        productProto.ProductService.service,
        {
            GetProduct: getProduct,
            ListProducts: listProducts,
            UpdateStock: updateStock
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
