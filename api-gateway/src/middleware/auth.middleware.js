
const jwt = require("jsonwebtoken");

// Kiem tra JWT truoc khi truy cap API
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (
        typeof authHeader !== "string" ||
        !/^Bearer\s+\S+$/i.test(authHeader)
    ) {
        return res.status(401).json({
            message: "Access token is required"
        });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!process.env.JWT_SECRET) {
        console.error("Gateway JWT_SECRET is not configured");

        return res.status(500).json({
            message: "Authentication configuration error"
        });
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        req.user = decoded;

        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = {
    verifyToken
};
