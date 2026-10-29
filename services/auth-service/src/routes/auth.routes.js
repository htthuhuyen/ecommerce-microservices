
const express = require("express");
const { register, login } = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// API yêu cầu JWT hợp lệ
router.get("/me", verifyToken, (req, res) => {
    res.status(200).json({
        message: "Token is valid",
        user: {
            id: req.user.userId,
            username: req.user.username
        }
    });
});

module.exports = router;
