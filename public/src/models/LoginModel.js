const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
  isGoogleUser: { type: Boolean, default: false },
  name: { type: String },
});

module.exports = mongoose.model("User", UserSchema);
