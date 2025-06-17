import os
import sys
from faster_whisper import WhisperModel

model = WhisperModel("base")

audio_path = sys.argv[1]
segments, info = model.transcribe(audio_path, word_timestamps=True)

output_dir = os.path.join(os.path.dirname(__file__), "..", "subtitles")
os.makedirs(output_dir, exist_ok=True)

audio_filename = os.path.basename(audio_path)
srt_filename = os.path.splitext(audio_filename)[0] + ".srt"
srt_path = os.path.join(output_dir, srt_filename)

def format_time(t):
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int((t - int(t)) * 1000)
    return f"{h:02}:{m:02}:{s:02},{ms:03}"

with open(srt_path, "w", encoding="utf-8") as f:
    idx = 1
    for segment in segments:
        for word in segment.words:
            f.write(f"{idx}\n")
            f.write(f"{format_time(word.start)} --> {format_time(word.end)}\n")
            f.write(f"{word.word.strip()}\n\n")
            idx += 1

print(os.path.abspath(srt_path))
