
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

const PROTO_PATH = path.join(
    __dirname,
    "../../../../shared/proto/auth.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const authProto = grpc.loadPackageDefinition(
    packageDefinition
).auth;

// Kiểm tra JWT
const verifyToken = (call, callback) => {
    try {
        const decoded = jwt.verify(
            call.request.token,
            process.env.JWT_SECRET
        );

        callback(null, {
            valid: true,
            userId: decoded.userId,
            username: decoded.username,
            message: "Token is valid"
        });
    } catch (error) {
        callback(null, {
            valid: false,
            userId: 0,
            username: "",
            message: "Invalid or expired token"
        });
    }
};

// Tìm tài khoản theo ID
const getUser = async (call, callback) => {
    try {
        const result = await pool.query(
            "SELECT id, username FROM users WHERE id = $1",
            [call.request.userId]
        );

        if (result.rows.length === 0) {
            return callback(null, {
                userId: 0,
                username: "",
                found: false
            });
        }

        const user = result.rows[0];

        callback(null, {
            userId: user.id,
            username: user.username,
            found: true
        });
    } catch (error) {
        console.error("GetUser gRPC error:", error.message);

        callback({
            code: grpc.status.INTERNAL,
            message: "Failed to get user"
        });
    }
};

// Khởi động gRPC Server
const startGrpcServer = () => {
    const server = new grpc.Server();

    server.addService(authProto.AuthService.service, {
        verifyToken,
        getUser
    });

    const GRPC_PORT = process.env.GRPC_PORT || 50051;

    server.bindAsync(
        `0.0.0.0:${GRPC_PORT}`,
        grpc.ServerCredentials.createInsecure(),
        (error, port) => {
            if (error) {
                console.error("Auth gRPC error:", error.message);
                process.exit(1);
            }

            console.log(`Auth gRPC Server running on port ${port}`);
        }
    );

    return server;
};

module.exports = {
    startGrpcServer
};
