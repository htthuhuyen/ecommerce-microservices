
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
    defaults: true,
    oneofs: true
});

const authProto = grpc.loadPackageDefinition(
    packageDefinition
).auth;

const client = new authProto.AuthService(
    "127.0.0.1:50051",
    grpc.credentials.createInsecure()
);

// Kiểm tra GetUser
client.GetUser({ userId: 1 }, (error, response) => {
    if (error) {
        console.error("GetUser error:", error.message);
    } else {
        console.log("===== GET USER =====");
        console.log(response);
    }
});

// Kiểm tra VerifyToken với token không hợp lệ
client.VerifyToken(
    { token: "invalid_token" },
    (error, response) => {
        if (error) {
            console.error("VerifyToken error:", error.message);
        } else {
            console.log("===== VERIFY INVALID TOKEN =====");
            console.log(response);
        }

        client.close();
    }
);
