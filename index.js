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
  magazinesCollection = db.collection("magazines");
  TopBannersCollection = db.collection("topBanners");

  await usersCollection.createIndex({ createdAt: -1 });

  await usersCollection.createIndex({ email: 1 });

  await allPostsCollection.createIndex({ createdAt: -1 });

  await allPostsCollection.createIndex({ userMail: 1 });

  await usersCollection.createIndex({ teamAtibhooj: 1 });

  await usersCollection.createIndex({ atibhoojMentors: 1 });

  await usersCollection.createIndex({ userEmail: 1 });

  await allPostsCollection.createIndex({ postCate: 1 });

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
        const result = await usersCollection
          .find({ email: userEmail })
          .toArray();

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
  const cacheKey = "cache:users";

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
  const cacheKey = "cache:all:posts";

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
  try {
    const postData = req.body;
    const { allPostsCollection } = await connectDB();
    
    const result = await allPostsCollection.insertOne(postData);

    await redis.del("cache:all:posts");

    const category = postData.postCate;
    if (category === "ইসলামিক") {
      await redis.del("cache:posts:category:islamic");
    } else if (category === "গল্প") {
      await redis.del("cache:posts:category:golpo");
    } else if (category === "কবিতা") {
      await redis.del("cache:posts:category:kobita");
    } else if (category === "উপন্যাস") {
      await redis.del("cache:posts:category:upannas");
    } else if (category === "জোক") {
      await redis.del("cache:posts:category:jokes");
    }

    if (postData.userMail) {
      await redis.del(`cache:posts:user:${postData.userMail}`);
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to create post!", error: error.message });
  }
});

