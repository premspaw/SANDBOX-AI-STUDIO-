# Gemini Omni 1.1 Flash Technical Specifications & API Guidelines

## Technical Specifications

### Image Inputs
- **Maximum images per prompt**: 10
- **Maximum file size per file (inline data / console)**: 20 MB
- **Maximum file size per file (Google Cloud Storage)**: 30 MB
- **Supported MIME types**:
  - `image/png`
  - `image/jpeg`
  - `image/webp`
  - `image/heic`
  - `image/heif`

### Text Inputs
- **Maximum file size per file (API / Cloud Storage)**: 50 MB
- **Maximum file size per file (Console upload)**: 7 MB
- **Supported MIME types**: `text/plain`

### Video Inputs & Output Generation
- **Maximum video length (with audio)**: 10 seconds
- **Maximum video length (without audio)**: 10 seconds
- **Maximum number of driving videos per prompt**: 3
- **Supported aspect ratios**: `16:9`, `9:16`
- **Supported resolutions**: `360p`, `720p`, `1080p`, `4K`
- **Supported MIME types**:
  - `video/mp4`
  - `video/quicktime` (`.mov`)
  - `video/webm`
  - `video/mpeg`
  - `video/mpg`
  - `video/mpegs`
  - `video/wmv`
  - `video/x-flv`
  - `video/3gpp` (`.3gp`)

### Parameter Defaults
- **Temperature**: `0.0` - `2.0` (default: `1.0`)
- **topP**: `0.0` - `1.0` (default: `0.95`)
- **Candidate Count**: `1`

---

## Capabilities Matrix
| Feature | Supported | Notes |
| :--- | :--- | :--- |
| **Generate Video from Text** | ✅ YES | Direct text-to-video prompt generation |
| **Generate Video from Image** | ✅ YES | Keyframe and multi-frame image conditioning |
| **Generate Video from References** | ✅ YES | Up to 10 image references & 3 driving videos |
| **First & Last Frame Video** | ✅ YES | Smooth interpolation between start/end frames |
| **Sound Generation (Speech/SFX)** | ✅ YES | Synchronized sound, speech, & music generation |
| **Video Editing** | ✅ YES | Modify existing video scenes with text instructions |
| **Extend Video** | ✅ YES | Extend clip duration smoothly |
| **C2PA Content Credentials** | ✅ YES | Watermarked with C2PA metadata |
| **Thinking Mode** | ✅ YES | Multi-modal reasoning |
| **Token Counting** | ✅ YES | Precise token breakdown |
| **System Instructions** | ❌ N/A | Not supported in video model endpoint |
| **Live API** | ❌ N/A | Asynchronous batch/predict endpoint |
| **Structured Output** | ❌ N/A | Returns video binary stream / R2 media URL |
| **Context Caching** | ❌ N/A | Not applicable to video prediction |
| **RAG Engine** | ❌ N/A | External context search not attached |

---

## Frontend & Backend Integration Reference

### Resolution Credit Scale (Shorts)
- **360p**: 4 Credits / sec
- **720p**: 5-6 Credits / sec
- **1080p**: 6-8 Credits / sec
- **4K**: 15-19 Credits / sec

### API Endpoint Mapping
- `POST /api/omni/generate`
- `POST /api/omni-i2v`
