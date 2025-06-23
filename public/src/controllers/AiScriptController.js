const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const { textToSpeech } = require("../utils/TextToSpeech");

const { sendMessageToAi } = require("../utils/ScriptEditor");

const pythonScriptPath = path.join(__dirname, "..", "python", "Whisper.py");

const {
  generateSlideShowVideo,
  uploadSlideShowDir,
} = require("../utils/SlideShow/CreateSlideShowVideo");

const {
  generateQuizVideo,
  uploadQuizDir,
} = require("../utils/CreateQuizVideo");

const { authenticateToken } = require("../utils/MiddlewareAuth");

const {
  handleSlideShow,
} = require("../utils/SlideShow/DownloadSlideShowVideoResources");

const { generatePrompt } = require("../utils/PromptProcessor");

// const {
//   processMessageAndDownloadMediaForSlideShow,
// } = require("../utils/SlideShowVideoCreation");

const {
  uploadRedditDir,
  generateRedditVideo,
  saveFile,
} = require("../utils/CreateRedditVideo");
const { log } = require("console");

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 * /chat/completions:
 *   post:
 *     summary: Generate AI response and optionally process uploaded file to create video
 *     tags:
 *       - Chat
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - message
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
 *                 example: en-US-Wavenet-D
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

router.post(
  "/completions",
  authenticateToken,
  upload.single("file"),
  async (req, res) => {
    const {
      message,
      aspectRatio,
      voiceChoice,
      videoStyle,
      scriptType,
      completedLabel,
    } = req.body;
    const file = req.file;
    debugger;

    const Chat = require("../models/ChatModel");

    if (!message) return res.status(400).json({ error: "Message is required" });

    console.log("Received Image/Video:", file);
    console.log("Received message:", message);
    console.log("Received aspectRatio:", aspectRatio);
    console.log("Received voiceChoice:", voiceChoice);
    console.log("Received videoStyle:", videoStyle);
    console.log("Received scriptType:", scriptType);

    try {
      let scriptText = "";

      try {
        if (scriptType === "AI Script") {
          console.log("Generating script via AI...");
          promptForAi = generatePrompt(videoStyle, message);
          scriptText = await sendMessageToAi(promptForAi);
          console.log("AI-generated script:", scriptText);
        } else if (scriptType === "User Script") {
          scriptText = message;
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

      const command = `python "${pythonScriptPath}" "${audioFilePath}"`;
      const { stdout, stderr } = await execAsync(command);

      const srtGeneratedPath = stdout.trim();
      const srtFileName = audioFileName.replace(".mp3", ".srt");
      const srtFilePath = path.join(__dirname, "../subtitles", srtFileName);

      if (fs.existsSync(srtGeneratedPath)) {
        fs.renameSync(srtGeneratedPath, srtFilePath);
        console.log("Subtitle file moved to:", srtFilePath);
      } else {
        console.warn("Subtitle not found at:", srtGeneratedPath);
      }

      if (videoStyle === "Reddit Story") {
        if (file) {
          const inputFilePath = path.join(uploadRedditDir, file.originalname);
          await saveFile(file.buffer, inputFilePath);
          console.log("Uploaded file saved at:", inputFilePath);

          const outputFileName = `output_${Date.now()}.mp4`;
          const outputFilePath = path.join(
            __dirname,
            "../videos",
            outputFileName
          );
          try {
            console.log("Generating final video with FFmpeg...");
            await generateRedditVideo(
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
          await Chat.create({
            userId: req.user.id,
            userMessage: message,
            aspectRatio,
            voiceChoice,
            fileName: file?.originalname || "",
            videoStyle,
            scriptType,
            completedLabel,
            videoUrl,
            createdAt: new Date(),
          });

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
      } else if (videoStyle === "Slide Show") {
        await handleSlideShow(srtFilePath);
        const inputFilePath = path.join(uploadSlideShowDir);

        const outputFileName = `output_${Date.now()}.mp4`;
        const outputFilePath = path.join(
          __dirname,
          "../videos",
          outputFileName
        );
        try {
          console.log("Generating final video with FFmpeg...");
          await generateSlideShowVideo(
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
        await Chat.create({
          userId: req.user.id,
          userMessage: message,
          aspectRatio,
          voiceChoice,
          fileName: file?.originalname || "",
          videoStyle,
          scriptType,
          completedLabel,
          videoUrl,
          createdAt: new Date(),
        });

        res.json({
          message: "Video generated successfully",
          videoUrl,
          audioUrl: `/audios/${audioFileName}`,
          srtUrl: `/subtitles/${srtFileName}`,
          videoStyle,
        });

        fs.createReadStream(outputFilePath).pipe(res);
      } else if (videoStyle === "Quiz") {
        if (file) {
          const inputFilePath = path.join(uploadQuizDir, file.originalname);
          await saveFile(file.buffer, inputFilePath);
          console.log("Uploaded file saved at:", inputFilePath);

          const outputFileName = `output_${Date.now()}.mp4`;
          const outputFilePath = path.join(
            __dirname,
            "../videos",
            outputFileName
          );
          try {
            console.log("Generating final video with FFmpeg...");
            await generateQuizVideo(
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

          await Chat.create({
            userId: req.user.id,
            userMessage: message,
            aspectRatio,
            voiceChoice,
            fileName: file?.originalname || "",
            videoStyle,
            scriptType,
            completedLabel,
            videoUrl,
          });

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
  }
);

module.exports = router;
