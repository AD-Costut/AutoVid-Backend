const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const { clearDirectory } = require("./ClearDirectory");

const uploadQuizDir = path.join(__dirname, "../uploads");
const videosDir = path.join(__dirname, "../videos");
const audiosDir = path.join(__dirname, "../audios");
const subtitlesDir = path.join(__dirname, "../subtitles");

[uploadQuizDir, videosDir, audiosDir, subtitlesDir].forEach((dir) => {
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
      "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080";
  } else if (aspectRatio === "9:16") {
    scaleCropFilter =
      "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920";
  } else {
    scaleCropFilter = "scale=iw:ih";
  }

  return `${scaleCropFilter},subtitles=${safeSubtitlePath}:force_style='PrimaryColour=&H0000FFFF,Bold=1,MarginV=50,FontName=Arial,FontSize=24'`;
}

const generateQuizVideo = async (
  inputVideo,
  outputVideo,
  audioFile,
  subtitleFile,
  aspectRatio,
  videoStyle
) => {
  return new Promise(async (resolve, reject) => {
    if (videoStyle === "Quiz") {
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

          clearDirectory(uploadQuizDir);
          // clearDirectory(audiosDir);
          //   clearDirectory(subtitlesDir);

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
  uploadQuizDir,
  videosDir,
  audiosDir,
  subtitlesDir,
  getVideoFilter,
  generateQuizVideo,
  saveFile,
};
