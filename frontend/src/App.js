import React, { useState, useRef, useEffect } from "react";
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
  const fileInputRef = useRef();

  // Simple YouTube URL validation
  function isValidYoutubeUrl(url) {
    // Basic regex for YouTube URLs
    return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}/.test(
      url.trim()
    );
  }

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
    setProcessError("");
    setLoadingGifs(true);
    setGifs([]);
    setActiveStep(2);

    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
      formData.append("youtube_url", "");
    } else if (useUrl) {
      formData.append("youtube_url", videoUrl.trim());
    }

    // If a suggestion is selected, send its index and text
    if (selectedLineIdx !== null) {
      formData.append("prompt", lines[selectedLineIdx]);
      formData.append("selected_line_idx", selectedLineIdx);
    } else if (prompt.trim()) {
      // If custom prompt, send prompt only (no selected_line_idx)
      formData.append("prompt", prompt.trim());
    } else {
      setLoadingGifs(false);
      setProcessError("Please enter a prompt or select a suggestion.");
      return;
    }

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

  // When user selects a line and clicks "Generate GIF"
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setVideoUrl("");
      setUseUrl(false);
      setActiveStep(1); // Go to prompt step
    }
  };

  const handleDropzoneClick = (e) => {
    // Only open file dialog if no file is selected
    if (!selectedFile) {
      fileInputRef.current.click();
    }
  };

  const handleYTImport = () => {
    if (!isValidYoutubeUrl(videoUrl)) {
      setUrlError("Please enter a valid YouTube URL.");
      return;
    }
    setUrlError("");
    setUseUrl(true);
    setSelectedFile(null);
    setActiveStep(1); // Go to prompt step
  };

  useEffect(() => {
    if (activeStep === 1 && (selectedFile || (useUrl && videoUrl))) {
      setProcessing(true);
      setLines([]);
      setProcessError("");
      const formData = new FormData();
      if (selectedFile) {
        formData.append("file", selectedFile);
        formData.append("youtube_url", "");
      } else if (useUrl) {
        formData.append("youtube_url", videoUrl.trim());
      }
      formData.append("prompt", "");
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
          }
        })
        .catch(() => {
          setProcessing(false);
          setProcessError("Error extracting captions.");
        });
    }
    // eslint-disable-next-line
  }, [activeStep, selectedFile, useUrl, videoUrl]);

  return (
    <>
      <Navbar />
      {!started && (
        <div className={`dashboard-intro${animateIntro ? " floating-up" : ""}`}>
          <h1 className="dashboard-title">
            Convert{" "}
            <span className="dashboard-title-highlight">MP4 to GIFs</span> in
            Seconds
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
              {activeStep === 0 && (
                <div className="upload-panel-active combined-upload-panel">
                  <h1>Upload MP4 Video</h1>
                  <div className="dropzone-area" onClick={handleDropzoneClick}>
                    <div className="dropzone-icon">
                      <svg
                        width="40"
                        height="40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20 8v16m0 0l-6-6m6 6l6-6M6 32h28"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <div className="dropzone-text">
                      <span
                        style={{ color: "#7b8494", fontWeight: 500 }}
                        className="dropzone-click-to-upload"
                      >
                        Click to upload
                      </span>{" "}
                      or drag and drop
                    </div>
                    <button
                      className="upload-btn"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current.click();
                      }}
                    >
                      Upload a File
                    </button>
                    <input
                      type="file"
                      accept="video/mp4"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </div>
                  <div className="upload-info">Only support .mp4 files</div>
                  <div className="divider-row">
                    <div className="divider" />
                    <span className="divider-or">OR</span>
                    <div className="divider" />
                  </div>
                  <div className="yt-link-row">
                    <label className="yt-link-label">Import from a link</label>
                    <div className="yt-link-input-group">
                      <input
                        type="url"
                        className="yt-link-input"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setSelectedFile(null);
                        }}
                      />
                      <button
                        className="yt-link-import-btn"
                        type="button"
                        disabled={!isValidYoutubeUrl(videoUrl)}
                        onClick={handleYTImport}
                      >
                        Import
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Step 1: Import from Link */}
              {activeStep === 0 && showYTPanel && (
                <div className="youtube-link-card">
                  <div className="youtube-link-title">
                    Import from YouTube Link
                  </div>
                  <form
                    className="youtube-link-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!videoUrl.trim()) return;
                      setShowYTPanel(false);
                      setUseUrl(true);
                      setSelectedFile(null);
                      setActiveStep(1); // Go to Step 2 (GIF prompt)
                    }}
                    autoComplete="off"
                  >
                    <input
                      type="url"
                      className="youtube-link-input"
                      placeholder="Paste YouTube video URL"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      required
                    />
                    <div className="youtube-link-actions">
                      <button
                        type="button"
                        className="youtube-link-cancel"
                        onClick={() => setShowYTPanel(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="youtube-link-next"
                        disabled={!videoUrl.trim() || processing}
                      >
                        Next
                      </button>
                    </div>
                  </form>
                  {(urlError || processError) && (
                    <div className="youtube-link-error">
                      {urlError || processError}
                    </div>
                  )}
                </div>
              )}
              {/* Step 2: Prompt Input */}
              {activeStep === 1 && (
                <div className="gif-prompt-card">
                  <div className="gif-prompt-title">Enter GIF Theme Prompt</div>
                  <form
                    className="gif-prompt-form"
                    onSubmit={handlePromptSubmit}
                  >
                    <textarea
                      className="gif-prompt-input"
                      placeholder="Eg: Hello, Good morning, Funny"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                    />
                    {processing && (
                      <div className="gif-theme-loading">
                        <span className="loader"></span>
                        <p>Extracting suggestions from your video...</p>
                      </div>
                    )}
                    {lines.length > 0 && (
                      <>
                        <div className="gif-theme-suggestions-label">
                          Try these
                        </div>
                        <div className="gif-theme-suggestions">
                          {lines.slice(0, 4).map((line, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="gif-theme-suggestion-btn"
                              onClick={() => {
                                setPrompt(line);
                                setSelectedLineIdx(idx);
                              }}
                            >
                              {line}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button
                      className="gif-theme-generate-btn"
                      type="submit"
                      disabled={processing}
                    >
                      Convert to GIF &rarr;
                    </button>
                    {processError && (
                      <div className="gif-prompt-error">{processError}</div>
                    )}
                  </form>
                </div>
              )}
              {/* Step 3: GIF Generation */}
              {activeStep === 2 && (
                <div className="gif-modal">
                  {loadingGifs ? (
                    <div className="gif-loading">
                      <span className="loader"></span>
                      <p>Generating GIF...</p>
                    </div>
                  ) : (
                    <div className="gif-modal-list grid-2-cols">
                      {gifs.map((gif, i) => (
                        <div key={i} className="gif-modal-item">
                          <img
                            src={`data:image/gif;base64,${gif}`}
                            alt={`gif${i}`}
                            className="gif-modal-img"
                          />
                          {/* ...Preview/Download buttons if any... */}
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
