// routes/auth.js - Authentication Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const MarketingUser = require('../models/User');
const crypto = require('crypto');
const nodemailer = require("nodemailer");

const dotenv = require("dotenv");
dotenv.config({ path: "../" });

const authenticate = require("../authenticate/customerAuthenticate");

const UsersDB = require("../models/User");


const EMAIL = process.env.EMAIL;
const PASSWORD = process.env.PASSWORD;

router.get("/api/userList", async (req, res) => {
  try {
    const data = await UsersDB.find({});
    console.log(data)
    res.send(data);
    // console.log(req.rootUser)
  } catch (err) {
    console.log(`Error during User's List -${err}`);
  }
})

;module.exports = router;