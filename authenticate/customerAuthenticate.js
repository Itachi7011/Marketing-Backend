const jwt = require("jsonwebtoken");
const usersDB = require("../models/User");

const customerauthenticate = async (req, res, next) => {
    try {
        // 1. Get token from cookies
        const token = req.cookies.cookies1;
        if (!token) {
            throw new Error("No token provided");
        }

        // 2. Verify the token
        const verifyToken = jwt.verify(token, process.env.SECRET_KEY);

        // 3. Find user with matching ID and token in tokens array
        const rootUser = await usersDB.findOne({
            _id: verifyToken._id,
            "tokens.token": token  // Look for token in the tokens array
        });

        if (!rootUser) {
            throw new Error("User not found or token invalid");
        }

        // 4. Attach data to request
        req.token = token;
        req.rootUser = rootUser;
        req.userId = rootUser._id;

        next();
    } catch (err) {
        console.error(`Authentication error: ${err.message}`);
        res.status(401).json({
            success: false,
            message: "Unauthorized: Invalid or expired token"
        });
    }
};

module.exports = customerauthenticate;