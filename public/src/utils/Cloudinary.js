const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: "drycl4voz",
  api_key: "761527642911525",
  api_secret: "rPCecvIqbFC-_Zvan71vvmdgBCk",
});

module.exports = cloudinary;
