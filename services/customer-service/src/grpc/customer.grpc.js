
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const { pool } = require("../config/db");

const PROTO_PATH = path.join(
    __dirname,
    "../../../../shared/proto/customer.proto"
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

// Lấy thông tin khách hàng
const getCustomer = async (call, callback) => {
    try {
        const result = await pool.query(
            `SELECT c.user_id, c.fullname, c.email, c.phone,
              c.points, m.name AS membership_name
       FROM customers c
       LEFT JOIN memberships m ON c.membership_id = m.id
       WHERE c.user_id = $1`,
            [call.request.userId]
        );

        if (result.rows.length === 0) {
            return callback(null, {
                found: false,
                userId: call.request.userId,
                message: "Customer not found"
            });
        }

        const customer = result.rows[0];

        callback(null, {
            found: true,
            userId: customer.user_id,
            fullname: customer.fullname,
            email: customer.email || "",
            phone: customer.phone || "",
            points: customer.points,
            membershipName: customer.membership_name || "",
            message: "Customer found"
        });
    } catch (error) {
        console.error("GetCustomer gRPC error:", error.message);

        callback({
            code: grpc.status.INTERNAL,
            message: "Failed to get customer"
        });
    }
};

// Cộng điểm cho khách hàng
const addPoints = async (call, callback) => {
    const { userId, points } = call.request;

    if (!Number.isInteger(userId) || userId <= 0 ||
        !Number.isInteger(points) || points <= 0) {
        return callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: "userId and points must be positive integers"
        });
    }

    try {
        const result = await pool.query(
            `UPDATE customers
       SET points = points + $1,
           membership_id = (
             SELECT id FROM memberships
             WHERE min_points <= customers.points + $1
             ORDER BY min_points DESC
             LIMIT 1
           )
       WHERE user_id = $2
         AND points <= 2147483647 - $1
       RETURNING user_id, fullname, email, phone, points, membership_id`,
            [points, userId]
        );

        if (result.rows.length === 0) {
            const existing = await pool.query(
                "SELECT id FROM customers WHERE user_id = $1",
                [userId]
            );

            return callback({
                code: existing.rows.length
                    ? grpc.status.INVALID_ARGUMENT
                    : grpc.status.NOT_FOUND,
                message: existing.rows.length
                    ? "Points exceed allowed limit"
                    : "Customer not found"
            });
        }

        const customer = result.rows[0];

        const membership = await pool.query(
            "SELECT name FROM memberships WHERE id = $1",
            [customer.membership_id]
        );

        callback(null, {
            found: true,
            userId: customer.user_id,
            fullname: customer.fullname,
            email: customer.email || "",
            phone: customer.phone || "",
            points: customer.points,
            membershipName: membership.rows[0].name,
            message: "Points added successfully"
        });
    } catch (error) {
        console.error("AddPoints gRPC error:", error.message);

        callback({
            code: grpc.status.INTERNAL,
            message: "Failed to add points"
        });
    }
};

const startGrpcServer = () => {
    const server = new grpc.Server();

    server.addService(customerProto.CustomerService.service, {
        getCustomer,
        addPoints
    });

    const port = process.env.GRPC_PORT || 50052;

    server.bindAsync(
        `0.0.0.0:${port}`,
        grpc.ServerCredentials.createInsecure(),
        (error, boundPort) => {
            if (error) {
                console.error("Customer gRPC error:", error.message);
                return;
            }

            console.log(
                `Customer gRPC Server running on port ${boundPort}`
            );
        }
    );

    return server;
};

module.exports = {
    startGrpcServer
};
