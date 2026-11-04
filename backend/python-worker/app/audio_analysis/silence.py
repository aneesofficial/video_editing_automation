"""
Audio Silence Detection Module.
Detects silence intervals for smart jump-cut and dead-air removal.
"""

import sys
import json
import re
import subprocess
from typing import List, Dict, Any

def detect_silence(
    media_path: str,
    ffmpeg_bin: str = "ffmpeg",
    noise_threshold_db: float = -30.0,
    min_silence_duration_sec: float = 0.5
) -> List[Dict[str, Any]]:
    """
    Detects periods of silence using FFmpeg silencedetect filter.
    Returns list of silence intervals:
    [
        {"start": 1.2, "end": 2.5, "duration": 1.3},
        ...
    ]
    """
    cmd = [
        ffmpeg_bin,
        "-i", media_path,
        "-af", f"silencedetect=noise={noise_threshold_db}dB:d={min_silence_duration_sec}",
        "-f", "null",
        "-"
    ]
    
    try:
        process = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False
        )
        
        stderr_output = process.stderr
        silence_intervals: List[Dict[str, Any]] = []
        
        # Regex patterns for FFmpeg silencedetect output:
        # [silencedetect @ ...] silence_start: 1.24
        # [silencedetect @ ...] silence_end: 2.89 | silence_duration: 1.65
        start_pattern = re.compile(r"silence_start:\s*([0-9.]+)")
        end_pattern = re.compile(r"silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)")
        
        current_start = None
        
        for line in stderr_output.splitlines():
            s_match = start_pattern.search(line)
            if s_match:
                current_start = float(s_match.group(1))
                continue
                
            e_match = end_pattern.search(line)
            if e_match and current_start is not None:
                end_time = float(e_match.group(1))
                duration = float(e_match.group(2))
                silence_intervals.append({
                    "start": round(current_start, 3),
                    "end": round(end_time, 3),
                    "duration": round(duration, 3)
                })
                current_start = None
                
        return silence_intervals
    except Exception as e:
        sys.stderr.write(f"Error detecting silence: {str(e)}\n")
        return []

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Media path argument required"}))
        sys.exit(1)
        
    ffmpeg_exec = sys.argv[2] if len(sys.argv) > 2 else "ffmpeg"
    res = detect_silence(sys.argv[1], ffmpeg_bin=ffmpeg_exec)
    print(json.dumps(res))

