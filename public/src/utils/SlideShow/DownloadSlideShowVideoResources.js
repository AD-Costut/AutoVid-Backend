const fs = require("fs");
const SrtParser = require("srt-parser-2").default;
const parser = new SrtParser();
const axios = require("axios");
const path = require("path");
const { execFileSync } = require("child_process");

function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== "string") {
    console.warn("timeToSeconds received invalid input:", timeStr);
    return 0;
  }

  const [hms, ms = "0"] = timeStr.replace(",", ".").split(".");
  const [hours, minutes, seconds] = hms.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseFloat("0." + ms);
}

function extractKeywords(text) {
  try {
    const nerScriptPath = path.join(__dirname, "..", "..", "python", "Ner.py");
    const result = execFileSync("python", [nerScriptPath, text], {
      encoding: "utf8",
    });
    const parsed = JSON.parse(result);
    return parsed.length ? [parsed[0]] : ["code"];
  } catch (err) {
    console.error("NER (SpaCy) failed:", err.message);
    return ["code"];
  }
}

function groupSubtitlesByInterval(captions, interval = 6) {
  const grouped = [];
  let currentGroup = [];
  let i = 0;

  while (
    i < captions.length &&
    (!captions[i].startTime || !captions[i].endTime)
  )
    i++;
  if (i === captions.length) return grouped;

  let startTime = timeToSeconds(captions[i].startTime);

  for (; i < captions.length; i++) {
    const caption = captions[i];
    if (!caption.startTime || !caption.endTime || !caption.text) continue;

    const endTime = timeToSeconds(caption.endTime);
    if (endTime - startTime <= interval) {
      currentGroup.push(caption.text);
    } else {
      grouped.push(currentGroup.join(" "));
      currentGroup = [caption.text];
      startTime = timeToSeconds(caption.startTime);
    }
  }

  if (currentGroup.length > 0) grouped.push(currentGroup.join(" "));
  return grouped;
}

async function handleSlideShow(srtFilePath) {
  const srtContent = fs.readFileSync(srtFilePath, "utf8");
  const captions = parser.fromSrt(srtContent);
  await processSrtAndSearch(captions);
}

async function processSrtAndSearch(captions) {
  const groupedSubtitles = groupSubtitlesByInterval(captions, 6);

  for (let i = 0; i < groupedSubtitles.length; i++) {
    const groupText = groupedSubtitles[i];
    const keywords = extractKeywords(groupText);
    const keyword = keywords[0];

    if (!keyword) {
      console.log(`No keyword found for text: "${groupText}"`);
      continue;
    }

    console.log("Keywords", keywords);
    const searchFn = i % 2 === 0 ? searchPexels : searchGiphy;
    const videoLink = await searchFn(keyword);

    if (videoLink) {
      console.log(
        `For group ${i}: "${groupText}" → "${keyword}" → ${videoLink}`
      );

      const uploadDir = path.join(__dirname, "..", "..", "uploadsFromAPIs");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `group_${i}_${keyword}.mp4`;
      await downloadAndSaveVideo(videoLink, uploadDir, fileName);
    } else {
      console.log(`No video found for "${keyword}" from ${searchFn.name}`);
    }
  }
}

async function searchPexels(keyword) {
  try {
    const res = await axios.get("https://api.pexels.com/videos/search", {
      headers: {
        Authorization:
          "ITBOWwq7c7ACADMbemh7sBVk5OesctXrVJmM9Kcwmo8Wia3Q4CnIpZ0a",
      },
      params: { query: keyword, per_page: 1 },
    });

    const video = res.data.videos?.[0];
    if (!video || !video.video_files) return null;

    let bestFile = null;
    let maxResolution = 0;

    for (const file of video.video_files) {
      if (file.link.includes(".com/video-files")) {
        const resolution = file.width * file.height;
        if (resolution > maxResolution) {
          bestFile = file;
          maxResolution = resolution;
        }
      }
    }

    return bestFile?.link || null;
  } catch (err) {
    console.warn(`Pexels search failed for "${keyword}":`, err.message);
    return null;
  }
}

async function searchGiphy(keyword) {
  try {
    const res = await axios.get("https://api.giphy.com/v1/gifs/search", {
      params: {
        api_key: "r5R5t7jAjCMvJvcnLaFC2m5FfhVfnEAB",
        q: keyword,
        limit: 1,
      },
    });

    const gif = res.data.data?.[0];
    if (!gif || !gif.images) return null;

    let bestMp4 = null;
    let maxResolution = 0;

    for (const key in gif.images) {
      const image = gif.images[key];
      if (image.mp4 && image.width && image.height) {
        const resolution = parseInt(image.width) * parseInt(image.height);
        if (resolution > maxResolution) {
          bestMp4 = image.mp4;
          maxResolution = resolution;
        }
      }
    }

    return bestMp4 || null;
  } catch (err) {
    console.warn(`Giphy search failed for "${keyword}":`, err.message);
    return null;
  }
}

async function downloadAndSaveVideo(videoUrl, saveDir, fileName) {
  try {
    const res = await axios.get(videoUrl, { responseType: "arraybuffer" });
    const filePath = path.join(saveDir, fileName);

    await fs.promises.writeFile(filePath, res.data);
    console.log("Downloaded and saved video to:", filePath);
    return filePath;
  } catch (err) {
    console.error("Error downloading video:", err.message);
    return null;
  }
}

module.exports = { handleSlideShow };
