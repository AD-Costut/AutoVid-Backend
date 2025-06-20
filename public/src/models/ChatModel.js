const mongoose = require("mongoose");

const GeneratedChatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userMessage: String,
  voiceChoice: String,
  videoStyle: String,
  scriptType: String,
  fileName: String,
  videoUrl: String,
  competedLabel: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Chat", GeneratedChatHistorySchema);
