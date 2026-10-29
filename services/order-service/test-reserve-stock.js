
require("dotenv").config();

const productClient = require("./src/grpc/product.client");

// Thu dat so luong rat lon de kiem tra het hang
productClient.ReserveStock(
    {
        pid: 1,
        quantity: 1000000
    },
    (error, response) => {
        if (error) {
            console.log("gRPC Status:", error.code);
            console.log("Message:", error.details);
        } else {
            console.log("ReserveStock response:", response);
        }

        productClient.close();
    }
);
