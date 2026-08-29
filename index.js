const express = require("express");
const app = express();
const cors = require("cors");
const dns = require("dns");
require("dotenv").config();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Middleware
app.use(cors());
app.use(express.json());
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const Redis = require("ioredis");
// const { createClient } = require("redis");

// Use Client
// const redis = createClient({url: process.env.REDIS_URL});

const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
});

module.exports = redis;

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ab3rgue.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db,
  usersCollection,
  allPostsCollection,
  magazinesCollection,
  TopBannersCollection;

async function connectDB() {
  if (db)
    return {
      usersCollection,
      allPostsCollection,
      magazinesCollection,
      TopBannersCollection,
    };

  await client.connect();
  // await redis.connect(); // ioredis connect willingly

  db = client.db("atibhooj");
  usersCollection = db.collection("users");
  allPostsCollection = db.collection("posts");
  magazinesCollection = db.collection("megazines");
  TopBannersCollection = db.collection("topBanners");

  await usersCollection.createIndex({ createdAt: -1 });

  await usersCollection.createIndex({ email: 1 });

  await allPostsCollection.createIndex({ createdAt: -1 });

  await allPostsCollection.createIndex({ userMail: 1 });

  return {
    usersCollection,
    allPostsCollection,
    magazinesCollection,
    TopBannersCollection,
  };
}

