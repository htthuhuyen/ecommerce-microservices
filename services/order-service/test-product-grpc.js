
require("dotenv").config();

const productClient = require("./src/grpc/product.client");

productClient.GetProduct({ pid: 1 }, (error, response) => {
    if (error) {
        console.error("gRPC Error:", error.message);
    } else {
        console.log("Product from gRPC:");
        console.log(response);
    }

    productClient.close();
});
