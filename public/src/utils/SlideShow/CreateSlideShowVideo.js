const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const uploadSlideShowDir = path.join(__dirname, "../../uploadsFromAPIs");
const videosDir = path.join(__dirname, "../../videos");
const audiosDir = path.join(__dirname, "../../audios");
const subtitlesDir = path.join(__dirname, "../../subtitles");
const { clearDirectory } = require("../../utils/ClearDirectory");

[uploadSlideShowDir, videosDir, audiosDir, subtitlesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const normalizeVideoToXSec = (inputPath, outputPath, interval = 6) => {
  return new Promise((resolve, reject) => {
    const ffmpegArgs = [
      "-y",
      "-stream_loop",
      "-1",
      "-i",
      inputPath,
      "-t",
      `${interval}`,
      "-vf",
      "fps=30",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs);

    ffmpeg.stderr.on("data", (data) =>
      console.error(`Normalize stderr: ${data}`)
    );
    ffmpeg.on("close", (code) => {
      code === 0
        ? resolve()
        : reject(new Error(`Normalization failed for ${inputPath}`));
    });
  });
};

const processAndNormalizeVideos = async (
  inputFolder,
  tempFolder,
  interval = 6
) => {
  if (!fs.existsSync(tempFolder)) {
    fs.mkdirSync(tempFolder, { recursive: true });
  }

  const files = fs
    .readdirSync(inputFolder)
    .filter((f) => /\.(mp4|mov|mkv|webm)$/i.test(f));

  const jobs = files.map(async (file, idx) => {
    const inputPath = path.join(inputFolder, file);
    const outputPath = path.join(tempFolder, `clip${idx}.mp4`);
    await normalizeVideoToXSec(inputPath, outputPath, interval);
  });

  await Promise.all(jobs);
};

function getVideoFilter(aspectRatio, subtitlePath) {
  let safeSubtitlePath = subtitlePath.replace(/\\/g, "/");
  safeSubtitlePath = safeSubtitlePath.replace(/:/g, "\\:");
  safeSubtitlePath = `'${safeSubtitlePath}'`;

  let scalePadFilter;
  if (aspectRatio === "16:9") {
    scalePadFilter = `scale='if(gt(a,16/9),1920,-2)':'if(gt(a,16/9),-2,1080)',pad=1920:1080:(ow-iw)/2:(oh-ih)/2`;
  } else if (aspectRatio === "9:16") {
    scalePadFilter = `scale='if(gt(a,9/16),1080,-2)':'if(gt(a,9/16),-2,1920)',pad=1080:1920:(ow-iw)/2:(oh-ih)/2`;
  } else {
    scalePadFilter = "scale=iw:ih";
  }

  return `${scalePadFilter},subtitles=filename=${safeSubtitlePath}:force_style='PrimaryColour=&H0000FFFF,Bold=1,MarginV=50,FontName=Arial,FontSize=24'`;
}

const concatVideos = async (inputFolder, tempConcatFile) => {
  const files = fs
    .readdirSync(inputFolder)
    .filter((f) => /\.(mp4|mov|mkv|webm)$/i.test(f))
    .sort();

  if (files.length === 0)
    throw new Error("No video clips found for slideshow.");

  const listPath = path.join(inputFolder, "files.txt");
  fs.writeFileSync(
    listPath,
    files
      .map((f) => `file '${path.join(inputFolder, f).replace(/\\/g, "/")}'`)
      .join("\n")
  );

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      tempConcatFile,
    ]);

    ffmpeg.stderr.on("data", (data) => console.error(`Concat stderr: ${data}`));
    ffmpeg.on("close", (code) => {
      fs.unlinkSync(listPath);
      code === 0
        ? resolve()
        : reject(new Error(`Concat failed with code ${code}`));
    });
  });
};

const generateSlideShowVideo = async (
  inputPathOrVideo,
  outputVideo,
  audioFile,
  subtitleFile,
  aspectRatio,
  videoStyle
) => {
  return new Promise(async (resolve, reject) => {
    const ext = path.extname(inputPathOrVideo).toLowerCase();
    const isFolder = !ext;

    let finalInputVideo = inputPathOrVideo;

    if (videoStyle === "Slide Show") {
      try {
        const tempConcatFile = path.join(videosDir, "slideshow-temp.mp4");
        const tempFolder = path.join(videosDir, "tempClips");
        await processAndNormalizeVideos(inputPathOrVideo, tempFolder);
        await concatVideos(tempFolder, tempConcatFile);

        fs.rmSync(tempFolder, { recursive: true, force: true });

        finalInputVideo = tempConcatFile;
      } catch (err) {
        return reject(err);
      }
    }

    if (!fs.existsSync(finalInputVideo))
      return reject(new Error("Input video file not found"));
    if (!fs.existsSync(audioFile))
      return reject(new Error("Audio file not found"));
    if (!fs.existsSync(subtitleFile))
      return reject(new Error("Subtitle file not found"));

    const vfFilter = getVideoFilter(aspectRatio, subtitleFile);
    console.log(
      "FinalInputVideo:",
      finalInputVideo,
      "AudioFile:",
      audioFile,
      "VfFilter:",
      vfFilter
    );

    const ffmpegArgs = [
      "-i",
      finalInputVideo,
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
      "-y",
      outputVideo,
    ];

    const ffmpeg = spawn("ffmpeg", ffmpegArgs);

    ffmpeg.stderr.on("data", (data) => console.error(`FFmpeg stderr: ${data}`));
    ffmpeg.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ FFmpeg finished. Video at: ${outputVideo}`);

        clearDirectory(uploadSlideShowDir);
        // clearDirectory(audiosDir);
        clearDirectory(subtitlesDir);

        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });
};

const saveFile = (buffer, filePath) => {
  return fs.promises.writeFile(filePath, buffer);
};

module.exports = {
  uploadSlideShowDir,
  videosDir,
  audiosDir,
  subtitlesDir,
  getVideoFilter,
  generateSlideShowVideo,
  saveFile,
};
