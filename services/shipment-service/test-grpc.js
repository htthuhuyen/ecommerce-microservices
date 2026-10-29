
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.resolve(
    __dirname,
    "../../shared/proto/shipment.proto"
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

const client = new shipmentProto.ShipmentService(
    "localhost:50055",
    grpc.credentials.createInsecure()
);

// Cap nhat Shipment ID = 2 sang SHIPPING
client.UpdateShipmentStatus(
    {
        id: 2,
        status: "SHIPPING"
    },
    (error, response) => {
        if (error) {
            console.error(
                "gRPC UpdateShipmentStatus error:",
                error.message
            );
        } else {
            console.log("gRPC UpdateShipmentStatus successful!");
            console.log(response);
        }

        client.close();
    }
);
