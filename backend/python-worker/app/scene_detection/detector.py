"""
Scene Detection Module using PySceneDetect.
Detects shot transitions, cuts, and scene boundaries.
"""

import sys
import json
from typing import List, Dict, Any
from scenedetect import open_video, SceneManager
from scenedetect.detectors import ContentDetector, AdaptiveDetector

def detect_scenes(video_path: str, threshold: float = 27.0, min_scene_len_sec: float = 1.0) -> List[Dict[str, Any]]:
    """
    Detects scene boundaries in a video file.
    Returns list of dicts:
    [
        {
            "scene_index": 0,
            "start_time": 0.0,
            "end_time": 4.5,
            "duration": 4.5,
            "cut_type": "cut",
            "score": 1.0
        },
        ...
    ]
    """
    try:
        video = open_video(video_path)
        fps = video.frame_rate
        total_duration = video.duration.get_seconds()
        
        scene_manager = SceneManager()
        # Add content detector
        min_scene_frames = int(min_scene_len_sec * fps)
        scene_manager.add_detector(ContentDetector(threshold=threshold, min_scene_len=min_scene_frames))
        
        scene_manager.detect_scenes(video, show_progress=False)
        scene_list = scene_manager.get_scene_list()
        
        scenes: List[Dict[str, Any]] = []
        
        if not scene_list:
            # If no cut transitions found (e.g. continuous clip), treat entire video as single scene
            scenes.append({
                "scene_index": 0,
                "start_time": 0.0,
                "end_time": round(total_duration, 3),
                "duration": round(total_duration, 3),
                "cut_type": "cut",
                "score": 1.0
            })
        else:
            for idx, (start_time, end_time) in enumerate(scene_list):
                s_sec = round(start_time.get_seconds(), 3)
                e_sec = round(end_time.get_seconds(), 3)
                scenes.append({
                    "scene_index": idx,
                    "start_time": s_sec,
                    "end_time": e_sec,
                    "duration": round(e_sec - s_sec, 3),
                    "cut_type": "cut",
                    "score": 1.0
                })
                
        return scenes
    except Exception as e:
        sys.stderr.write(f"Error detecting scenes: {str(e)}\n")
        raise e

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Video path argument required"}))
        sys.exit(1)
        
    res = detect_scenes(sys.argv[1])
    print(json.dumps(res))

