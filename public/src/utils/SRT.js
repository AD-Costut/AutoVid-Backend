function generateSRT(text, durationSec) {
  const words = text.split(/\s+/);
  const wordDuration = (durationSec / words.length) * 3;
  let srt = "";
  let startTime = 0;

  words.forEach((word, i) => {
    const endTime = startTime + wordDuration;
    srt += `${i + 1}\n`;
    srt += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    srt += `${word}\n\n`;
    startTime = endTime;
  });

  return srt;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

module.exports = {
  generateSRT,
  formatTime,
};
