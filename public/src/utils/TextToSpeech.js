const axios = require("axios");

async function textToSpeech(scriptText, voiceChoice) {
  try {
    console.log("Sending script to TTS API...");
    const ttsRes = await axios.post(
      "https://tiktok-tts.weilnet.workers.dev/api/generation",
      { text: scriptText, voice: voiceChoice },
      { headers: { "Content-Type": "application/json" } }
    );

    const base64Audio = ttsRes.data?.data;

    if (!base64Audio) {
      throw new Error("TTS response missing audio data");
    }

    return base64Audio;
  } catch (err) {
    console.error("TTS API error:", err.response?.data || err.message);
    throw new Error("TTS generation failed: " + err.message);
  }
}

module.exports = { textToSpeech };
