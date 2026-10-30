
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.resolve(
    __dirname,
    "../../../../shared/proto/shipment.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const shipmentProto = grpc.loadPackageDefinition(
    packageDefinition
).shipment;

const SHIPMENT_GRPC_URL =
    process.env.SHIPMENT_GRPC_URL || "localhost:50055";

const shipmentClient = new shipmentProto.ShipmentService(
    SHIPMENT_GRPC_URL,
    grpc.credentials.createInsecure()
);

module.exports = shipmentClient;
