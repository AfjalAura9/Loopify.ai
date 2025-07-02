from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from utils import (
    extract_youtube_captions,
    download_youtube_video,
    transcribe_audio,
    extract_key_lines,
    clip_video_segments,
    overlay_captions_on_video,
    video_to_gif_base64,
    is_valid_video,
)
import tempfile
import os
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://vercel.com/afjalaura9s-projects/loopify-ai"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process/")
async def process(
    prompt: str = Form(...),
    youtube_url: str = Form(""),
    file: UploadFile = File(None),
    get_lines_only: str = Form(""),
    selected_line_idx: str = Form(""),
):
    try:
        video_path = None
        transcript = None

        if youtube_url:
            transcript = extract_youtube_captions(youtube_url)
            video_path = download_youtube_video(youtube_url)
            if not is_valid_video(video_path):
                return {"error": "The downloaded video is blank, corrupted, or has no video frames. Please try another video."}
            if not transcript:
                transcript = transcribe_audio(video_path)
        elif file:
            suffix = os.path.splitext(file.filename)[-1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                shutil.copyfileobj(file.file, tmp)
                video_path = tmp.name
            if not is_valid_video(video_path):
                return {"error": "The uploaded video is blank, corrupted, or has no video frames. Please try another video."}
            transcript = transcribe_audio(video_path)
        else:
            return {"error": "No video provided."}

        if not transcript:
            return {"error": "No Relavant lines found."}

        key_lines = extract_key_lines(transcript, prompt, num_lines=5)
        if not key_lines:
            return {"error": "No relevant lines found."}

        # If only lines are requested, return them (for selection in UI)
        if get_lines_only == "true":
            return {"lines": [l['text'] for l in key_lines]}

        # If a line is selected, only process that one
        if selected_line_idx and selected_line_idx.isdigit():
            idx = int(selected_line_idx)
            if idx < 0 or idx >= len(key_lines):
                return {"error": "Invalid line selection."}
            key_lines = [key_lines[idx]]

        gif_b64s = []
        for idx, line in enumerate(key_lines):
            segment_path = clip_video_segments(video_path, line['start'], line['end'], idx)
            if not segment_path:
                continue
            captioned_path = overlay_captions_on_video(segment_path, line['text'], idx)
            gif_b64 = video_to_gif_base64(captioned_path, idx)
            gif_b64s.append(gif_b64)

        if not gif_b64s:
            return {"error": "No valid GIFs could be generated from this video."}

        return {
            "gifs": gif_b64s
        }
    except Exception as e:
        return {"error": str(e)}