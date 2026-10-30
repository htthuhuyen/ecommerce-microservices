
const { Kafka } = require("kafkajs");
const { pool } = require("../config/db");

const kafka = new Kafka({
    clientId: "customer-service",
    brokers: [
        process.env.KAFKA_BROKER || "localhost:9092"
    ]
});

const consumer = kafka.consumer({
    groupId: "customer-service-group"
});

const startKafkaConsumer = async () => {
    await consumer.connect();

    await consumer.subscribe({
        topic: "user-registered",
        fromBeginning: true
    });

    console.log("Customer Kafka Consumer connected");

    await consumer.run({
        eachMessage: async ({ message }) => {
            const event = JSON.parse(
                message.value.toString()
            );

            const userId = Number(event.user_id);
            const username = event.username;

            if (
                !Number.isSafeInteger(userId) ||
                userId <= 0 ||
                typeof username !== "string" ||
                !username.trim()
            ) {
                console.error(
                    "Invalid user-registered event"
                );
                return;
            }

            const result = await pool.query(
                `INSERT INTO customers
                 (user_id, fullname, email, phone, points, membership_id)
                 VALUES (
                     $1, $2, NULL, NULL, 0,
                     (SELECT id
                      FROM memberships
                      WHERE name = 'NORMAL')
                 )
                 ON CONFLICT (user_id) DO NOTHING
                 RETURNING id`,
                [userId, username.trim()]
            );

            if (result.rows.length > 0) {
                console.log(
                    `Customer created from Kafka for user ${userId}`
                );
            } else {
                console.log(
                    `Customer already exists for user ${userId}`
                );
            }
        }
    });
};

module.exports = {
    startKafkaConsumer
};