// Store user
app.put("/users/:email", async (req, res) => {
  const email = req.params.email;
  const user = req.body;
  const filter = { email: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: user,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Get User
const pendingUserRequests = new Map();
app.get("/user", async (req, res) => {
  const userEmail = req.query.email;
  if (!userEmail) return res.status(400).json({ message: "Email is required" });

  const cacheKey = `cache:user:${userEmail}`;

  try {
    const cachedData = await redis.get(cacheKey); 
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData)); 
    }

    if (pendingUserRequests.has(cacheKey)) {
      const result = await pendingUserRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { usersCollection } = await connectDB();
        const result = await usersCollection.find({ email: userEmail }).toArray();
        
        await redis.set(cacheKey, JSON.stringify(result), "EX", 180); 
        return result;
      } finally {
        pendingUserRequests.delete(cacheKey);
      }
    })();

    pendingUserRequests.set(cacheKey, fetchPromise);
    const result = await fetchPromise;

    res.status(200).json(result);
  } catch (error) {
    pendingUserRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Get Users
//  verifyJwt,
const pendingRequests = new Map();
app.get("/users", async (req, res) => {
  const cacheKey = "all-users";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingRequests.has(cacheKey)) {
      const result = await pendingRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { usersCollection } = await connectDB();
        const result = await usersCollection
          .find({})
          .sort({ createdAt: -1 })
          .project({ userName: 1, email: 1, userPassWord: 1 })
          .limit(10)
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, fetchPromise);
    const result = await fetchPromise;

    res.status(200).json(result);
  } catch (error) {
    pendingRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Update Cover Field
// verifyJwt,
app.put("/userCover/:email", async (req, res) => {
  const email = req.params.email;
  const userCoverPic = req.body;
  const filter = { userEmail: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: userCoverPic,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Update Profile Field
app.put("/userProfile/:email", async (req, res) => {
  const email = req.params.email;
  const userProfilePic = req.body;
  const filter = { userEmail: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: userProfilePic,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Update Bio
app.put("/userProfile/:email", async (req, res) => {
  const email = req.params.email;
  const userBio = req.body;
  const filter = { userEmail: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: userBio,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Update my Following
//  verifyJwt,
app.put("/myFollowing/:email", async (req, res) => {
  const email = req.params.email;
  const following = req.body;
  const filter = { userEmail: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: following,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Update influencer
// verifyJwt,
app.put("/myFollowers/:email", async (req, res) => {
  const email = req.params.email;
  const followers = req.body;
  const filter = { userEmail: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: followers,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Get posts
const pendingPostsRequests = new Map();

app.get("/posts", async (req, res) => {
  const cacheKey = "all-posts";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingPostsRequests.has(cacheKey)) {
      const result = await pendingPostsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { allPostsCollection } = await connectDB();
        
        const result = await allPostsCollection
          .find({})
          .sort({ _id: -1 })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingPostsRequests.delete(cacheKey);
      }
    })();

    pendingPostsRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingPostsRequests.delete(cacheKey); 
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// POST user post
// verifyJwt,
app.post("/posts", async (req, res) => {
  const postData = req.body;
  const result = await allPostsCollection.insertOne(postData);
  res.send(result);
});

// Get post
const pendingUserPostsRequests = new Map();

app.get("/post", async (req, res) => {
  const userEmail = req.query.email;

  if (!userEmail) {
    return res.status(400).json({ message: "Email query parameter is required!" });
  }

  const cacheKey = `posts-user-${userEmail}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingUserPostsRequests.has(cacheKey)) {
      const result = await pendingUserPostsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { allPostsCollection } = await connectDB();
        
        const result = await allPostsCollection
          .find({ userMail: userEmail })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingUserPostsRequests.delete(cacheKey);
      }
    })();

    pendingUserPostsRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingUserPostsRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Get post
app.get("/post-details/:postId", async (req, res) => {
  const postId = req.params.postId;
  const query = { _id: new ObjectId(postId) };
  const result = await allPostsCollection.findOne(query);
  res.send(result);
});

// Liking Method
app.put("/postLike/:postId", async (req, res) => {
  const postId = req.params.postId;
  const totalLike = req.body;
  const filter = { _id: new ObjectId(postId) };
  const options = { upsert: true };
  const updateDoc = {
    $set: totalLike,
  };
  const result = await allPostsCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Comment Method
// verifyJwt,
app.put("/postComment/:postID", async (req, res) => {
  const postId = req.params.postID;
  const updatedComment = req.body;
  // console.log(postId)
  // console.log(updatedComment)
  const filter = { _id: new ObjectId(postId) };
  const options = { upsert: true };
  const updateDoc = {
    $set: updatedComment,
  };
  const result = await allPostsCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Upload Megazine
// verifyJwt,
app.post("/megazineUpload", async (req, res) => {
  const megazineData = req.body;
  const result = await megazinesCollection.insertOne(megazineData);
  res.send(result);
});

// Get Megazine
app.get("/megazines", async (req, res) => {
  const result = await megazinesCollection.find({}).toArray();
  res.send(result);
});

// Hanlde Megazine Quantity
app.put("/megazinesquantity/:id", async (req, res) => {
  const megazineId = req.params.id;
  const newQuantity = req.body;
  const filter = { _id: new ObjectId(megazineId) };
  const options = { upsert: true };
  const updateDoc = {
    $set: newQuantity,
  };
  const result = await megazinesCollection.updateOne(
    filter,
    updateDoc,
    options,
  );
  res.send(result);
});

// Hanlde Team Atibhooj add members
// verifyJwt,
app.put("/atibhoojMemberHandle/:userId", async (req, res) => {
  const userId = req.params.userId;
  const Treqest = req.body;
  const filter = { _id: new ObjectId(userId) };
  const options = { upsert: true };
  const updateDoc = {
    $set: Treqest,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Hanlde Team Team Atibhooj badge Atibhooj
// verifyJwt,
app.put("/atibhoojBadgeHandle/:userId", async (req, res) => {
  const userId = req.params.userId;
  const Treqest = req.body;
  const filter = { _id: new ObjectId(userId) };
  const options = { upsert: true };
  const updateDoc = {
    $set: Treqest,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result);
});

// Get atibhooj team members
app.get("/teamMembers", async (req, res) => {
  const result = await usersCollection.find({ teamAtibhooj: true }).toArray();
  res.send(result);
});

// Get atibhooj mentors
app.get("/atibhoojMentors", async (req, res) => {
  const result = await usersCollection
    .find({ atibhoojMentors: true })
    .toArray();
  res.send(result);
});

// Check Admin
app.get("/admin/:email", async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ userEmail: email });
  const isAdmin = user?.role === "admin";
  res.send({ admin: isAdmin });
});

// Top Banner Upload
// verifyJwt,
app.post("/uploadTopbanner", async (req, res) => {
  const TopBanner = req.body;
  const result = await TopBannersCollection.insertOne(TopBanner);
  res.send(result);
});

// Get Top Banner
app.get("/allTopbanner", async (req, res) => {
  const result = await TopBannersCollection.find({}).toArray();
  res.send(result);
});

// Get ইসলামিক Posts
app.get("/islamicPosts", async (req, res) => {
  const result = await allPostsCollection
    .find({ postCate: "ইসলামিক" })
    .toArray();
  res.send(result);
});

// Get গল্প Posts
app.get("/golpoPosts", async (req, res) => {
  const result = await allPostsCollection.find({ postCate: "গল্প" }).toArray();
  res.send(result);
});

// Get কবিতা Posts
app.get("/kobitaPosts", async (req, res) => {
  const result = await allPostsCollection.find({ postCate: "কবিতা" }).toArray();
  res.send(result);
});

// Get উপন্যাস Posts
app.get("/upannasPosts", async (req, res) => {
  const result = await allPostsCollection
    .find({ postCate: "উপন্যাস" })
    .toArray();
  res.send(result);
});

// Get জোক Posts
app.get("/jokesPosts", async (req, res) => {
  const result = await allPostsCollection.find({ postCate: "জোক" }).toArray();
  res.send(result);
});

app.get("/", (req, res) => {
  res.send("Hello from Atibhoj Server!");
});

app.listen(port, () => {
  console.log(`Atibhooj server is running on port ${port}`);
});
