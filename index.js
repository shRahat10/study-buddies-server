const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middleware

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://study-buddies-7ea63.web.app',
    'https://study-buddies-7ea63.firebaseapp.com'
  ],
  credentials: true
}));

const logger = (req, res, next) => {
  console.log('log info: ', req.method, req.url);
  next();
}

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token
  console.log('token verify', token);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded;
    next();
  })
}
//===========


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
      try {
        const user = req.body;
        console.log("user for token", user);
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '1h'
        });

        res.cookie("token", token, cookieOptions)
          .send({ success: true });
      } catch (error) {
        res.status(500).send({ success: false })
      }
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

    app.get('/submissions', logger, verifyToken, async (req, res) => {
      const cursor = submissions.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/submissions', logger, verifyToken, async (req, res) => {
      const newSubmissions = req.body;
      const result = await submissions.insertOne(newSubmissions);
      res.send(result);
    })

    app.put('/submissions/:id', logger, verifyToken, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updatedMarking = req.body;

      const spot = {
        $set: {
          status: updatedMarking.status,
          obtainedMarks: updatedMarking.obtainedMarks,
          feedback: updatedMarking.feedback,
        }
      }

      const result = await submissions.updateOne(filter, spot, options);
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
