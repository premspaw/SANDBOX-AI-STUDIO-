# ByteDance Seedance 2.0 Fast API Documentation (KIE.AI)

## Overview
- **Endpoint**: `POST /api/v1/jobs/createTask`
- **Model**: `bytedance/seedance-2-fast`
- **Provider**: KIE.ai (KeiAPI)
- **Auth**: Bearer Token via `KIE_API_KEY`

## Key Features
- Text-to-Video: Generate videos directly from text descriptions
- Image-to-Video: Animate static images with 0-2 input images
- Dynamic Camera: Advanced camera movement with optional lens locking
- Audio Generation: Optional audio generation for enhanced content
- Resolution: 480p, 720p

## Authentication
```
Authorization: Bearer YOUR_KIE_API_KEY
```

## Request Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `model` | string | Yes | `bytedance/seedance-2-fast` |
| `callBackUrl` | string (uri) | No | URL for completion notification |
| `input.prompt` | string | Yes | Text prompt (3-20000 chars) |
| `input.first_frame_url` | string (uri) | No | First frame image URL / asset://{assetId} |
| `input.last_frame_url` | string (uri) | No | End frame image URL / asset://{assetId} |
| `input.reference_image_urls` | array[string] | No | List of image URLs (max 9) |
| `input.reference_video_urls` | array[string] | No | List of video URLs (max 3, each 2-15s) |
| `input.reference_audio_urls` | array[string] | No | List of audio URLs (max 3, each 2-15s) |
| `input.return_last_frame` | boolean | No | Return last frame as image (deprecated) |
| `input.generate_audio` | boolean | No | Generate audio (default: true) |
| `input.resolution` | enum | No | `480p` or `720p` (default: `720p`) |
| `input.aspect_ratio` | enum | No | `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `21:9`, `adaptive` (default: `16:9`) |
| `input.duration` | integer | No | Video duration in seconds (4-15, default: 5) |
| `input.web_search` | boolean | No | Use online search (T2V only) |
| `input.nsfw_checker` | boolean | No | Disable content filtering (default: false) |

## Query Task Status
```
GET /api/v1/jobs/task?taskId={taskId}
```
Headers: `Authorization: Bearer YOUR_KIE_API_KEY`

## Response Codes
| Code | Description |
| :--- | :--- |
| 200 | Success |
| 401 | Unauthorized |
| 402 | Insufficient Credits |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Rate Limited |
| 433 | Sub-key Usage Exceeds Limit |
| 455 | Service Unavailable |
| 500 | Server Error |
| 501 | Generation Failed |
| 505 | Feature Disabled |

## Notes
- Image-to-Video (First Frame), Image-to-Video (First & Last Frames), and Multimodal Reference-to-Video are mutually exclusive
- In production, use `callBackUrl` instead of polling
- 1080p/4K not supported on Fast — use Seedance 2.0 for higher resolutions
