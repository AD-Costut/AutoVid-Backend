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

const express = require("express");
const router = express.Router();

/**
 * @swagger
 * /chat/completions:
 *   post:
 *     summary: Get AI-generated response to a message
 *     description: Prompt to script generator
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Tell me a joke about JavaScript.
 *     responses:
 *       200:
 *         description: AI-generated response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 response:
 *                   type: string
 *                   example: Why did the developer go broke? Because he used up all his cache.
 *       400:
 *         description: Bad request (missing message)
 *       500:
 *         description: Server error
 */
router.post("/completions", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const aiResponse = await sendMessageToAi(message);
    res.json({ response: aiResponse });
  } catch (error) {
    console.error("Error in /completions route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
