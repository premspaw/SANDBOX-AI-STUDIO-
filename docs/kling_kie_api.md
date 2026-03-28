# Kling 2.6 & 3.0 API Documentation (KIE.AI)

This document contains the OpenAPI specifications and usage guides for Kling 2.6 and Kling 3.0 models available via `api.kie.ai`.

---

# Kling 2.6 Image to Video

## Overview
Kling 2.6 is a high-performance video model optimized for image-to-video generation.

## API Endpoint
- **URL**: `https://api.kie.ai/api/v1/jobs/createTask`
- **Method**: `POST`
- **Model ID**: `kling-2.6/image-to-video`

## Request Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `model` | string | Yes | Must be `kling-2.6/image-to-video` |
| `input.prompt` | string | Yes | Text prompt (max 1000 characters) |
| `input.image_urls` | array | Yes | Array with 1 image URL (JPG/PNG/WebP, max 10MB) |
| `input.sound` | boolean | Yes | Whether the video contains sound |
| `input.duration` | string | Yes | `5` or `10` seconds |
| `callBackUrl` | string | No | URL for automated completion notifications |

## Example Request
```json
{
  "model": "kling-2.6/image-to-video",
  "input": {
    "prompt": "Cinematic shot of a character singing in a rehearsal room.",
    "image_urls": ["https://example.com/start_frame.png"],
    "sound": false,
    "duration": "5"
  }
}
```

---

# Kling 3.0 Video Generation

## Overview
Kling 3.0 is an advanced model supporting single-shot and multi-shot video creation, element references (`@element_name`), and high-resolution "Pro" mode.

## API Endpoint
- **URL**: `https://api.kie.ai/api/v1/jobs/createTask`
- **Method**: `POST`
- **Model ID**: `kling-3.0/video`

## Key Features
- **Dual Modes**: `std` (Standard) and `pro` (High Res).
- **Multi-Shot**: Up to 5 shots with individual prompts and durations (1-12s each).
- **Element References**: Reference up to 3 elements using `@name` syntax.
- **Aspect Ratio**: 16:9, 9:16, 1:1 (auto-adapts if images are provided).

## Request Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `model` | string | Yes | `kling-3.0/video` |
| `input.prompt` | string | Yes* | Main prompt (if `multi_shots` is false) |
| `input.multi_shots` | boolean | Yes | `true` for multi-shot, `false` for single-shot |
| `input.multi_prompt` | array | Yes* | Array of `{prompt, duration}` segments (if `multi_shots` is true) |
| `input.image_urls` | array | No | First and last frame URLs (index 0=start, 1=end) |
| `input.mode` | string | Yes | `std` or `pro` |
| `input.duration` | string | Yes | Total duration (3-15 seconds) |
| `input.aspect_ratio`| string | Yes | `16:9`, `9:16`, or `1:1` |
| `input.kling_elements`| array | No | Reference images for `@element` tags |

## Resolution Mappings
| Mode | 16:9 | 9:16 | 1:1 |
| :--- | :--- | :--- | :--- |
| **std** | 1280×720 | 720×1280 | 720×720 |
| **pro** | 1920×1080 | 1080×1920 | 1080×1080 |

## Example: Multi-Shot Video
```json
{
  "model": "kling-3.0/video",
  "input": {
    "multi_shots": true,
    "mode": "pro",
    "duration": "6",
    "aspect_ratio": "16:9",
    "multi_prompt": [
      { "prompt": "Dog running through a forest", "duration": 3 },
      { "prompt": "Dog arriving at a crystal clear lake", "duration": 3 }
    ]
  }
}
```

---

# Authentication (All APIs)
All requests require a Bearer Token in the Authorization header:
`Authorization: Bearer YOUR_API_KEY`

# Common Response Codes
- **200**: Success (returns `taskId`)
- **401**: Unauthorized
- **402**: Insufficient Credits
- **422**: Validation Error (check parameters)
- **429**: Rate Limited
- **501**: Generation Failed
