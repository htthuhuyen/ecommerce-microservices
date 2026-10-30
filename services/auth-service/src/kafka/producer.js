
const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "auth-service",
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
        console.log("Auth Kafka Producer connected");
    }
};

const publishUserRegistered = async (user) => {
    await connectKafka();

    await producer.send({
        topic: "user-registered",
        messages: [
            {
                key: String(user.id),
                value: JSON.stringify({
                    user_id: user.id,
                    username: user.username,
                    created_at: user.created_at
                })
            }
        ]
    });

    console.log(
        `Published user-registered event for user ${user.id}`
    );
};

module.exports = {
    connectKafka,
    publishUserRegistered
};
