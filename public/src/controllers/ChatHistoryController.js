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

/**
 * @swagger
 * components:
 *   schemas:
 *     GeneratedVideo:
 *       type: object
 *       properties:
 *         userId:
 *           type: string
 *           example: "64a8f2f2c9b1a5b123456789"
 *         userMessage:
 *           type: string
 *           example: "This is the user input message."
 *         voiceChoice:
 *           type: string
 *           example: "defaultVoice"
 *         videoStyle:
 *           type: string
 *           example: "defaultStyle"
 *         scriptType:
 *           type: string
 *           example: "defaultScript"
 *         fileName:
 *           type: string
 *           example: "video123.mp4"
 *         videoUrl:
 *           type: string
 *           example: "/videos/video123.mp4"
 *         completedLabel:
 *           type: string
 *           example: "User message snippet (01.06.25 14:30)"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-06-20T14:30:00Z"
 */

/**
 * @swagger
 * /api/chatHistory/{userId}:
 *   get:
 *     summary: Get all generated videos for a user
 *     tags: [GeneratedVideos]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the user
 *     responses:
 *       200:
 *         description: A list of videos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GeneratedVideo'
 *       500:
 *         description: Error fetching videos
 */

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const videos = await GeneratedChatHistorySchema.find({ userId }).sort({
      createdAt: -1,
    });
    res.status(200).json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to fetch videos" });
  }
});

/**
 * @swagger
 * /api/chatHistory/{id}:
 *   delete:
 *     summary: Delete a video by its ID
 *     tags:
 *       - Chat History
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The MongoDB ObjectId of the video to delete
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Video deleted successfully
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Video not found
 *       500:
 *         description: Failed to delete video due to server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Failed to delete video
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const deletedVideo = await GeneratedChatHistorySchema.findByIdAndDelete(id);
    if (!deletedVideo) {
      return res.status(404).json({ message: "Video not found" });
    }
    res.status(200).json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ error: "Failed to delete video" });
  }
});

module.exports = router;
