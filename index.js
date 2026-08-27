import { createClient } from "redis";
import "dotenv/config";
import express from "express";
const app = express();
import cors from "cors";

app.use(cors());
app.use(express.json());

const redis = createClient({
  url: process.env.REDIS_URL,
});

const connectRedis = async () => {
  await redis.connect();
  console.log("Connected");
};

connectRedis();

app.get("/", async (req, res) => {
  res.send({ message: "Hello!" });
});

// String
// app.post("/redis", async (req, res) => {
//   const name = await redis.set("Name", "Imtiaz Hossian", {
//     // EX: 30,
//   });
//   res.send("Job Submitted");
// });

// app.get("/redis", async (req, res) => {
//   const name = await redis.get("Name");
//   res.send(name);
// });

// Hash || Object
// app.post("/redis", async (req, res) => {
//   await redis.hSet("user:2", {
//     name: "Imtiaz",
//     age: 26,
//     city: "Dhaka",
//   });
//   res.send("Job Submitted");
// });

// app.get("/redis", async (req, res) => {
//   const user = await redis.HGETALL("user:2");
//   res.send(user);
// });


// List
// app.post("/redis", async (req, res) => {
//   await redis.LPUSH("task", "Learing 1");
//   await redis.RPUSH("task", "Learing 2");
//   res.send("Job Submitted");
// });

// app.get("/redis", async (req, res) => {
//   const tasks = await redis.lRange("task", 0, -1);
//   res.send(tasks);
// });

// Set
app.post("/redis", async (req, res) => {
  await redis.SADD("Skills", ["redis", 'node', "node"]);
  res.send("Job Submitted");
});

app.get("/redis", async (req, res) => {
  const skills = await redis.sMembers("Skills");
  res.send(skills);
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
