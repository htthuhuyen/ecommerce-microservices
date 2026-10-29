
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { pool } = require("../config/db");

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

const toShipmentResponse = (shipment) => ({
    id: shipment.id,
    order_id: shipment.order_id,
    address: shipment.address,
    status: shipment.status,
    created_at: shipment.created_at
        ? new Date(shipment.created_at).toISOString()
        : ""
});

// Lay thong tin van chuyen
const getShipment = async (call, callback) => {
    try {
        const { id } = call.request;

        if (!Number.isInteger(id) || id <= 0) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Invalid shipment ID"
            });
        }

        const result = await pool.query(
            "SELECT * FROM shipments WHERE id = $1",
            [id]
        );

        if (result.rows.length === 0) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Shipment not found"
            });
        }

        return callback(
            null,
            toShipmentResponse(result.rows[0])
        );
    } catch (error) {
        console.error("gRPC GetShipment error:", error.message);

        return callback({
            code: grpc.status.INTERNAL,
            message: "Failed to get shipment"
        });
    }
};

// Tao thong tin van chuyen
const createShipment = async (call, callback) => {
    try {
        const { order_id, address } = call.request;

        if (
            !Number.isInteger(order_id) ||
            order_id <= 0 ||
            typeof address !== "string" ||
            !address.trim()
        ) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Invalid shipment information"
            });
        }

        const result = await pool.query(
            `INSERT INTO shipments (order_id, address, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [order_id, address.trim(), "PENDING"]
        );

        return callback(
            null,
            toShipmentResponse(result.rows[0])
        );
    } catch (error) {
        if (error.code === "23505") {
            return callback({
                code: grpc.status.ALREADY_EXISTS,
                message: "Shipment already exists for this order"
            });
        }

        console.error("gRPC CreateShipment error:", error.message);

        return callback({
            code: grpc.status.INTERNAL,
            message: "Failed to create shipment"
        });
    }
};

// Cap nhat trang thai van chuyen
const updateShipmentStatus = async (call, callback) => {
    try {
        const { id, status } = call.request;

        if (!Number.isInteger(id) || id <= 0) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Invalid shipment ID"
            });
        }

        const allowedStatuses = [
            "PENDING",
            "SHIPPING",
            "DELIVERED"
        ];

        if (!allowedStatuses.includes(status)) {
            return callback({
                code: grpc.status.INVALID_ARGUMENT,
                message: "Invalid shipment status"
            });
        }

        const result = await pool.query(
            `UPDATE shipments
       SET status = $1
       WHERE id = $2
       RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return callback({
                code: grpc.status.NOT_FOUND,
                message: "Shipment not found"
            });
        }

        return callback(
            null,
            toShipmentResponse(result.rows[0])
        );
    } catch (error) {
        console.error(
            "gRPC UpdateShipmentStatus error:",
            error.message
        );

        return callback({
            code: grpc.status.INTERNAL,
            message: "Failed to update shipment status"
        });
    }
};

const startGrpcServer = () => {
    const server = new grpc.Server();

    server.addService(
        shipmentProto.ShipmentService.service,
        {
            GetShipment: getShipment,
            CreateShipment: createShipment,
            UpdateShipmentStatus: updateShipmentStatus
        }
    );

    const port = process.env.GRPC_PORT || 50055;

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, boundPort) => {
            if (error) {
                console.error("Shipment gRPC server error:", error);
                return;
            }

            console.log(
                `Shipment gRPC Server running on port ${boundPort}`
            );
        }
    );

    return server;
};

module.exports = {
    startGrpcServer
};
