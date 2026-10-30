
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = path.join(
    __dirname,
    "../../../../shared/proto/customer.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const customerProto =
    grpc.loadPackageDefinition(packageDefinition).customer;

const customerClient = new customerProto.CustomerService(
    process.env.CUSTOMER_GRPC_URL || "localhost:50052",
    grpc.credentials.createInsecure()
);

module.exports = customerClient;
