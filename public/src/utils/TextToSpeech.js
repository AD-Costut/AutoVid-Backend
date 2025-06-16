require("dotenv").config();
const axios = require("axios");

async function textToSpeech(scriptText, voiceChoice) {
  try {
    console.log("Sending script to Google Cloud TTS API...");

    const apiKey = process.env.GOOGLE_TEXT_TO_SPEECH_API;
    if (!apiKey)
      throw new Error("Missing GOOGLE_TEXT_TO_SPEECH_API in environment");

    const ttsRes = await axios.post(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        input: { text: scriptText },
        voice: {
          languageCode: voiceChoice.split("-").slice(0, 2).join("-"),
          name: voiceChoice,
        },
        audioConfig: { audioEncoding: "MP3" },
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const base64Audio = ttsRes.data?.audioContent;

    if (!base64Audio) {
      throw new Error("Google TTS response missing audioContent");
    }

    return base64Audio;
  } catch (err) {
    console.error("Google TTS API error:", err.response?.data || err.message);
    throw new Error("Google TTS generation failed: " + err.message);
  }
}

module.exports = { textToSpeech };
