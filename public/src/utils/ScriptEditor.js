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
  const rawContent =
    data.choices?.[0]?.message?.content ||
    data.generated_text ||
    data.response ||
    "";

  const match = rawContent.match(/##\s*([\s\S]*?)\s*##/);

  let content;

  if (match) {
    content = match[1].trim();
  } else {
    if (rawContent.trim().startsWith("##")) {
      content = rawContent.replace(/^##\s*/, "").trim();
    } else {
      content = rawContent.trim();
    }
  }

  if (content.length > 5000) {
    content = content.slice(0, 4999);
  }

  return content;
}

module.exports = {
  extractContent,
  sendMessageToAi,
};
