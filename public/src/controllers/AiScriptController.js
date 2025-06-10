const express = require("express");
const multer = require("multer");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const uploadDir = path.join(__dirname, "../uploads");
const videosDir = path.join(__dirname, "../videos");
const audiosDir = path.join(__dirname, "../audios");
const subtitlesDir = path.join(__dirname, "../subtitles");

[uploadDir, videosDir, audiosDir, subtitlesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

let currentProvider = "together";
let currentModel = "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo";

//       let currentProvider= "cerebras",
//       let currentModel= "Qwen/Qwen3-32B",

const providersConfig = {
  together: {
    url: "https://api.together.xyz/v1/chat/completions",
    apiKey: process.env.TOGETHER_API_KEY,
  },
  huggingface: {
    url: "https://api-inference.huggingface.co/models/Qwen/Qwen3-32B",
    apiKey: process.env.HUGGINGFACE_API_KEY,
  },
};

async function sendMessageToAi(message) {
  if (!(currentProvider in providersConfig)) {
    throw new Error("Unsupported provider");
  }

  const config = providersConfig[currentProvider];

  if (currentProvider === "together") {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: currentModel,
        messages: [{ role: "user", content: message }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Together API error: ${response.statusText}`);
    }

    const data = await response.json();
    return extractContent(data);
  }

  if (currentProvider === "huggingface") {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          text: message,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const data = await response.json();
    return extractContent(data);
  }
}

function extractContent(data) {
  return (
    data.choices?.[0]?.message?.content ||
    data.generated_text ||
    data.response ||
    ""
  ).trim();
}

function generateSRT(text, durationSec) {
  const words = text.split(/\s+/);
  const wordDuration = durationSec / words.length;
  let srt = "";
  let startTime = 0;

  words.forEach((word, i) => {
    const endTime = startTime + wordDuration;
    srt += `${i + 1}\n`;
    srt += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    srt += `${word}\n\n`;
    startTime = endTime;
  });

  return srt;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

const generateVideo = (inputVideo, outputVideo, audioFile, subtitleFile) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(inputVideo)) {
      return reject(new Error("Input video file not found"));
    }
    if (!fs.existsSync(audioFile)) {
      return reject(new Error("Audio file not found"));
    }
    if (!fs.existsSync(subtitleFile)) {
      return reject(new Error("Subtitle file not found"));
    }

    const safeSubtitlePath = subtitleFile
      .replace(/\\/g, "/")
      .replace(/:/g, "\\:");

    const ffmpeg = spawn("ffmpeg", [
      "-i",
      inputVideo,
      "-i",
      audioFile,
      "-vf",
      `subtitles=${safeSubtitlePath}`,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-shortest",
      outputVideo,
    ]);

    ffmpeg.stderr.on("data", (data) => console.error(`FFmpeg stderr: ${data}`));

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ FFmpeg finished. Video at: ${outputVideo}`);
        resolve();
      } else {
        console.error(`❌ FFmpeg exited with code ${code}`);
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
};

const saveFile = (buffer, filePath) => {
  return fs.promises.writeFile(filePath, buffer);
};

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
 *               videoFormat:
 *                 type: string
 *                 description: Optional video format (e.g., mp4).
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
  const {
    message,
    videoFormat = "16:9",
    voiceChoice = "en_us_001",
    videoStyle,
    scriptType,
  } = req.body;
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
      console.log("Sending script to TTS API...");
      const ttsRes = await axios.post(
        "https://tiktok-tts.weilnet.workers.dev/api/generation",
        { text: scriptText, voice: voiceChoice },
        { headers: { "Content-Type": "application/json" } }
      );
      base64Audio = ttsRes.data?.data;

      if (!base64Audio) throw new Error("TTS response missing audio data");
    } catch (err) {
      console.error("TTS API error:", err.response?.data || err.message);
      return res
        .status(500)
        .json({ error: "TTS generation failed", details: err.message });
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

      const outputFileName = `output_${Date.now()}.${videoFormat}`;
      const outputFilePath = path.join(videosDir, outputFileName);

      try {
        console.log("Generating final video with FFmpeg...");
        await generateVideo(
          inputFilePath,
          outputFilePath,
          audioFilePath,
          srtFilePath
        );
        try {
          await generateVideo(
            inputFilePath,
            outputFilePath,
            audioFilePath,
            srtFilePath
          );
        } catch (err) {
          return res
            .status(500)
            .json({ error: "Video generation failed", details: err.message });
        }

        if (!fs.existsSync(outputFilePath)) {
          console.error("Error: Video file was not created!");
        }
      } catch (err) {
        console.error("FFmpeg video generation error:", err);
        return res
          .status(500)
          .json({ error: "Video generation failed", details: err.message });
      }

      res.setHeader("Content-Type", `video/${videoFormat}`);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${outputFileName}"`
      );
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
