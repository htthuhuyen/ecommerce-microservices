
const { Kafka } = require("kafkajs");
const { pool } = require("../config/db");

const kafka = new Kafka({
    clientId: "shipment-service",
    brokers: [
        process.env.KAFKA_BROKER || "localhost:9092"
    ]
});

const consumer = kafka.consumer({
    groupId: "shipment-service-group"
});

const startKafkaConsumer = async () => {
    await consumer.connect();

    await consumer.subscribe({
        topic: "order-created",
        fromBeginning: true
    });

    console.log("Shipment Kafka Consumer connected");

    await consumer.run({
        eachMessage: async ({ message }) => {
            const event = JSON.parse(
                message.value.toString()
            );

            const orderId = Number(event.order_id);
            const address = event.address;

            if (
                !Number.isSafeInteger(orderId) ||
                orderId <= 0 ||
                typeof address !== "string" ||
                !address.trim()
            ) {
                console.error(
                    "Invalid order-created event"
                );
                return;
            }

            const result = await pool.query(
                `INSERT INTO shipments
                 (order_id, address, status)
                 VALUES ($1, $2, 'PENDING')
                 ON CONFLICT (order_id) DO NOTHING
                 RETURNING id`,
                [orderId, address.trim()]
            );

            if (result.rows.length > 0) {
                console.log(
                    `Shipment created from Kafka for order ${orderId}`
                );
            } else {
                console.log(
                    `Shipment already exists for order ${orderId}`
                );
            }
        }
    });
};

module.exports = {
    startKafkaConsumer
};
