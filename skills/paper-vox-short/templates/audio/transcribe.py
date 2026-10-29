"""Word-timestamped Whisper transcript of one audio file (CPU, int8) -> JSON. Used by splice.py.

    analysis/.venv/bin/python audio/transcribe.py <audio> <out.json>
"""
import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel, decode_audio

ROOT = Path(__file__).resolve().parent.parent
CONFIG = json.loads((ROOT / "analysis/config.json").read_text())


def main():
    src, out = sys.argv[1], Path(sys.argv[2])
    audio = decode_audio(src, sampling_rate=16000)
    model = WhisperModel(CONFIG["whisper_model"] or "large-v3-turbo", device="cpu", compute_type="int8",
                         cpu_threads=CONFIG.get("threads", 4), num_workers=1)
    segs, _ = model.transcribe(audio, language="vi", word_timestamps=True, temperature=0.0, beam_size=5,
                               vad_filter=False, initial_prompt=CONFIG["whisper_prompt"] or None,
                               condition_on_previous_text=False)
    words = []
    for seg in segs:
        print(f"  {seg.start:6.2f}-{seg.end:6.2f} {seg.text.strip()}")
        words += [{"w": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "p": round(w.probability, 3)}
                  for w in (seg.words or [])]
    out.write_text(json.dumps({"src": src, "dur": len(audio) / 16000, "words": words}, ensure_ascii=False, indent=1))
    print(f"{len(words)} words -> {out}")


if __name__ == "__main__":
    main()
