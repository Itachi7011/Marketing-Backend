const mongoose = require("mongoose");
const mongodbaddr = process.env.mongodbAddress;

mongoose.set("strictQuery", false);
mongoose
  .connect(mongodbaddr)
  .then(() => {
    console.log("Connection With Database:1 is Successfull");
  })
  .catch((err) => {
    console.log(err);
  });
