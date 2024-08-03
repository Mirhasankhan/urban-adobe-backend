const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function run() {
    try {
        // Connect to MongoDB
        await client.connect();
        console.log("Connected to MongoDB");

        const db = client.db("urbanAdobe");
        const usersCollection = db.collection("users");
        const listingCollection = db.collection("listings");
        const buyCollection = db.collection("buys");
        // User Registration
        app.post("/api/v1/register", async (req, res) => {
            const { name, email, password, role } = req.body;

            // Check if email already exists
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "User already exists",
                });
            }

            // Hash the password
            // const hashedPassword = await bcrypt.hash(password, 10);
            // console.log(hashedPassword)

            // Insert user into the database
            await usersCollection.insertOne({
                name,
                email,
                role,
                password,
            });

            res.status(201).json({
                success: true,
                message: "User registered successfully",
            });
        });

        // User Login
        app.post("/api/v1/login", async (req, res) => {
            const { email, password } = req.body;

            const user = await usersCollection.findOne({ email });
            if (!user) {
                return res.status(401).json({ message: "user not found" });
            }

            const isPasswordValid = user.password == password
            if (!isPasswordValid) {
                return res.status(401).json({ message: "password is wrong" });
            }

            // Generate JWT token
            const token = jwt.sign({ email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, {
                expiresIn: process.env.EXPIRES_IN,
            });

            res.json({
                success: true,
                message: "Login successful",
                email: req.body.email,
                token,
                role: user.role,
            });
        });

        // add listing
        app.post("/api/v1/create-listing", async (req, res) => {
            const listing = req.body
            await listingCollection.insertOne(listing);
            res.json({
                success: true,
                message: "listing created successfully",
                listing: listing
            });

        })

        //get all listings
        app.get("/api/v1/all-listings", async (req, res) => {
            try {
                const email = req.query.email;
                let query = {};

                if (email) {
                    query = { "sellerEmail": email };
                }

                const result = await listingCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching listings:", error);
                res.status(500).send("An error occurred while fetching listings");
            }
        });

        //get single listing
        app.get("/api/v1/listing/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await listingCollection.find(filter).toArray();
            res.send(result);
        });

        app.post("/api/v1/buy-property", async (req, res) => {
            const property = req.body
            await buyCollection.insertOne(property);
            res.json({
                success: true,
                message: "Buying proposol submitted, wait for the response!!",
                property: property
            });

        })

        app.get("/api/v1/all-buys", async (req, res) => {
            try {
                const email = req.query.email;
                let query = {};

                if (email) {
                    query = { email: email };
                }

                const result = await buyCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching property:", error);
                res.status(500).send("An error occurred while fetching property");
            }
        });
        app.get("/api/v1/sales", async (req, res) => {
            try {
                const email = req.query.email;
                let query = {};

                if (email) {
                    query = { sellerEmail: email };
                }

                const result = await buyCollection.find(query).toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching sales:", error);
                res.status(500).send("An error occurred while fetching property");
            }
        });

        app.delete("/api/v1/sales/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            try {
                const result = await buyCollection.deleteOne(filter); // Await the deleteOne operation
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: 'An error occurred while deleting the sale' });
            }
        });

        app.put("/api/v1/sales/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const update = { $set: { status: "Deal Confirmed" } };
            const result = await buyCollection.updateOne(filter, update);
            res.send({ message: 'Sale status updated to accepted', result });

        });

        // Start the server
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } finally {
    }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
    const serverStatus = {
        message: "Server is running smoothly",
        timestamp: new Date(),
    };
    res.json(serverStatus);
});
