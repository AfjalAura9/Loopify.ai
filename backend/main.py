from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from utils import (
    extract_youtube_captions,
    download_youtube_video,
    transcribe_audio,
    extract_key_lines,
    is_valid_video,
    clip_video_segments,
    overlay_captions_on_video,
    video_to_gif_base64,
    is_valid_video,
)
import tempfile
import os
import shutil

os.environ["TEMP"] = r"D:\Projects\Persist_Venture_Assignment\persist_uploads"
os.environ["TMP"] = r"D:\Projects\Persist_Venture_Assignment\persist_uploads"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://loopify-ai.vercel.app/"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/process/")
async def process(
    prompt: str = Form(""),
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
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir="D:/Projects/Persist_Venture_Assignment/persist_uploads") as tmp:
                shutil.copyfileobj(file.file, tmp)
                video_path = tmp.name
            if not is_valid_video(video_path):
                return {"error": "The uploaded video is blank, corrupted, or has no video frames. Please try another video."}
            transcript = transcribe_audio(video_path)
        else:
            return {"error": "No video provided."}

        if not transcript or not isinstance(transcript, list) or len(transcript) == 0:
            return {"error": "No captions or audio transcript could be extracted from this video."}

        # --- SUGGESTIONS EXTRACTION ---
        if get_lines_only == "true":
            key_lines = extract_key_lines(transcript, prompt, num_lines=4, max_duration=3.0, max_chars=120)
            if not key_lines:
                return {"error": "No short, complete captions found in this video."}
            return {"lines": [l['text'] for l in key_lines]}

        # --- GIF GENERATION ---
        gifs = []
        if selected_line_idx:
            try:
                idx = int(selected_line_idx)
                # Find all short, complete lines
                key_lines = extract_key_lines(transcript, "", num_lines=100, max_duration=3.0, max_chars=120)
                if idx < 0 or idx >= len(key_lines):
                    return {"error": "Invalid suggestion selected."}
                line = key_lines[idx]
                # Use the exact start/end for this caption
                clip_path = clip_video_segments(video_path, line['start'], line['end'], 0)
                captioned_path = overlay_captions_on_video(clip_path, line['text'], 0)
                gif_b64 = video_to_gif_base64(captioned_path, 0)
                gifs.append(gif_b64)
            except Exception as e:
                return {"error": f"Failed to generate GIF: {e}"}
        else:
            # User entered a custom prompt: find the best-matching line(s) and generate GIF(s)
            key_lines = extract_key_lines(transcript, prompt, num_lines=3, max_duration=3.0, max_chars=120)
            if not key_lines:
                return {"error": "No relevant short, complete lines found for your prompt."}
            for i, line in enumerate(key_lines):
                try:
                    # Use the exact start/end for this caption
                    clip_path = clip_video_segments(video_path, line['start'], line['end'], i)
                    captioned_path = overlay_captions_on_video(clip_path, line['text'], i)
                    gif_b64 = video_to_gif_base64(captioned_path, i)
                    gifs.append(gif_b64)
                except Exception as e:
                    continue  # skip failed ones
            if not gifs:
                return {"error": "Failed to generate any GIFs."}
        return {"gifs": gifs}
    except Exception as e:
        return {"error": str(e)}
    finally:
        cleanup_persist_uploads()

import os
import shutil

def cleanup_persist_uploads():
    folder = r"D:\Projects\Persist_Venture_Assignment\persist_uploads"
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        try:
            if os.path.isfile(file_path):
                os.remove(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"Failed to delete {file_path}: {e}")