const autocannon = require("autocannon");

autocannon(
  {
    url: "http://localhost:5000/posts",
    connections: 500,
    duration: 30,
    method: "POST",

    headers: {
      "content-type": "application/json",
    },

    body: JSON.stringify({
      userMail: "axubair9@gmail.com",
      userName: "Imtiaz Hossain",
      userImage: "https://i.ibb.co/Gv5ns3Qb/1000025571-1.jpg",
      verified: false,
      date: "Tue Aug 25 2026",
      createdAt: "2026-08-25T20:00:00.000Z",
      mainPic:
        "https://i.ibb.co/Z1GZfLBt/Chat-GPT-Image-Aug-24-2026-06-13-59-AM.png",
      postTitle: "Benchmark Test",
      maintext: "<p>Benchmark test post</p>",
      postCate: "গল্প",
      totalLike: 0,
      comments: [],
      totalSharee: 0,
    }),
  },
  (err, result) => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(result);
  }
);