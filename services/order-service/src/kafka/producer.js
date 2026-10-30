
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "order-service",
    brokers: [
        process.env.KAFKA_BROKER || "localhost:9092"
    ]
});

const producer = kafka.producer();

let connected = false;

const connectKafka = async () => {
    if (!connected) {
        await producer.connect();
        connected = true;

        console.log("Order Kafka Producer connected");
    }
};

const publishOrderCreated = async (orderData) => {
    await connectKafka();

    await producer.send({
        topic: "order-created",
        messages: [
            {
                key: String(orderData.order_id),
                value: JSON.stringify({
                    order_id: orderData.order_id,
                    user_id: orderData.user_id,
                    product_id: orderData.product_id,
                    quantity: orderData.quantity,
                    total_amount: orderData.total_amount,
                    address: orderData.address,
                    created_at: orderData.created_at
                })
            }
        ]
    });

    console.log(
        `Published order-created event for order ${orderData.order_id}`
    );
};

module.exports = {
    connectKafka,
    publishOrderCreated
};
