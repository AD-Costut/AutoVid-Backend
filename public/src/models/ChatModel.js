const mongoose = require("mongoose");

const GeneratedChatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  userMessage: String,
  aspectRatio: String,
  voiceChoice: String,
  fileName: String,
  videoStyle: String,
  scriptType: String,
  completedLabel: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  videoUrl: String,
});

module.exports = mongoose.model("Chat", GeneratedChatHistorySchema);
