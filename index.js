const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


app.get('/', (req, res) => {
  res.send("Server is running")
})
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5sndi45.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    //creating Token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    //clearing Token
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    //crud operations for assignments
    const assignments = client.db('study-buddies').collection('assignments');

    app.get('/study-buddies', async (req, res) => {
      const cursor = assignments.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/study-buddies', async (req, res) => {
      const newAssignment = req.body;
      const result = await assignments.insertOne(newAssignment);
      res.send(result);
    })

    app.put('/study-buddies/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedAssignment = req.body;

      const spot = {
        $set: {
          title: updatedAssignment.title,
          photoURL: updatedAssignment.photoURL,
          marks: updatedAssignment.marks,
          difficulty: updatedAssignment.difficulty,
          description: updatedAssignment.description,
          dueDate: updatedAssignment.dueDate,
        }
      }

      const result = await assignments.updateOne(filter, spot, options);
      res.send(result);
    })

    app.delete('/study-buddies/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await assignments.deleteOne(query);
      res.send(result);
    })

    //crud operations for submissions
    const submissions = client.db('study-buddies').collection('submissions');

    app.get('/submissions', async (req, res) => {
      const cursor = submissions.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/submissions', async (req, res) => {
      const newSubmissions = req.body;
      const result = await submissions.insertOne(newSubmissions);
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