// Get post
const pendingUserPostsRequests = new Map();
app.get("/post", async (req, res) => {
  const userEmail = req.query.email;

  if (!userEmail) {
    return res
      .status(400)
      .json({ message: "Email query parameter is required!" });
  }

  const cacheKey = `cache:posts:user:${userEmail}`;

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
const pendingPostDetailsRequests = new Map();
app.get("/post-details/:postId", async (req, res) => {
  const postId = req.params.postId;

  if (!ObjectId.isValid(postId)) {
    return res.status(400).json({ message: "Invalid post ID format!" });
  }

  const cacheKey = `cache:post:${postId}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingPostDetailsRequests.has(cacheKey)) {
      const result = await pendingPostDetailsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { allPostsCollection } = await connectDB();
        const query = { _id: new ObjectId(postId) };
        const result = await allPostsCollection.findOne(query);

        if (!result) {
          return null;
        }

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingPostDetailsRequests.delete(cacheKey);
      }
    })();

    pendingPostDetailsRequests.set(cacheKey, fetchPromise);

    const result = await fetchPromise;

    if (!result) {
      return res.status(404).json({ message: "Post not found!" });
    }

    res.status(200).json(result);
  } catch (error) {
    pendingPostDetailsRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
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
const pendingMagazinesRequests = new Map();

app.get("/magazines", async (req, res) => {
  const cacheKey = "cache:megazines:all";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingMagazinesRequests.has(cacheKey)) {
      const result = await pendingMagazinesRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { magazinesCollection } = await connectDB();

        const result = await magazinesCollection.find({}).toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingMagazinesRequests.delete(cacheKey);
      }
    })();

    pendingMagazinesRequests.set(cacheKey, fetchPromise);

    const result = await fetchPromise;
    res.status(200).json(result);
  } catch (error) {
    pendingMagazinesRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
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
const pendingTeamMembersRequests = new Map();
app.get("/teamMembers", async (req, res) => {
  const cacheKey = "cache:team:members";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingTeamMembersRequests.has(cacheKey)) {
      const result = await pendingTeamMembersRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { usersCollection } = await connectDB();

        const result = await usersCollection
          .find({ teamAtibhooj: true })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingTeamMembersRequests.delete(cacheKey);
      }
    })();

    pendingTeamMembersRequests.set(cacheKey, fetchPromise);

    const result = await fetchPromise;
    res.status(200).json(result);
  } catch (error) {
    pendingTeamMembersRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Get atibhooj mentors
const pendingMentorsRequests = new Map();
app.get("/atibhoojMentors", async (req, res) => {
  const cacheKey = "cache:atibhooj:mentors";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingMentorsRequests.has(cacheKey)) {
      const result = await pendingMentorsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { usersCollection } = await connectDB();

        const result = await usersCollection
          .find({ atibhoojMentors: true })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingMentorsRequests.delete(cacheKey);
      }
    })();

    pendingMentorsRequests.set(cacheKey, fetchPromise);

    const result = await fetchPromise;
    res.status(200).json(result);
  } catch (error) {
    pendingMentorsRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Check Admin
const pendingAdminCheckRequests = new Map();

app.get("/admin/:email", async (req, res) => {
  const email = req.params.email;

  if (!email) {
    return res.status(400).json({ message: "Email parameter is required!" });
  }

  const cacheKey = `cache:admin:${email}`;

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingAdminCheckRequests.has(cacheKey)) {
      const result = await pendingAdminCheckRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { usersCollection } = await connectDB();
        const user = await usersCollection.findOne({ userEmail: email });
        
        const isAdmin = user?.role === "admin";
        const result = { admin: isAdmin };

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingAdminCheckRequests.delete(cacheKey);
      }
    })();

    pendingAdminCheckRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingAdminCheckRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Top Banner Upload
// verifyJwt,
app.post("/uploadTopbanner", async (req, res) => {
  const TopBanner = req.body;
  const result = await TopBannersCollection.insertOne(TopBanner);
  res.send(result);
});

// Get Top Banner
const pendingTopBannerRequests = new Map();
app.get("/allTopbanner", async (req, res) => {
  const cacheKey = "cache:topbanners:all";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingTopBannerRequests.has(cacheKey)) {
      const result = await pendingTopBannerRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { TopBannersCollection } = await connectDB();
        
        const result = await TopBannersCollection
          .find({})
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingTopBannerRequests.delete(cacheKey);
      }
    })();

    pendingTopBannerRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingTopBannerRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Get ইসলামিক Posts
const pendingIslamicPostsRequests = new Map();

app.get("/islamicPosts", async (req, res) => {
  const cacheKey = "cache:posts:category:islamic";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingIslamicPostsRequests.has(cacheKey)) {
      const result = await pendingIslamicPostsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { allPostsCollection } = await connectDB();
        
        const result = await allPostsCollection
          .find({ postCate: "ইসলামিক" })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingIslamicPostsRequests.delete(cacheKey);
      }
    })();

    pendingIslamicPostsRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingIslamicPostsRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Get গল্প Posts
const pendingGolpoPostsRequests = new Map();
app.get("/golpoPosts", async (req, res) => {
  const cacheKey = "cache:posts:category:golpo";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingGolpoPostsRequests.has(cacheKey)) {
      const result = await pendingGolpoPostsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { allPostsCollection } = await connectDB();
        
        const result = await allPostsCollection
          .find({ postCate: "গল্প" })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingGolpoPostsRequests.delete(cacheKey);
      }
    })();

    pendingGolpoPostsRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingGolpoPostsRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Get কবিতা Posts
const pendingKobitaPostsRequests = new Map();
app.get("/kobitaPosts", async (req, res) => {
  const cacheKey = "cache:posts:category:kobita";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingKobitaPostsRequests.has(cacheKey)) {
      const result = await pendingKobitaPostsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { allPostsCollection } = await connectDB();
        
        const result = await allPostsCollection
          .find({ postCate: "কবিতা" })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingKobitaPostsRequests.delete(cacheKey);
      }
    })();

    pendingKobitaPostsRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingKobitaPostsRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Get উপন্যাস Posts
const pendingUpannasPostsRequests = new Map();
app.get("/upannasPosts", async (req, res) => {
  const cacheKey = "cache:posts:category:upannas";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingUpannasPostsRequests.has(cacheKey)) {
      const result = await pendingUpannasPostsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { allPostsCollection } = await connectDB();
        
        const result = await allPostsCollection
          .find({ postCate: "উপন্যাস" })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingUpannasPostsRequests.delete(cacheKey);
      }
    })();

    pendingUpannasPostsRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingUpannasPostsRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

// Get জোক Posts
const pendingJokesPostsRequests = new Map();
app.get("/jokesPosts", async (req, res) => {
  const cacheKey = "cache:posts:category:jokes";

  try {
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    if (pendingJokesPostsRequests.has(cacheKey)) {
      const result = await pendingJokesPostsRequests.get(cacheKey);
      return res.status(200).json(result);
    }

    const fetchPromise = (async () => {
      try {
        const { allPostsCollection } = await connectDB();
        
        const result = await allPostsCollection
          .find({ postCate: "জোক" })
          .toArray();

        await redis.set(cacheKey, JSON.stringify(result), "EX", 180);

        return result;
      } finally {
        pendingJokesPostsRequests.delete(cacheKey);
      }
    })();

    pendingJokesPostsRequests.set(cacheKey, fetchPromise);
    
    const result = await fetchPromise;
    res.status(200).json(result);

  } catch (error) {
    pendingJokesPostsRequests.delete(cacheKey);
    res.status(500).json({ message: "Server error!", error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Hello from Atibhoj Server!");
});

app.listen(port, () => {
  console.log(`Atibhooj server is running on port ${port}`);
});
