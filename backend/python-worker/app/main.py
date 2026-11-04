"""
Main CLI entrypoint for Python Worker.
Provides subcommands: scenes, transcribe, silence.
Outputs clean JSON to stdout.
"""

import os
import sys

# Ensure python-worker directory is in sys.path
worker_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if worker_dir not in sys.path:
    sys.path.insert(0, worker_dir)

import argparse
import json
from app.scene_detection.detector import detect_scenes
from app.transcription.transcriber import transcribe_audio
from app.audio_analysis.silence import detect_silence

def main():
    parser = argparse.ArgumentParser(description="NovaCut Python Worker CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Subcommand: scenes
    scenes_parser = subparsers.add_parser("scenes", help="Detect scenes in video")
    scenes_parser.add_argument("--input", required=True, help="Input video file path")
    scenes_parser.add_argument("--threshold", type=float, default=27.0, help="Cut detection threshold")
    scenes_parser.add_argument("--min-len", type=float, default=1.0, help="Minimum scene length in seconds")

    # Subcommand: transcribe
    transcribe_parser = subparsers.add_parser("transcribe", help="Transcribe speech in media file")
    transcribe_parser.add_argument("--input", required=True, help="Input video/audio file path")
    transcribe_parser.add_argument("--model", default="tiny", help="Whisper model name (e.g. tiny, base)")
    transcribe_parser.add_argument("--language", default=None, help="Transcription language")

    # Subcommand: silence
    silence_parser = subparsers.add_parser("silence", help="Detect silence intervals")
    silence_parser.add_argument("--input", required=True, help="Input media file path")
    silence_parser.add_argument("--ffmpeg", default="ffmpeg", help="Path to ffmpeg executable")
    silence_parser.add_argument("--threshold", type=float, default=-30.0, help="Noise threshold in dB")
    silence_parser.add_argument("--min-duration", type=float, default=0.5, help="Min silence duration in seconds")

    args = parser.parse_args()

    try:
        if args.command == "scenes":
            result = detect_scenes(args.input, threshold=args.threshold, min_scene_len_sec=args.min_len)
            print(json.dumps({"success": True, "data": result}))
            sys.exit(0)

        elif args.command == "transcribe":
            result = transcribe_audio(args.input, model_size=args.model, language=args.language)
            print(json.dumps({"success": True, "data": result}))
            sys.exit(0)

        elif args.command == "silence":
            result = detect_silence(
                args.input,
                ffmpeg_bin=args.ffmpeg,
                noise_threshold_db=args.threshold,
                min_silence_duration_sec=args.min_duration
            )
            print(json.dumps({"success": True, "data": result}))
            sys.exit(0)

    except Exception as e:
        sys.stderr.write(f"Worker Error: {str(e)}\n")
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
