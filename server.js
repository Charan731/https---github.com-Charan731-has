require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;
const RAZORPAY_SECRET = process.env.RAZORPAY_SECRET;

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Define Schema & Model
const balanceSchema = new mongoose.Schema({ amount: { type: Number, default: 0 } });
const Balance = mongoose.model("data", balanceSchema); // Using your collection name "data"

app.use(cors());
app.use(bodyParser.json());

// API: Fetch Balance
app.get("/get-balance", async (req, res) => {
    try {
        let balanceData = await Balance.findOne();
        if (!balanceData) balanceData = await Balance.create({ amount: 0 });
        res.json({ success: true, balance: balanceData.amount });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching balance" });
    }
});

// API: Razorpay Webhook
app.post("/razorpay-webhook", async (req, res) => {
    const receivedSignature = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto.createHmac("sha256", RAZORPAY_SECRET)
        .update(JSON.stringify(req.body))
        .digest("hex");

    if (receivedSignature !== expectedSignature) {
        return res.status(400).json({ success: false, message: "Invalid Signature" });
    }

    if (req.body.event === "payment.captured") {
        try {
            let balanceData = await Balance.findOne();
            if (!balanceData) balanceData = await Balance.create({ amount: 0 });

            // Increase balance by 1
            balanceData.amount += 1;
            await balanceData.save();

            res.json({ success: true, message: "Balance updated" });
        } catch (err) {
            res.status(500).json({ success: false, message: "Error updating balance" });
        }
    } else {
        res.json({ success: false, message: "Payment not captured" });
    }
});

// Start Server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
