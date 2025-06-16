const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { clearDirectory } = require("../utils/ClearDirectory");

const uploadDir = path.join(__dirname, "../uploads");
const videosDir = path.join(__dirname, "../videos");
const audiosDir = path.join(__dirname, "../audios");
const subtitlesDir = path.join(__dirname, "../subtitles");

[uploadDir, videosDir, audiosDir, subtitlesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function getVideoFilter(aspectRatio, subtitlePath) {
  let safeSubtitlePath = subtitlePath.replace(/\\/g, "/");
  safeSubtitlePath = safeSubtitlePath.replace(/:/g, "\\:");

  safeSubtitlePath = `'${safeSubtitlePath}'`;

  let scaleCropFilter;
  if (aspectRatio === "16:9") {
    scaleCropFilter =
      "scale=1920:-2,crop=1920:1080:(in_w-1920)/2:(in_h-1080)/2";
  } else if (aspectRatio === "9:16") {
    scaleCropFilter =
      "scale=-2:1920,crop=1080:1920:(in_w-1080)/2:(in_h-1920)/2";
  } else {
    scaleCropFilter = "scale=iw:ih";
  }

  return `${scaleCropFilter},subtitles=${safeSubtitlePath}:force_style='PrimaryColour=&H0000FFFF,Bold=1,MarginV=50,FontName=Arial,FontSize=24'`;
}

const generateVideo = async (
  inputVideo,
  outputVideo,
  audioFile,
  subtitleFile,
  aspectRatio,
  videoStyle
) => {
  return new Promise(async (resolve, reject) => {
    if (videoStyle === "Reddit Story" || videoStyle === "Quiz") {
      if (!fs.existsSync(inputVideo)) {
        return reject(new Error("Input video file not found"));
      }
      if (!fs.existsSync(audioFile)) {
        return reject(new Error("Audio file not found"));
      }
      if (!fs.existsSync(subtitleFile)) {
        return reject(new Error("Subtitle file not found"));
      }

      console.log("srt file path before", subtitleFile);
      console.log("audifile path", audioFile);

      const vfFilter = getVideoFilter(aspectRatio, subtitleFile);
      console.log("srt file path:", subtitleFile);

      const ext = path.extname(inputVideo).toLowerCase();
      const isImage = [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

      const ffmpegArgs = isImage
        ? [
            "-loop",
            "1",
            "-i",
            inputVideo,
            "-i",
            audioFile,
            "-vf",
            vfFilter,
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-tune",
            "stillimage",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            "-f",
            "mp4",
            "-shortest",
            "-pix_fmt",
            "yuv420p",
            outputVideo,
          ]
        : [
            "-stream_loop",
            "-1",
            "-i",
            inputVideo,
            "-i",
            audioFile,
            "-vf",
            vfFilter,
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            "-f",
            "mp4",
            "-shortest",
            "-pix_fmt",
            "yuv420p",
            outputVideo,
          ];
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);

      ffmpeg.stderr.on("data", (data) =>
        console.error(`FFmpeg stderr: ${data}`)
      );

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          console.log(`✅ FFmpeg finished. Video at: ${outputVideo}`);

          clearDirectory(uploadDir);
          // clearDirectory(audiosDir);
          clearDirectory(subtitlesDir);

          resolve();
        } else {
          console.error(`❌ FFmpeg exited with code ${code}`);
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    } else {
      return reject(new Error(`Unsupported videoStyle: ${videoStyle}`));
    }
  });
};

const saveFile = (buffer, filePath) => {
  return fs.promises.writeFile(filePath, buffer);
};

module.exports = {
  uploadDir,
  videosDir,
  audiosDir,
  subtitlesDir,
  getVideoFilter,
  generateVideo,
  saveFile,
};
