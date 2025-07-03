import whisper
import base64
import yt_dlp
import tempfile
import os
import webvtt
import moviepy.editor as mp
import re

from moviepy.config import change_settings
change_settings({"IMAGEMAGICK_BINARY": r"C:\Program Files\ImageMagick-7.1.1-Q16-HDRI\magick.exe"})

def extract_youtube_captions(youtube_url):
    """
    Returns a transcript as a list of dicts: [{'text': ..., 'start': ..., 'end': ...}, ...]
    or None if not available.
    """
    out_dir = tempfile.mkdtemp()
    ydl_opts = {
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitlesformat': 'vtt',
        'subtitleslangs': ['en'],
        'outtmpl': os.path.join(out_dir, '%(id)s'),
        'quiet': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        subs = info.get('requested_subtitles')
        if not subs or 'en' not in subs:
            return None
        vtt_path = os.path.join(out_dir, f"{info['id']}.en.vtt")
        # Actually download the subtitle file
        ydl.download([youtube_url])
        if not os.path.exists(vtt_path):
            return None
        transcript = []
        for caption in webvtt.read(vtt_path):
            transcript.append({
                "text": caption.text,
                "start": float(caption.start_in_seconds),
                "end": float(caption.end_in_seconds)
            })
        return transcript

def download_youtube_video(youtube_url):
    import yt_dlp
    ydl_opts = {
        'outtmpl': r'D:/Projects/Persist_Venture_Assignment/persist_uploads/%(id)s.%(ext)s',
        'cachedir': r'D:/Projects/Persist_Venture_Assignment/persist_uploads',
        # ...other options... Suna Sunheri
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=True)
        return ydl.prepare_filename(info)
    out_dir = tempfile.mkdtemp()
    out_path = os.path.join(out_dir, "video.%(ext)s")
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        'outtmpl': out_path,
        'merge_output_format': 'mp4',
        'quiet': True,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(youtube_url, download=True)
        downloaded_path = ydl.prepare_filename(info)
        if not downloaded_path.endswith('.mp4'):
            downloaded_path = downloaded_path.rsplit('.', 1)[0] + '.mp4'
    # Check if video has frames
    try:
        clip = mp.VideoFileClip(downloaded_path)
        if clip.duration == 0 or clip.size[0] == 0 or clip.size[1] == 0:
            raise Exception("Downloaded file has no video frames.")
        clip.close()
    except Exception as e:
        raise Exception(f"Downloaded video is invalid: {e}")
    return downloaded_path

def transcribe_audio(video_path):
    model = whisper.load_model("tiny")
    result = model.transcribe(video_path)
    return [
        {"text": seg['text'], "start": seg['start'], "end": seg['end']}
        for seg in result['segments']
    ]

def is_complete_sentence(text):
    # Ends with ., !, or ? and starts with a capital letter
    text = text.strip()
    return bool(re.match(r'^[A-Z].*[.!?]$', text))

def extract_key_lines(transcript, prompt, num_lines=2, max_duration=3.0, max_chars=120):
    """
    Returns up to num_lines lines matching the prompt (if given), each <= max_duration seconds,
    is a complete sentence, and not too long.
    """
    def is_short_and_complete(line):
        duration = line['end'] - line['start']
        text = line['text'].strip()
        return (
            duration <= max_duration and
            len(text) <= max_chars and
            is_complete_sentence(text)
        )

    if prompt:
        filtered = [line for line in transcript if prompt.lower() in line['text'].lower() and is_short_and_complete(line)]
        if filtered:
            return filtered[:num_lines]
    # If no prompt or no matches, return first N short, complete lines
    return [line for line in transcript if is_short_and_complete(line)][:num_lines]

def clip_video_segments(video_path, start, end, idx):
    clip = mp.VideoFileClip(video_path)
    duration = clip.duration
    # Clamp start and end
    start = max(0, min(start, duration - 0.1))
    end = max(start + 0.1, min(end, duration))
    if end - start < 0.1:
        end = min(start + 1.0, duration)  # Ensure at least 1 second
    clip = clip.subclip(start, end)
    clip = clip.resize(width=320)
    out_path = tempfile.mktemp(suffix=f"_clip{idx}.mp4")
    clip.write_videofile(out_path, codec="libx264", audio_codec="aac", verbose=False, logger=None)
    print(f"Clipping video: start={start}, end={end}, duration={duration}")
    return out_path

def overlay_captions_on_video(video_path, caption, idx):
    clip = mp.VideoFileClip(video_path)
    txt = mp.TextClip(caption, fontsize=32, color='white', bg_color='rgba(0,0,0,0.5)', size=(clip.w, 60), method='caption')
    txt = txt.set_position(('center', 'bottom')).set_duration(clip.duration)
    result = mp.CompositeVideoClip([clip, txt])
    out_path = tempfile.mktemp(suffix=f"_captioned{idx}.mp4")
    result.write_videofile(out_path, codec="libx264", audio_codec="aac", verbose=False, logger=None)
    return out_path

def video_to_gif_base64(video_path, idx):
    clip = mp.VideoFileClip(video_path)
    gif_temp = tempfile.mktemp(suffix=f"_{idx}.gif")
    clip.write_gif(gif_temp, fps=10, program='ffmpeg', verbose=False, logger=None)
    with open(gif_temp, "rb") as f:
        gif_bytes = f.read()
    os.remove(gif_temp)
    return base64.b64encode(gif_bytes).decode("utf-8")

def is_valid_video(video_path, min_duration=1.0):
    """
    Returns True if the video has frames and is not blank/corrupt.
    """
    try:
        clip = mp.VideoFileClip(video_path)
        if clip.duration is None or clip.duration < min_duration:
            clip.close()
            return False
        if clip.size[0] == 0 or clip.size[1] == 0:
            clip.close()
            return False
        # Try to get a frame in the middle
        frame = clip.get_frame(clip.duration / 2)
        if frame is None or frame.sum() == 0:
            clip.close()
            return False
        clip.close()
        return True
    except Exception as e:
        print(f"Video validation failed: {e}")
        return False