const dotenv = require("dotenv");
dotenv.config({path:"../"});
const cloudinary = require("cloudinary").v2;

const CloudinaryDB = process.env.CLOUD_NAME;
const CloudinaryAPIKey = process.env.API_KEY;
const CloudinarySecret = process.env.API_SECRET;

cloudinary.config({
    cloud_name: CloudinaryDB,
    api_key: CloudinaryAPIKey,
    api_secret: CloudinarySecret,
    secure: true,
});


