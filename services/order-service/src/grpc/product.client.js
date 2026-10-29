
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

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

const productClient = new productProto.ProductService(
    process.env.PRODUCT_GRPC_URL || "localhost:50053",
    grpc.credentials.createInsecure()
);

module.exports = productClient;
