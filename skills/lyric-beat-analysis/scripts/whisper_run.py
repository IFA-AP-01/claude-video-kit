"""Whisper transcription of the vocal stem with word timestamps -> work/whisper.json.

Used only as an independent cross-check for the forced alignment (align.py): it decides
per-word confidence, re-aligns lines the CTC pass got wrong and finds sung ad-libs that
are not on the lyric sheet. Backend: mlx-whisper on Apple Silicon, openai-whisper elsewhere.
"""
import json

from common import CONFIG, STEMS, WORK


def transcribe(path):
    opts = dict(word_timestamps=True, temperature=0.0, language=CONFIG["language"] or None,
                initial_prompt=CONFIG["whisper_prompt"] or None, condition_on_previous_text=False)
    try:
        import mlx_whisper
        model = CONFIG["whisper_model"] or "mlx-community/whisper-large-v3-turbo"
        return mlx_whisper.transcribe(path, path_or_hf_repo=model, **opts)
    except ImportError:
        import whisper
        model = whisper.load_model(CONFIG["whisper_model"] or "large-v3-turbo")
        return model.transcribe(path, **opts)


def main():
    out = WORK / "whisper.json"
    if out.exists():
        print("whisper cached")
        return
    r = transcribe(str(STEMS / "vocals.wav"))
    words = [{"w": w["word"].strip(), "start": w["start"], "end": w["end"],
              "p": w.get("probability", 0)}
             for seg in r["segments"] for w in seg.get("words", [])]
    out.write_text(json.dumps({"text": r["text"], "words": words}, indent=1, ensure_ascii=False))
    print(f"{len(words)} whisper words")


if __name__ == "__main__":
    main()
