const express = require("express");
const app = express();
const server = require("http").createServer(app);
const cloudinary = require("cloudinary").v2;
const os = require("os");
const crypto = require('crypto');
const moment = require("moment");
const si = require("systeminformation");
const exec = require("child_process").exec;
const shortid = require("shortid");
const mongoose = require("mongoose");
const multer = require("multer");
const jsonwebtoken = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const cookieParser = require("cookie-parser");
const schedule = require("node-schedule");

app.use(cookieParser());

const dotenv = require("dotenv");
dotenv.config();

const cors = require("cors");
app.use(cors());

require("./config/connection_1");

// Congigurations

require("./config/cloudinary_config")

// const authenticate = require("./authenticate/customerAuthenticate");

const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));





// app.post("/api/auth/register", async (req, res)=>{
//     console.log(req.body)
// })


//      Routes

const authRoutes = require("./routes/auth");
app.use(authRoutes);

//      About Us Page Routes

const contactUsRoutes = require("./routes/contactUs");
app.use(contactUsRoutes);


















app.get("/api/uptime", async (req, res) => {
    const uptime = os.uptime();
    const uptimeString = moment.duration(uptime, "seconds").humanize();
    console.log(uptimeString);

    res.json({ uptime: uptimeString });
});

app.get("/api/system-status", async (req, res) => {
    try {
        const systemInfo = await si.system();
        const cpuInfo = await si.cpu();
        const memInfo = await si.mem();
        const diskLayout = await si.diskLayout();
        const networkInfo = await si.networkStats();

        const diskInfo = diskLayout.reduce(
            (acc, disk) => {
                if (typeof disk.size === "number") {
                    acc.total += disk.size;

                    acc.available += 0; // or some other default value
                }

                return acc;
            },
            { total: 0, available: 0 }
        );

        const diskUsed = diskInfo.total - diskInfo.available;

        const systemStatus = {
            system: {
                os: systemInfo.os,
                platform: systemInfo.platform,
                arch: systemInfo.arch,
                uptime: os.uptime(),
            },

            cpu: {
                manufacturer: cpuInfo.manufacturer,
                brand: cpuInfo.brand,
                model: cpuInfo.model,
                cores: cpuInfo.cores,
                speed: cpuInfo.speed,
                usage: cpuInfo.usage,
            },

            os: {
                platform: os.platform(),

                arch: os.arch(),

                release: os.release(),

                type: os.type(),

                hostname: os.hostname(),
            },

            memory: {
                total: memInfo.total,
                used: memInfo.used,
                active: memInfo.active,
                available: memInfo.available,
            },

            disk: {
                total: (diskInfo.total / 1024 / 1024 / 1024).toFixed(2) + " GB",

                used: (diskUsed / 1024 / 1024 / 1024).toFixed(2) + " GB",

                available: (diskInfo.available / 1024 / 1024 / 1024).toFixed(2) + " GB",
            },

            network: {
                rx: networkInfo[0].rx,
                tx: networkInfo[0].tx,
            },
        };
        console.log(systemStatus);

        res.json(systemStatus);

    } catch (error) {

        console.error(error);

        res.status(500).json({ error: "Failed to retrieve system status" });
    }
});

let isConnected = false;

mongoose.connection.once("open", () => {

    isConnected = true;

});

app.get("/api/db-status", (req, res) => {
    if (isConnected) {
        res.status(200).json({ message: "Connected" });
    } else {
        res.status(500).json({ message: "Not Connected" });
    }
});

app.get("/api/response-time", (req, res) => {
    const startTime = Date.now();

    // Simulate some work or database query

    setTimeout(() => {
        const endTime = Date.now();

        const responseTime = endTime - startTime;

        res.json({ responseTime: `${responseTime}ms` });
    }, 2000); // simulate 2 seconds of work
});



app.listen(PORT, () => {
    console.log("Server is running on : ", PORT);
});
