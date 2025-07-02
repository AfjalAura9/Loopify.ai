import React, { useState } from "react";
import VerticalStepper from "./VerticalStepper";
import Dropzone from "react-dropzone";
import Navbar from "./Navbar";
import "./App.css";

function App() {
  const [activeStep, setActiveStep] = useState(0); // 0: Upload/Prompt, 1: Select Line, 2: Generate GIF
  const [step1Panel, setStep1Panel] = useState("upload"); // "upload" or "prompt"
  const [showYTPanel, setShowYTPanel] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [useUrl, setUseUrl] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [lines, setLines] = useState([]);
  const [processError, setProcessError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [selectedLineIdx, setSelectedLineIdx] = useState(null);
  const [gifs, setGifs] = useState([]);
  const [processingLines, setProcessingLines] = useState(false);
  const [started, setStarted] = useState(false);
  const [animateIntro, setAnimateIntro] = useState(false);

  // Simple YouTube URL validation
  const isValidYoutubeUrl = (url) =>
    /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);

  // Handle MP4 file drop/upload
  const handleDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type !== "video/mp4") {
        alert("Only MP4 files are allowed.");
        return;
      }
      setSelectedFile(file);
      setUseUrl(false);
      setVideoUrl("");
      setLines([]);
      setProcessError("");
      setPrompt("");
      setSelectedLineIdx(null);
      setGifs([]);
    }
  };

  // Handle prompt submission after file upload or link
  const handlePromptSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setActiveStep(2); // Move to Step 3 (Generate)
    setProcessingLines(true);
    setLines([]);
    setSelectedLineIdx(null);
    setGifs([]);
    setProcessError("");
    // Get relevant lines only (not GIFs yet)
    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
      formData.append("youtube_url", "");
    } else if (useUrl) {
      formData.append("youtube_url", videoUrl.trim());
    }
    formData.append("prompt", prompt || "");
    formData.append("get_lines_only", "true");
    fetch("http://localhost:8000/process/", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setProcessingLines(false);
        if (data.error) {
          setProcessError(data.error);
        } else {
          setLines(data.lines || []);
        }
      })
      .catch(() => {
        setProcessingLines(false);
        setProcessError("Error processing video.");
      });
  };

  // Handle YouTube panel submission (URL + prompt)
  const handleYTPanelSubmit = (e) => {
    e.preventDefault();
    if (!isValidYoutubeUrl(videoUrl.trim())) {
      setUrlError("Please enter a valid YouTube URL.");
      return;
    }
    if (!prompt.trim()) {
      setUrlError("");
      setProcessError("Please enter a GIF prompt.");
      return;
    }
    setUrlError("");
    setProcessError("");
    setSelectedFile(null);
    setUseUrl(true);
    setLines([]);
    setSelectedLineIdx(null);
    setGifs([]);
    setProcessing(true);
    // Get relevant lines only (not GIFs yet)
    const formData = new FormData();
    formData.append("prompt", prompt || "");
    formData.append("youtube_url", videoUrl.trim());
    formData.append("get_lines_only", "true");
    fetch("http://localhost:8000/process/", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setProcessing(false);
        if (data.error) {
          setProcessError(data.error);
        } else {
          setLines(data.lines || []);
          setActiveStep(1); // Move to Step 2 (Prompt)
          setShowYTPanel(false);
        }
      })
      .catch(() => {
        setProcessing(false);
        setProcessError("Error processing video.");
      });
  };

  // Generate GIF for selected line
  const handleGenerateGif = () => {
    if (selectedLineIdx === null) return;
    setLoadingGifs(true);
    setGifs([]);
    setProcessError("");
    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
      formData.append("youtube_url", "");
    } else if (useUrl) {
      formData.append("youtube_url", videoUrl.trim());
    }
    formData.append("prompt", prompt || "");
    formData.append("selected_line_idx", selectedLineIdx);
    fetch("http://localhost:8000/process/", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setLoadingGifs(false);
        if (data.error) {
          setProcessError(data.error);
        } else {
          setGifs(data.gifs || []);
        }
      })
      .catch(() => {
        setLoadingGifs(false);
        setProcessError("Error generating GIF.");
      });
  };

  // Reset state on close
  const handleCloseGifModal = () => {
    setLines([]);
    setSelectedLineIdx(null);
    setGifs([]);
    setProcessError("");
    setActiveStep(0); // Reset to Step 1
    setSelectedFile(null);
    setPrompt("");
    setUseUrl(false);
    setVideoUrl("");
  };

  const handleStart = () => {
    setAnimateIntro(true);
    setTimeout(() => setStarted(true), 600); // Match transition duration
  };

  // Back button for Step 2
  const handleBackToStep1 = () => {
    setActiveStep(0);
    setLines([]);
    setSelectedLineIdx(null);
    setGifs([]);
    setProcessError("");
  };

  // Add this function:
  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  return (
    <>
      <Navbar />
      {!started && (
        <div className={`dashboard-intro${animateIntro ? " floating-up" : ""}`}>
          <h1 className="dashboard-title">
            Convert{" "}
            <span className="dashboard-title-highlight">MP4 to GIFs</span> in Seconds
          </h1>
          <div className="dashboard-subtitle">
            Transform your favorite video moments into high-quality,
            downloadable GIFs. Upload an MP4 or import from YouTube, add your
            theme, and let AI do the magic - perfect for social media, memes,
            and more.
          </div>
          <button className="start-btn" onClick={handleStart}>
            Start
          </button>
        </div>
      )}
      {started && (
        <div className={`dashboard transitioning`}>
          <div className="dashboard-left">
            <h1 className="dashboard-title">
              <span className="dashboard-title-highlight">MP4 to GIFs</span> in
              3 Steps
            </h1>
            <div className="dashboard-subtitle">
              Transform your favorite video moments into high-quality,
              downloadable GIFs. Upload an MP4 or import from YouTube, add your
              theme, and let AI do the magic - perfect for social media, memes,
              and more.
            </div>
          </div>
          <div className="dashboard-stepper-center">
            <VerticalStepper activeStep={activeStep} />
            <div className="dashboard-stepper-panel">
              {/* Step 1: Upload MP4 */}
              {activeStep === 0 && !showYTPanel && (
                <div className="upload-panel-active">
                  <div className="modal-title">Upload MP4 Video</div>
                  <Dropzone onDrop={handleDrop} accept={{ "video/mp4": [".mp4"] }}>
                    {({ getRootProps, getInputProps, isDragActive }) => (
                      <div
                        {...getRootProps()}
                        className={`dropzone-custom${isDragActive ? " active" : ""}`}
                      >
                        <input {...getInputProps()} />
                        <button className="modal-upload-btn" type="button">
                          Upload a File
                        </button>
                        <div className="modal-drop-desc">
                          Drag & drop a file<br />
                          or{" "}
                          <span
                            className="modal-link"
                            style={{ color: "#3b82f6", cursor: "pointer" }}
                            onClick={() => setShowYTPanel(true)}
                          >
                            import from a link
                          </span>
                        </div>
                        {selectedFile && (
                          <div className="selected-file-label" style={{ marginTop: 16 }}>
                            Selected file: <b>{selectedFile.name}</b>
                          </div>
                        )}
                      </div>
                    )}
                  </Dropzone>
                  {selectedFile && (
                    <div><button
                      className="modal-next-btn"
                      style={{ marginTop: 18 }}
                      onClick={handleNext}
                    >
                      Next
                    </button></div>
                  )}
                </div>
              )}
              {/* Step 1: Import from Link */}
              {activeStep === 0 && showYTPanel && (
                <div className="upload-panel-active">
                  <div className="modal-title">Import from YouTube Link</div>
                  <form
                    className="modal-url-form"
                    onSubmit={handleYTPanelSubmit}
                    autoComplete="off"
                    style={{
                      flexDirection: "column",
                      gap: 16,
                      width: "100%",
                    }}
                  >
                    <input
                      type="url"
                      className="modal-url-input"
                      placeholder="Paste YouTube video URL"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      required
                      style={{ marginBottom: 12, width: "100%" }}
                    />
                    <input
                      className="prompt-input"
                      type="text"
                      placeholder='Enter GIF theme prompt (e.g., "funny moments")'
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      required
                      style={{ marginBottom: 12, width: "100%" }}
                    />
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        type="button"
                        className="modal-url-btn"
                        style={{
                          flex: 1,
                          background: "#23242a",
                          color: "#bbb",
                        }}
                        onClick={() => setShowYTPanel(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="modal-url-btn"
                        disabled={processing}
                        style={{ flex: 1 }}
                      >
                        Next
                      </button>
                    </div>
                  </form>
                  {(urlError || processError) && (
                    <div style={{ color: "#ef4444", marginTop: 12 }}>
                      {urlError || processError}
                    </div>
                  )}
                </div>
              )}
              {/* Step 2: Prompt Input */}
              {activeStep === 1 && (
                <div className="upload-panel-active">
                  <div className="modal-title">Enter GIF Theme Prompt</div>
                  <form
                    className="modal-url-form"
                    onSubmit={handlePromptSubmit}
                    autoComplete="off"
                    style={{
                      flexDirection: "column",
                      gap: 16,
                      width: "100%",
                    }}
                  >
                    <input
                      className="prompt-input"
                      type="text"
                      placeholder='e.g., "funny moments", "motivational clips"'
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      required
                    />
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <button
                        type="button"
                        className="modal-url-btn"
                        style={{
                          flex: 1,
                          background: "#23242a",
                          color: "#bbb",
                          border: "1px solid #31323a",
                        }}
                        onClick={handleBackToStep1}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="modal-url-btn"
                        disabled={processing || !prompt.trim()}
                        style={{ flex: 1 }}
                      >
                        Process GIF
                      </button>
                    </div>
                  </form>
                  {processError && (
                    <div style={{ color: "#ef4444", marginTop: 12 }}>
                      {processError}
                    </div>
                  )}
                </div>
              )}
              {/* Step 3: GIF Generation */}
              {activeStep === 2 && (
                <div className="upload-panel-active">
                  <div className="modal-title">Generate Your GIF</div>
                  {processingLines ? (
                    <div className="gif-loading">
                      <span className="loader"></span>
                      <p>Processing... Please wait...</p>
                    </div>
                  ) : lines.length > 0 && gifs.length === 0 ? (
                    <>
                      <div className="lines-select-list">
                        <h3>Select a line to generate GIF:</h3>
                        {lines.map((line, idx) => (
                          <label key={idx} className="line-option">
                            <input
                              type="radio"
                              name="selectedLine"
                              value={idx}
                              checked={selectedLineIdx === idx}
                              onChange={() => setSelectedLineIdx(idx)}
                            />
                            {line}
                          </label>
                        ))}
                      </div>
                      <button
                        className="modal-url-btn"
                        style={{ marginTop: 16 }}
                        onClick={handleGenerateGif}
                        disabled={selectedLineIdx === null || loadingGifs}
                      >
                        {loadingGifs ? "Generating GIF..." : "Generate GIF"}
                      </button>
                      {processError && (
                        <div style={{ color: "#ef4444", marginTop: 12 }}>
                          {processError}
                        </div>
                      )}
                    </>
                  ) : loadingGifs ? (
                    <div className="gif-loading">
                      <span className="loader"></span>
                      <p>Processing... Please wait...</p>
                    </div>
                  ) : (
                    <div className="gif-modal-list">
                      {gifs.map((gif, i) => (
                        <div key={i} className="gif-modal-item">
                          <img
                            src={`data:image/gif;base64,${gif}`}
                            alt={`gif${i}`}
                            className="gif-modal-img"
                          />
                          <div className="gif-btn-row">
                            <a
                              href={`data:image/gif;base64,${gif}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gif-preview-btn"
                            >
                              Preview
                            </a>
                            <a
                              href={`data:image/gif;base64,${gif}`}
                              download={`gif_${i}.gif`}
                              className="gif-download-btn"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
