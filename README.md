# Loopify.AI – MP4/YouTube to AI-Powered GIF Generator

Loopify.AI is a full-stack web application that lets you convert MP4 videos or YouTube clips into high-quality, captioned GIFs using AI transcription and video processing.

## Features

- 🎬 Upload MP4 videos or import from YouTube links
- 📝 Enter a theme prompt (e.g., "funny moments", "motivational clips")
- 🤖 AI extracts relevant lines from the video
- ✂️ Select a line to generate a GIF
- 🖼️ Download or preview your GIFs
- ⚡ FastAPI backend, React frontend

---

## Demo

![Loopify.AI Demo](demo.gif) <!-- Add a demo GIF or screenshot if available -->

---

## Project Structure



---

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/your-username/loopify-ai.git
cd loopify-ai
```
### 2. Backend Setup (FastAPI)

```sh
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Frontend Setup (React)
```sh
cd ../frontend
npm install
npm start
```

### 4. Deployement
#### Free Hosting Recommendations

##### Frontend: Vercel or Netlify
##### Backend: Render or Railway
