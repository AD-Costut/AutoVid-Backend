const { analyzeEntitiesFromAiResponse } = require("./utils/ScriptEditor");

async function downloadMedia(url, outputPath) {
  const response = await axios.get(url, { responseType: "stream" });
  await fs.ensureDir(path.dirname(outputPath));
  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function searchAndDownloadMediaFromNlp(
  orderedEntities,
  inputDir,
  pexelsRatio = 0.6
) {
  const total = orderedEntities.length;
  const pexelsCount = Math.round(total * pexelsRatio);
  const giphyCount = total - pexelsCount;

  const shuffled = [...orderedEntities].sort(() => Math.random() - 0.5);
  const pexelsEntities = shuffled.slice(0, pexelsCount);
  const giphyEntities = shuffled.slice(pexelsCount);

  const sourceMap = new Map();
  pexelsEntities.forEach((e) => sourceMap.set(e.value, "pexels"));
  giphyEntities.forEach((e) => sourceMap.set(e.value, "giphy"));

  const mediaPaths = [];

  for (let i = 0; i < orderedEntities.length; i++) {
    const { value, type } = orderedEntities[i];

    const source = sourceMap.get(value);
    let mediaUrl = null;
    let fileExt = source === "pexels" ? "mp4" : "gif";
    let fileName = `${i}_${value.replace(/\s/g, "_")}.${fileExt}`;
    const outputPath = path.join(inputDir, fileName);

    try {
      if (source === "pexels") {
        const pexelsRes = await axios.get(
          "https://api.pexels.com/videos/search",
          {
            params: { query: value, per_page: 1 },
            headers: { Authorization: PEXELS_API_KEY },
          }
        );
        const videos = pexelsRes.data.videos;
        const mp4 = videos?.[0]?.video_files?.find(
          (f) => f.file_type === "video/mp4"
        );
        mediaUrl = mp4?.link;
      } else {
        const giphyRes = await axios.get(
          "https://api.giphy.com/v1/gifs/search",
          {
            params: { api_key: GIPHY_API_KEY, q: value, limit: 1 },
          }
        );
        mediaUrl = giphyRes.data.data?.[0]?.images?.original?.url;
      }

      if (mediaUrl) {
        console.log(
          `Downloading ${source.toUpperCase()} media for "${value}" to ${outputPath}`
        );
        await downloadMedia(mediaUrl, outputPath);
        mediaPaths.push({ entity: value, type, source, path: outputPath });
      } else {
        console.warn(`No media found for: ${value}`);
      }
    } catch (err) {
      console.error(
        `Failed to fetch media for "${value}" from ${source}:`,
        err.message
      );
    }
  }

  return mediaPaths;
}

async function processMessageAndDownloadMediaForSlideShow(message, outputDir) {
  const { orderedEntities } = analyzeEntitiesFromAiResponse(message);

  if (orderedEntities.length === 0) {
    console.log("No entities found in the message.");
    s;
    return [];
  }

  const mediaPaths = await searchAndDownloadMediaFromNlp(
    orderedEntities,
    outputDir
  );

  return mediaPaths;
}

module.exports = {
  processMessageAndDownloadMediaForSlideShow,
};
