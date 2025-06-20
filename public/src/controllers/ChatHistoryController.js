const express = require("express");
const router = express.Router();
const GeneratedChatHistorySchema = require("../models/ChatModel");

/**
 * @swagger
 * /api/chatHistory:
 *   post:
 *     summary: Save a generated video record
 *     tags: [GeneratedVideos]
 *     requestBody:
 *       description: Data for a newly generated video to be saved
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 format: ObjectId
 *                 example: 64a8f2f2c9b1a5b123456789
 *               userMessage:
 *                 type: string
 *                 example: "This is the user input message."
 *               voiceChoice:
 *                 type: string
 *                 example: "defaultVoice"
 *               videoStyle:
 *                 type: string
 *                 example: "defaultStyle"
 *               scriptType:
 *                 type: string
 *                 example: "defaultScript"
 *               fileName:
 *                 type: string
 *                 example: "video123.mp4"
 *               videoUrl:
 *                 type: string
 *                 example: "/videos/video123.mp4"
 *               competedLabel:
 *                 type: string
 *                 example: "User message snippet (01.06.25 14:30)"
 *     responses:
 *       201:
 *         description: Video saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Video saved successfully"
 *                 video:
 *                   $ref: '#/components/schemas/GeneratedVideo'
 *       500:
 *         description: Failed to save video
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to save video"
 */

router.post("/", async (req, res) => {
  try {
    const {
      userId,
      userMessage,
      voiceChoice = "defaultVoice",
      videoStyle = "defaultStyle",
      scriptType = "defaultScript",
      fileName = "defaultFileName",
      videoUrl = "defaultUrl",
      completedLabel = "defaultLabel",
    } = req.body;

    const newVideo = new GeneratedChatHistorySchema({
      userId,
      userMessage,
      voiceChoice,
      videoStyle,
      scriptType,
      fileName,
      videoUrl,
      completedLabel,
    });

    await newVideo.save();

    res
      .status(201)
      .json({ message: "Video saved successfully", video: newVideo });
  } catch (error) {
    console.error("Error saving video:", error);
    res.status(500).json({ error: "Failed to save video" });
  }
});

module.exports = router;
