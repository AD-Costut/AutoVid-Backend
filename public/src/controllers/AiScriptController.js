const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const { textToSpeech } = require("../utils/TextToSpeech");

const { sendMessageToAi } = require("../utils/ScriptEditor");

const {
  uploadDir,
  generateSRT,
  generateVideo,
  saveFile,
} = require("../utils/VideoUtils");

/**
 * @swagger
 * /chat/completions:
 *   post:
 *     summary: Generate AI response and optionally process uploaded file to create video
 *     tags:
 *       - Chat
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The input message prompt for the AI.
 *                 example: Tell me a joke about JavaScript.
 *               aspectRatio:
 *                 type: string
 *                 description: Optional video ratio (e.g., 16:9).
 *                 example: 9:16
 *               voiceChoice:
 *                 type: string
 *                 description: Optional voice selection.
 *                 example: en_us_001
 *               videoStyle:
 *                 type: string
 *                 description: Optional video style (e.g., cinematic, slideshow).
 *                 example: Reddit Story
 *               scriptType:
 *                 type: string
 *                 description: Source of script.
 *                 enum:
 *                   - AI Script
 *                   - User Script
 *                 example: AI Script
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Optional file upload.
 *             required:
 *               - message
 *     responses:
 *       200:
 *         description: AI response and video generation success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: AI response text here.
 *                 videoPath:
 *                   type: string
 *                   example: "/videos/output.mp4"
 *       400:
 *         description: Missing message or invalid parameters
 *       500:
 *         description: Internal server error
 */

router.post("/completions", upload.single("file"), async (req, res) => {
  const { message, aspectRatio, voiceChoice, videoStyle, scriptType } =
    req.body;
  const file = req.file;
  debugger;

  if (!message) return res.status(400).json({ error: "Message is required" });

  console.log("Received videoStyle:", videoStyle);
  console.log("Received scriptType:", scriptType);

  try {
    let scriptText = "";

    try {
      if (scriptType === "AI Script") {
        console.log("Generating script via AI...");
        scriptText = await sendMessageToAi(message);
        if (videoStyle === "Slide Show") {
          analyzeEntitiesFromAiResponse(scriptText);
        }
        console.log("AI-generated script:", scriptText);
      } else if (scriptType === "User Script") {
        scriptText = message;
        if (videoStyle === "Slide Show") {
          analyzeEntitiesFromAiResponse(scriptText);
        }
        console.log("Using user-provided script.");
      } else {
        return res.status(400).json({ error: "Invalid scriptType" });
      }
    } catch (err) {
      console.error("Error generating scriptText:", err);
      return res
        .status(500)
        .json({ error: "Script generation failed", details: err.message });
    }

    let base64Audio;
    try {
      base64Audio = await textToSpeech(scriptText, voiceChoice);
    } catch (err) {
      return res.status(500).json({
        error: "TTS generation failed",
        details: err.message,
      });
    }

    const audioBuffer = Buffer.from(base64Audio, "base64");
    const audioFileName = `speech_${uuidv4()}.mp3`;
    const audioFilePath = path.join(__dirname, "../audios", audioFileName);
    fs.writeFileSync(audioFilePath, audioBuffer);
    console.log("Audio file saved at:", audioFilePath);

    const srtContent = generateSRT(scriptText, 5);
    const srtFileName = audioFileName.replace(".mp3", ".srt");
    const srtFilePath = path.join(__dirname, "../subtitles", srtFileName);
    fs.writeFileSync(srtFilePath, srtContent);
    console.log("Subtitle file saved at:", srtFilePath);

    if (file) {
      const inputFilePath = path.join(uploadDir, file.originalname);
      await saveFile(file.buffer, inputFilePath);
      console.log("Uploaded file saved at:", inputFilePath);

      const outputFileName = `output_${Date.now()}.mp4`;
      const outputFilePath = path.join(__dirname, "../videos", outputFileName);

      if (videoStyle === "Slide Show") {
        inputFilePath = path.join(slideShowDir, "your_slide_show_file.ext");
      }

      try {
        console.log("Generating final video with FFmpeg...");
        await generateVideo(
          inputFilePath,
          outputFilePath,
          audioFilePath,
          srtFilePath,
          aspectRatio,
          videoStyle
        );
      } catch (err) {
        console.error("FFmpeg video generation error:", err);
        return res
          .status(500)
          .json({ error: "Video generation failed", details: err.message });
      }

      const videoUrl = `/videos/${outputFileName}`;

      res.json({
        message: "Video generated successfully",
        videoUrl,
        audioUrl: `/audios/${audioFileName}`,
        srtUrl: `/subtitles/${srtFileName}`,
        videoStyle,
      });

      fs.createReadStream(outputFilePath).pipe(res);
    } else {
      res.json({
        response: scriptText,
        audioUrl: `/audios/${audioFileName}`,
        srtUrl: `/subtitles/${srtFileName}`,
        videoStyle,
      });
    }
  } catch (error) {
    console.error("Unexpected error in /completions:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

module.exports = router;
