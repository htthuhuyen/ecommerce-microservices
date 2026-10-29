
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
    defaults: true,
    oneofs: true
});

const productProto = grpc.loadPackageDefinition(
    packageDefinition
).product;

const client = new productProto.ProductService(
    "localhost:50053",
    grpc.credentials.createInsecure()
);

// Test 1: Lấy sản phẩm có pid = 1
client.GetProduct({ pid: 1 }, (error, response) => {
    if (error) {
        console.error("GetProduct error:", error.message);
    } else {
        console.log("===== GET PRODUCT =====");
        console.log(response);
    }

    // Test 2: Lấy danh sách sản phẩm
    client.ListProducts({}, (error, response) => {
        if (error) {
            console.error("ListProducts error:", error.message);
        } else {
            console.log("===== LIST PRODUCTS =====");
            console.log(response.products);
        }


        // Test 3: Cập nhật tồn kho Product X từ 20 xuống 15
        client.UpdateStock(
            { pid: 1, quantity: 15 },
            (error, response) => {
                if (error) {
                    console.error("UpdateStock error:", error.message);
                } else {
                    console.log("===== UPDATE STOCK =====");
                    console.log(response);
                }

                client.close();
            }
        );

    });
});
