# Seedance 2 Fast API Documentation (KIE.AI)

> Generate content using the Seedance 2 Fast model

## Overview

This document describes how to use the Seedance 2 Fast model for content generation via KIE.ai. The process consists of two steps:
1. Create a generation task
2. Query task status and results

## Authentication

All API requests require a Bearer Token in the request header:

```
Authorization: Bearer YOUR_API_KEY
```

Get API Key:
1. Visit [API Key Management Page](https://kie.ai/api-key) to get your API Key
2. Add to request header: `Authorization: Bearer YOUR_API_KEY`

---

## 1. Create Generation Task

### API Information
- **URL**: `POST https://api.kie.ai/api/v1/jobs/createTask`
- **Content-Type**: `application/json`

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `model` | string | Yes | Model name, format: `bytedance/seedance-2-fast` |
| `input` | object | Yes | Input parameters object |
| `callBackUrl` | string | No | Callback URL for task completion notifications. Example: `"https://your-domain.com/api/callback"` |

### Model Parameter

| Property | Value | Description |
|----------|-------|-------------|
| **Format** | `bytedance/seedance-2-fast` | The exact model identifier for this API |
| **Type** | string | Must be passed as a string value |
| **Required** | Yes | Mandatory for all requests |

### Callback URL Parameter

| Property | Value | Description |
|----------|-------|-------------|
| **Purpose** | Task completion notification | Receive real-time updates when your task finishes |
| **Method** | POST request | The system sends POST requests to your callback URL |
| **Timing** | When task completes | Notifications sent for both success and failure states |
| **Content** | Query Task API response | Callback content structure is identical to the Query Task API response |
| **Parameters** | Complete request data | The `param` field contains the complete Create Task request parameters |
| **Optional** | Yes | If not provided, no callback notifications will be sent |

---

### input Object Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `first_frame_url` | string | No | `""` | First frame image URL. Max 30MB. Formats: jpeg, png, webp, gif, bmp |
| `last_frame_url` | string | No | `""` | Last frame image URL. Max 30MB. Formats: jpeg, png, webp, gif, bmp |
| `prompt` | string | No | - | Text prompt (up to 20,000 characters). |
| `reference_image_urls` | array[string] | No | `[]` | List of reference image URLs (max 30MB each). |
| `reference_video_urls` | array[string] | No | `[]` | List of reference video URLs (max 3 videos, total length <= 15s, max 50MB each). |
| `reference_audio_urls` | array[string] | No | `[]` | List of reference audio URLs (max 3 audios, total length <= 15s, max 15MB each). |
| `generate_audio` | boolean | No | `true` | Whether to generate AI audio synchronized with video. |
| `resolution` | string | No | `"720p"` | Output video resolution: `480p`, `720p` |
| `aspect_ratio` | string | No | `"16:9"` | Aspect ratio: `16:9`, `4:3`, `1:1`, `3:4`, `9:16`, `21:9` |
| `duration` | number | No | `15` | Video duration in seconds (-1 to 15, step: 1) |
| `web_search` | boolean | No | `false` | Enable online search |
| `nsfw_checker` | boolean | No | `true` | Content moderation checker |

### Request Example

```json
{
  "model": "bytedance/seedance-2-fast",
  "input": {
    "first_frame_url": "",
    "last_frame_url": "",
    "prompt": "Fixed camera shot, a girl is elegantly hanging clothes to dry. After one piece is hung, she takes another from the bucket and gives it a vigorous shake.",
    "reference_image_urls": ["https://static.aiquickdraw.com/tools/example/1775188742460_VfFGmaNa.png"],
    "reference_video_urls": [""],
    "reference_audio_urls": [""],
    "generate_audio": true,
    "resolution": "720p",
    "aspect_ratio": "16:9",
    "duration": 15,
    "web_search": false,
    "nsfw_checker": true
  }
}
```

### Response Example

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "281e5b0*********************f39b9"
  }
}
```

---

## 2. Query Task Status

### API Information
- **URL**: `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}`
- **Parameter**: `taskId` (passed via URL query string)

### Response Example

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "281e5b0*********************f39b9",
    "model": "bytedance/seedance-2-fast",
    "state": "waiting",
    "param": "{\"model\":\"bytedance/seedance-2-fast\",\"input\":{\"prompt\":\"...\"}}",
    "resultJson": "{\"resultUrls\":[\"https://static.aiquickdraw.com/tools/example/1775188761712_tHGAgzLy.mp4\"]}",
    "failCode": null,
    "failMsg": null,
    "costTime": null,
    "completeTime": null,
    "createTime": 1757584164490
  }
}
```

### Response Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | integer | Response status code, 200 indicates success |
| `msg` | string | Response message |
| `data.taskId` | string | Task ID |
| `data.model` | string | Model name used (`bytedance/seedance-2-fast`) |
| `data.state` | string | Task status: `waiting`, `success`, `fail` |
| `data.param` | string | Task parameters (JSON string) |
| `data.resultJson` | string | Task result (JSON string with `resultUrls: [...]` when `state === 'success'`) |
| `data.failCode` | string | Failure code (when task fails) |
| `data.failMsg` | string | Failure message (when task fails) |
| `data.costTime` | integer | Task duration in milliseconds |
| `data.completeTime` | integer | Completion timestamp |
| `data.createTime` | integer | Creation timestamp |

---

## Usage Flow

1. **Create Task**: Call `POST https://api.kie.ai/api/v1/jobs/createTask` with `model: "bytedance/seedance-2-fast"`.
2. **Get Task ID**: Extract `taskId` from `data.taskId`.
3. **Wait for Results**: Poll status using `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId={taskId}` or listen to `callBackUrl`.
4. **Get Results**: When `state === 'success'`, parse `resultJson` and extract output URLs from `resultUrls`.
