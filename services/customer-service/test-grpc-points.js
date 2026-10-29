
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(
    __dirname,
    "../../shared/proto/customer.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const customerProto = grpc.loadPackageDefinition(
    packageDefinition
).customer;

const client = new customerProto.CustomerService(
    "localhost:50052",
    grpc.credentials.createInsecure()
);

client.AddPoints(
    {
        userId: 1,
        points: 400
    },
    (error, response) => {
        if (error) {
            console.error("gRPC Error:", error.message);
        } else {
            console.log("===== ADD POINTS gRPC =====");
            console.log(response);
        }

        client.close();
    }
);
