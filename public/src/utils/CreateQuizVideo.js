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

function reformatQuizSRT(inputSRTPath, outputSRTPath) {
  try {
    const srtContent = fs.readFileSync(inputSRTPath, "utf8");
    const blocks = parseSRTBlocks(srtContent);
    const questions = processBlocksIntoQuestions(blocks);
    const srtOutput = generateSRTOutput(questions);

    fs.writeFileSync(outputSRTPath, srtOutput);
    return outputSRTPath;
  } catch (err) {
    console.error("Error reformatting SRT:", err);
    return inputSRTPath;
  }
}

function parseSRTBlocks(srtContent) {
  const lines = srtContent.split("\n");
  const blocks = [];
  let currentBlock = { number: "", time: "", text: [] };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentBlock.text.length > 0) {
        blocks.push({
          number: currentBlock.number,
          time: currentBlock.time,
          text: currentBlock.text.join(" "),
        });
      }
      currentBlock = { number: "", time: "", text: [] };
      continue;
    }

    if (!currentBlock.number && /^\d+$/.test(trimmed)) {
      currentBlock.number = trimmed;
    } else if (!currentBlock.time && trimmed.includes("-->")) {
      currentBlock.time = trimmed;
    } else {
      currentBlock.text.push(trimmed);
    }
  }

  if (currentBlock.text.length > 0) {
    blocks.push({
      number: currentBlock.number,
      time: currentBlock.time,
      text: currentBlock.text.join(" "),
    });
  }

  return blocks;
}

function processBlocksIntoQuestions(blocks) {
  const questions = [];
  let currentQuestion = null;

  for (const block of blocks) {
    if (/^\d+\./.test(block.text)) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        number: block.number,
        time: block.time,
        question: block.text,
        answers: [],
        correctAnswer: null,
      };
    } else if (/^[A-Z]\)/.test(block.text)) {
      if (currentQuestion) {
        currentQuestion.answers.push({
          text: block.text,
          time: block.time,
        });
      }
    } else if (/^Correct answer/i.test(block.text)) {
      if (currentQuestion) {
        currentQuestion.correctAnswer = {
          text: block.text,
          time: block.time,
        };
        questions.push(currentQuestion);
        currentQuestion = null;
      }
    } else if (currentQuestion && currentQuestion.answers.length === 0) {
      currentQuestion.question += " " + block.text;
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions;
}

function generateSRTOutput(questions) {
  let output = "";
  let counter = 1;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const [startTime] = question.time.split(" --> ");

    let endTime;
    if (i < questions.length - 1) {
      const nextQuestionTime = questions[i + 1].time.split(" --> ")[0];
      endTime = nextQuestionTime;
    } else {
      endTime = question.correctAnswer
        ? question.correctAnswer.time.split(" --> ")[1]
        : question.time.split(" --> ")[1];
    }

    output += `${counter++}\n`;
    output += `${startTime} --> ${endTime}\n`;
    output += `${question.question}\n`;

    for (const answer of question.answers) {
      output += `${answer.text}\n`;
    }
    output += "\n";

    if (question.correctAnswer) {
      output += `${counter++}\n`;
      output += `${question.correctAnswer.time}\n`;
      output += `${question.correctAnswer.text}\n\n`;
    }
  }

  return output;
}

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
      try {
        const formattedSubtitleFile = path.join(
          path.dirname(subtitleFile),
          `formatted_${path.basename(subtitleFile)}`
        );
        const finalSubtitleFile = reformatQuizSRT(
          subtitleFile,
          formattedSubtitleFile
        );

        if (!fs.existsSync(inputVideo)) {
          return reject(new Error("Input video file not found"));
        }
        if (!fs.existsSync(audioFile)) {
          return reject(new Error("Audio file not found"));
        }
        if (!fs.existsSync(finalSubtitleFile)) {
          return reject(new Error("Subtitle file not found"));
        }

        const vfFilter = getVideoFilter(aspectRatio, finalSubtitleFile);
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
            clearDirectory(audiosDir);
            clearDirectory(subtitlesDir);

            resolve();
          } else {
            console.error(`❌ FFmpeg exited with code ${code}`);
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        });
      } catch (err) {
        reject(err);
      }
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
  reformatQuizSRT,
};
