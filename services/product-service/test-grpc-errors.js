
require("dotenv").config();

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(
    __dirname,
    "../../shared/proto/product.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true
});

const productProto = grpc.loadPackageDefinition(
    packageDefinition
).product;

const client = new productProto.ProductService(
    "localhost:50053",
    grpc.credentials.createInsecure()
);

// Test 1: Sản phẩm không tồn tại
client.GetProduct({ pid: 999 }, (error, response) => {
    console.log("===== TEST PRODUCT NOT FOUND =====");
    console.log(error ? error.message : response);

    // Test 2: Số lượng tồn kho âm
    client.UpdateStock(
        { pid: 1, quantity: -5 },
        (error, response) => {
            console.log("===== TEST INVALID QUANTITY =====");
            console.log(error ? error.message : response);

            client.close();
        }
    );
});
