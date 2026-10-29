
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

const connectDB = async () => {
    try {
        const client = await pool.connect();

        console.log("Order Service connected to PostgreSQL");

        client.release();
    } catch (error) {
        console.error("PostgreSQL connection error:", error.message);
        throw error;
    }
};

module.exports = {
    pool,
    connectDB
};
