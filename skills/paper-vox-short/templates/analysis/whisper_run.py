"""Whisper transcription of the narration with word timestamps -> work/whisper.json.

Used only as an independent cross-check for the forced alignment (align.py): it decides
per-word confidence and re-aligns lines the CTC pass got wrong.
Backend: faster-whisper (CTranslate2, int8) on the CPU only — this Mac hard-rebooted once
from GPU (MPS) inference, so no mlx/MPS here.

    .venv/bin/python whisper_run.py [--seconds N]   # N > 0: test on the first N s only
"""
import argparse
import json

from common import CONFIG, STEMS, WORK


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seconds", type=float, default=0)
    a = ap.parse_args()
    out = WORK / ("whisper.json" if not a.seconds else "whisper_test.json")
    if out.exists() and not a.seconds:
        print("whisper cached")
        return
    from faster_whisper import WhisperModel, decode_audio
    audio = decode_audio(str(STEMS / "vocals.wav"), sampling_rate=16000)
    if a.seconds:
        audio = audio[: int(a.seconds * 16000)]
    model = WhisperModel(CONFIG["whisper_model"] or "large-v3-turbo", device="cpu",
                         compute_type="int8", cpu_threads=CONFIG.get("threads", 4), num_workers=1)
    segs, _ = model.transcribe(audio, language=CONFIG["language"] or None, word_timestamps=True,
                               temperature=0.0, beam_size=5, vad_filter=False,
                               initial_prompt=CONFIG["whisper_prompt"] or None,
                               condition_on_previous_text=False)
    words, text = [], []
    for seg in segs:
        text.append(seg.text)
        print(f"  {seg.start:6.1f}s {seg.text.strip()[:70]}")
        words += [{"w": w.word.strip(), "start": w.start, "end": w.end, "p": w.probability}
                  for w in (seg.words or [])]
    out.write_text(json.dumps({"text": "".join(text), "words": words}, indent=1, ensure_ascii=False))
    print(f"{len(words)} whisper words -> {out.name}")


if __name__ == "__main__":
    main()
