"""
Main CLI entrypoint for Python Worker.
Provides subcommands: scenes, transcribe, silence, photo.
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
from app.photo.analyzer import analyze_photo
from app.photo.processor import process_photo

def main():
    parser = argparse.ArgumentParser(description="Studio Python Worker CLI")
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

    # Subcommand: photo (supports JPG, PNG, WEBP, HEIC, HEIF)
    photo_parser = subparsers.add_parser("photo", help="Generate browser-friendly JPG preview for photo and normalize rotation")
    photo_parser.add_argument("--input", required=True, help="Input photo file path")
    photo_parser.add_argument("--output", required=True, help="Output JPG preview path")

    # Subcommand: photo-analyze
    analyze_parser = subparsers.add_parser("photo-analyze", help="Analyze photo dimensions, brightness, contrast, blur, and faces")
    analyze_parser.add_argument("--input", required=True, help="Input photo file path")

    # Subcommand: photo-edit
    edit_parser = subparsers.add_parser("photo-edit", help="Execute photo editing plan (crop, filters, adjustments, background, logo)")
    edit_parser.add_argument("--input", required=True, help="Input photo file path")
    edit_parser.add_argument("--output", required=True, help="Output edited image file path")
    edit_parser.add_argument("--plan", required=True, help="Editing plan JSON string or path to JSON file")
    edit_parser.add_argument("--logo", default=None, help="Path to brand logo image")

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

        elif args.command == "photo-analyze":
            result = analyze_photo(args.input)
            print(json.dumps({"success": True, "data": result}))
            sys.exit(0)

        elif args.command == "photo-edit":
            plan_data = {}
            if os.path.exists(args.plan):
                with open(args.plan, "r", encoding="utf-8") as f:
                    plan_data = json.load(f)
            else:
                plan_data = json.loads(args.plan)

            result = process_photo(
                input_path=args.input,
                output_path=args.output,
                plan=plan_data,
                brand_logo_path=args.logo
            )
            print(json.dumps({"success": True, "data": result}))
            sys.exit(0)

        elif args.command == "photo":
            try:
                import pillow_heif
                pillow_heif.register_heif_opener()
            except ImportError:
                pass

            from PIL import Image, ImageOps
            with Image.open(args.input) as im:
                # Transpose image based on EXIF orientation so it is upright
                im = ImageOps.exif_transpose(im)
                if im.mode not in ("RGB", "L"):
                    im = im.convert("RGB")
                os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
                im.save(args.output, "JPEG", quality=85, optimize=True)
                w, h = im.size

            print(json.dumps({"success": True, "data": {"width": w, "height": h}}))
            sys.exit(0)

    except Exception as e:
        sys.stderr.write(f"Worker Error: {str(e)}\n")
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
