
require("dotenv").config();

const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.join(
    __dirname,
    "../../shared/proto/auth.proto"
);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true
});

const authProto = grpc.loadPackageDefinition(
    packageDefinition
).auth;

const client = new authProto.AuthService(
    "127.0.0.1:50051",
    grpc.credentials.createInsecure()
);

// Đăng nhập để lấy JWT thật
async function testValidToken() {
    try {
        const response = await fetch(
            "http://127.0.0.1:3001/api/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: "student01",
                    password: "123456"
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.token) {
            console.error("Login failed:", data.message);
            client.close();
            return;
        }

        console.log("Login successful");

        // Gửi JWT đến Auth gRPC Server
        client.VerifyToken(
            { token: data.token },
            (error, result) => {
                if (error) {
                    console.error("gRPC error:", error.message);
                } else {
                    console.log("===== VERIFY VALID TOKEN =====");
                    console.log(result);
                }

                client.close();
            }
        );
    } catch (error) {
        console.error("Test error:", error.message);
        client.close();
    }
}

testValidToken();
