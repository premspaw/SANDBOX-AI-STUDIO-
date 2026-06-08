# Seedance API Pricing & Token Cost Guide

This document details the pricing structures, billing methods, and token consumption logic for Seedance API services (Large Language Models, Video Generation, Image Generation, 3D Generation, and Embedding Vision models).

---

## 1. Large Language Models (LLMs)

### Online Inference (Standard Pay-as-you-go)
*Standard online inference is billed postpaid by token.*

**Calculation Formula:**
$$\text{Online Inference Cost} = (\text{Input Unit Price} \times \text{Input Tokens}) + (\text{Cached Input Unit Price} \times \text{Cache Hit Tokens}) + (\text{Cache Storage Unit Price} \times \text{Cache Storage Tokens} \times \text{Duration}) + (\text{Output Unit Price} \times \text{Output Tokens})$$

| Model ID | Pricing Tiers (K tokens) | Input (non-audio) (USD/M tokens) | Input (audio) (USD/M tokens) | Cache-storage (USD/M tokens/Hr) | Cache-hit input (non-audio) (USD/M tokens) | Cache-hit input (audio) (USD/M tokens) | Output (USD/M tokens) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **seed-2-0-lite-260428** | [0, 128] <br> (128, 256] | 0.25 <br> 0.50 | 3.75 <br> 7.50 | 0.0083 <br> 0.0083 | 0.05 <br> 0.10 | 0.75 <br> 1.50 | 2.00 <br> 4.00 |
| **seed-2-0-mini-260428** | [0, 128] <br> (128, 256] | 0.10 <br> 0.20 | 1.50 <br> 3.00 | 0.0083 <br> 0.0083 | 0.02 <br> 0.04 | 0.30 <br> 0.60 | 0.40 <br> 0.80 |
| **seed-2-0-pro-260328** | [0, 128] <br> (128, 256] | 0.50 <br> 1.00 | — <br> — | 0.0083 <br> 0.0083 | 0.10 <br> 0.20 | — <br> — | 3.00 <br> 6.00 |
| **seed-2-0-lite-260228** | [0, 128] <br> (128, 256] | 0.25 <br> 0.50 | — <br> — | 0.0083 <br> 0.0083 | 0.05 <br> 0.10 | — <br> — | 2.00 <br> 4.00 |
| **seed-2-0-mini-260215** | [0, 128] <br> (128, 256] | 0.10 <br> 0.20 | — <br> — | 0.0083 <br> 0.0083 | 0.02 <br> 0.04 | — <br> — | 0.40 <br> 0.80 |
| **seed-2-0-code-preview-260328** | [0, 128] <br> (128, 256] | 0.50 <br> 1.00 | — <br> — | 0.0083 <br> 0.0083 | 0.10 <br> 0.20 | — <br> — | 3.00 <br> 6.00 |
| **seed-1-8-251228** | [0, 128] <br> (128, 256] | 0.25 <br> 0.50 | — <br> — | 0.0083 <br> 0.0083 | 0.05 <br> 0.05 | — <br> — | 2.00 <br> 4.00 |
| **glm-4-7-251222** | Flat | 0.60 | — | 0.0083 | 0.11 | — | 2.20 |
| **deepseek-v4-pro-260425** | Flat | 1.74 | — | 0.0083 | 0.145 | — | 3.48 |
| **deepseek-v4-flash-260425** | Flat | 0.14 | — | 0.0083 | 0.028 | — | 0.28 |
| **deepseek-v3-2-251201** | [0, 32] <br> (32, 128] | 0.28 <br> 0.56 | — <br> — | 0.0083 <br> 0.0083 | 0.056 <br> 0.056 | — <br> — | 0.42 <br> 0.84 |
| **seed-1-6-250915** | [0, 128] <br> (128, 256] | 0.25 <br> 0.50 | — <br> — | 0.0083 <br> 0.0083 | 0.05 <br> 0.05 | — <br> — | 2.00 <br> 4.00 |
| **seed-1-6-flash-250715** | [0, 128] <br> (128, 256] | 0.075 <br> 0.10 | — <br> — | 0.0083 <br> 0.0083 | 0.015 <br> 0.015 | — <br> — | 0.30 <br> 0.80 |
| **gpt-oss-120b-250805** | Flat | 0.10 | — | — | — | — | 0.50 |

> [!NOTE]
> **Tiered Billing Example:** A request with 200K input tokens and 14K output tokens falls in the prompt length range `(128, 256]`. The model's input and output tokens are billed at the respective tiered rates (e.g. for `seed-2-0-lite-260428`: $0.50/M tokens for input, $4.00/M tokens for output).

---

### Batch Inference
*Batch inference cost is billed postpaid by token.*

**Calculation Formula:**
$$\text{Batch Inference Cost} = (\text{Input Unit Price} \times \text{Input Tokens}) + (\text{Cache Hit Unit Price} \times \text{Cache Hit Tokens}) + (\text{Output Unit Price} \times \text{Output Tokens})$$

| Model ID | Pricing Tiers (K tokens) | Input (USD/M tokens) | Cache-hit input (USD/M tokens) | Output (USD/M tokens) |
| :--- | :--- | :---: | :---: | :---: |
| **seed-2-0-pro-260328** | [0, 128] <br> (128, 256] | 0.25 <br> 0.50 | 0.10 <br> 0.20 | 1.50 <br> 3.00 |
| **seed-2-0-lite-260228** | [0, 128] <br> (128, 256] | 0.125 <br> 0.25 | 0.05 <br> 0.10 | 1.00 <br> 2.00 |
| **seed-2-0-mini-260215** | [0, 128] <br> (128, 256] | 0.05 <br> 0.10 | 0.02 <br> 0.04 | 0.20 <br> 0.40 |
| **seed-1-8-251228** | [0, 128] <br> (128, 256] | 0.125 <br> 0.25 | 0.05 <br> 0.05 | 1.00 <br> 2.00 |
| **seed-1-6-250915** | [0, 128] <br> (128, 256] | 0.125 <br> 0.25 | 0.05 <br> 0.05 | 1.00 <br> 2.00 |
| **seed-1-6-flash-250715** | [0, 128] <br> (128, 256] | 0.0375 <br> 0.05 | 0.015 <br> 0.015 | 0.15 <br> 0.40 |
| **glm-4-7-251222** | Flat | 0.30 | 0.11 | 1.10 |
| **deepseek-v4-pro-260425** | Flat | 0.87 | 0.145 | 1.74 |
| **deepseek-v4-flash-260425** | Flat | 0.07 | 0.028 | 0.14 |

---

## 2. Video Generation Models

*Billing is strictly based on successfully generated videos. Failed generations (e.g. due to content moderation) are not billed.*

**Price Estimation Formula:**
$$\text{Video Price} = \text{Token Unit Price} \times \text{Token Consumption}$$

**Estimated Token Consumption Formula:**
$$\text{Token Consumption} = \frac{(\text{Input Video Duration} + \text{Output Video Duration}) \times \text{Output Width} \times \text{Output Height} \times \text{Output Frame Rate}}{1024}$$

### Base Pricing

| Model ID | Online Inference (USD/M tokens) | Offline Inference (USD/M tokens) |
| :--- | :--- | :--- |
| **dreamina-seedance-2-0-260128** | **480p / 720p:** <br> - Input without video: 7.0 <br> - Input with video: 4.3 <br> **1080p:** <br> - Input without video: 7.7 <br> - Input with video: 4.7 | Not supported yet |
| **dreamina-seedance-2-0-fast-260128** | **480p / 720p:** <br> - Input without video: 5.6 <br> - Input with video: 3.3 <br> *(1080p is not supported)* | Not supported yet |
| **seedance-1-5-pro-251215** | - Video with audio: 2.4 <br> - Video without audio: 1.2 | - Video with audio: 1.2 <br> - Video without audio: 0.6 |
| **seedance-1-0-pro-250528** | 2.50 | 1.25 |
| **seedance-1-0-pro-fast-251015** | 1.00 | 0.50 |

> [!TIP]
> **Draft Mode:** Low-quality draft videos generated for quick testing consume fewer tokens. The calculated consumption is multiplied by a conversion factor:
> - **Silent videos:** `0.7`
> - **Audio videos:** `0.6`
> *(Only supported by `seedance-1-5-pro-251215` currently)*

---

### Price Examples & Configurations

#### A. Dreamina Seedance 2.0 & 2.0 Fast
*Note: Minimum token consumption limits apply when input includes video.*

**Input WITHOUT Video (16:9 aspect ratio, 5 seconds output duration):**
| Resolution | Aspect Ratio | Duration | Dreamina Seedance 2.0 Cost (USD) | Dreamina Seedance 2.0 Fast Cost (USD) |
| :--- | :---: | :---: | :---: | :---: |
| **480p** | 16:9 | 5s | $0.35 | $0.28 |
| **720p** | 16:9 | 5s | $0.76 | $0.60 |
| **1080p** | 16:9 | 5s | $1.87 | Not supported |

**Input WITH Video (16:9 aspect ratio, 2–15s input duration, 5s output duration):**
| Resolution | Aspect Ratio | Output Duration | Dreamina Seedance 2.0 Cost (USD) | Dreamina Seedance 2.0 Fast Cost (USD) |
| :--- | :---: | :---: | :--- | :--- |
| **480p** | 16:9 | 5s | $0.39 – $0.86 <br> *(Lowest: 2-4s input, highest: 15s input)* | $0.30 – $0.66 <br> *(Lowest: 2-4s input, highest: 15s input)* |
| **720p** | 16:9 | 5s | $0.84 – $1.86 <br> *(Lowest: 2-4s input, highest: 15s input)* | $0.64 – $1.43 <br> *(Lowest: 2-4s input, highest: 15s input)* |
| **1080p** | 16:9 | 5s | $2.06 – $4.57 <br> *(Lowest: 2-4s input, highest: 15s input)* | Not supported |

---

#### B. Seedance 1.5 Pro
*(16:9 aspect ratio, 5 seconds duration)*

| Resolution | Aspect Ratio | Duration | Audio Video (USD) | Draft Audio Video (USD) | Silent Video (USD) | Draft Silent Video (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **480p** | 16:9 | 5s | $0.12 | $0.07 | $0.06 | $0.04 |
| **720p** | 16:9 | 5s | $0.26 | Not supported | $0.13 | Not supported |
| **1080p** | 16:9 | 5s | $0.58 | Not supported | $0.29 | Not supported |

---

#### C. Seedance 1.0 Pro
*(Standard generation frame rate: 24 FPS)*

| Resolution | Ratio | Long × Short Side (px) | Duration | Token Usage | Price (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **480p** | 16:9 <br> 16:9 <br> 4:3 <br> 4:3 <br> 1:1 <br> 1:1 <br> 21:9 <br> 21:9 | 864 × 480 <br> 864 × 480 <br> 736 × 544 <br> 736 × 544 <br> 640 × 640 <br> 640 × 640 <br> 960 × 416 <br> 960 × 416 | 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s | 48,600 <br> 97,000 <br> 46,920 <br> 93,840 <br> 48,000 <br> 96,000 <br> 46,800 <br> 93,600 | $0.12 <br> $0.24 <br> $0.12 <br> $0.23 <br> $0.12 <br> $0.24 <br> $0.12 <br> $0.23 |
| **720p** | 16:9 <br> 16:9 <br> 4:3 <br> 4:3 <br> 1:1 <br> 1:1 <br> 21:9 <br> 21:9 | 1248 × 704 <br> 1248 × 704 <br> 1120 × 832 <br> 1120 × 832 <br> 960 × 960 <br> 960 × 960 <br> 1504 × 640 <br> 1504 × 640 | 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s | 102,960 <br> 205,920 <br> 109,200 <br> 218,400 <br> 108,000 <br> 216,000 <br> 112,800 <br> 225,600 | $0.26 <br> $0.51 <br> $0.27 <br> $0.55 <br> $0.27 <br> $0.54 <br> $0.28 <br> $0.56 |
| **1080p** | 16:9 <br> 16:9 <br> 4:3 <br> 4:3 <br> 1:1 <br> 1:1 <br> 21:9 <br> 21:9 | 1920 × 1088 <br> 1920 × 1088 <br> 1664 × 1248 <br> 1664 × 1248 <br> 1440 × 1440 <br> 1440 × 1440 <br> 2176 × 928 <br> 2176 × 928 | 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s | 244,800 <br> 489,600 <br> 243,360 <br> 486,720 <br> 243,000 <br> 486,000 <br> 236,640 <br> 473,280 | $0.61 <br> $1.22 <br> $0.61 <br> $1.22 <br> $0.61 <br> $1.22 <br> $0.59 <br> $1.18 |

---

#### D. Seedance 1.0 Pro Fast
*(Standard generation frame rate: 24 FPS)*

| Resolution | Ratio | Long × Short Side (px) | Duration | Token Usage | Price (USD) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **480p** | 16:9 <br> 16:9 <br> 4:3 <br> 4:3 <br> 1:1 <br> 1:1 <br> 21:9 <br> 21:9 | 864 × 480 <br> 864 × 480 <br> 736 × 544 <br> 736 × 544 <br> 640 × 640 <br> 640 × 640 <br> 960 × 416 <br> 960 × 416 | 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s | 48,600 <br> 97,000 <br> 46,920 <br> 93,840 <br> 48,000 <br> 96,000 <br> 46,800 <br> 93,600 | $0.05 <br> $0.10 <br> $0.05 <br> $0.09 <br> $0.05 <br> $0.10 <br> $0.05 <br> $0.09 |
| **720p** | 16:9 <br> 16:9 <br> 4:3 <br> 4:3 <br> 1:1 <br> 1:1 <br> 21:9 <br> 21:9 | 1248 × 704 <br> 1248 × 704 <br> 1120 × 832 <br> 1120 × 832 <br> 960 × 960 <br> 960 × 960 <br> 1504 × 640 <br> 1504 × 640 | 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s | 102,960 <br> 205,920 <br> 109,200 <br> 218,400 <br> 108,000 <br> 216,000 <br> 112,800 <br> 225,600 | $0.10 <br> $0.21 <br> $0.11 <br> $0.22 <br> $0.11 <br> $0.22 <br> $0.11 <br> $0.23 |
| **1080p** | 16:9 <br> 16:9 <br> 4:3 <br> 4:3 <br> 1:1 <br> 1:1 <br> 21:9 <br> 21:9 | 1920 × 1088 <br> 1920 × 1088 <br> 1664 × 1248 <br> 1664 × 1248 <br> 1440 × 1440 <br> 1440 × 1440 <br> 2176 × 928 <br> 2176 × 928 | 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s <br> 5s <br> 10s | 244,800 <br> 489,600 <br> 243,360 <br> 486,720 <br> 243,000 <br> 486,000 <br> 236,640 <br> 473,280 | $0.24 <br> $0.49 <br> $0.24 <br> $0.49 <br> $0.24 <br> $0.49 <br> $0.24 <br> $0.47 |

---

## 3. Image Generation Models

*Billing is strictly postpaid based on the number of successfully generated output images.*

| Model ID | Price (USD / image) |
| :--- | :---: |
| **seedream-5-0-lite-260128** | $0.035 |
| **seedream-4-5-251128** | $0.040 |
| **seedream-4-0-250828** | $0.030 |
| **seededit-3-0-i2i-250628** | $0.030 |

---

## 4. 3D Generation Models

*Billing is strictly based on the number of successfully outputted 3D files.*

| Model | Generation Mode | Price (USD / Call) | Token Conversion Equivalent |
| :--- | :--- | :---: | :--- |
| **Hyper3d-Gen2** | White model <br> Textured model <br> PBR material model <br> Textured model with PBR | $0.399 <br> $0.399 <br> $0.399 <br> $0.399 | 30K tokens / call $\times$ 0.0133 USD/K tokens |
| **Hitem3d-2.0** | Standard White Model <br> Standard Textured Model <br> High-Precision White Model <br> High-Precision Textured Model | $0.80 <br> $1.40 <br> $1.20 <br> $1.80 | 40K tokens/call $\times$ 0.020 USD/K <br> 70K tokens/call $\times$ 0.020 USD/K <br> 60K tokens/call $\times$ 0.020 USD/K <br> 90K tokens/call $\times$ 0.020 USD/K |

---

## 5. Embedding Vision Models

*Postpaid pay-as-you-go pricing by token. Width and height are converted to image tokens.*

**Calculation Formula:**
$$\text{Inference Cost} = (\text{Text Input Unit Price} \times \text{Text Tokens}) + (\text{Image Input Unit Price} \times \text{Image Input Tokens})$$
$$\text{Image Tokens} = \frac{\text{Width (px)} \times \text{Height (px)}}{784} \quad \text{(Max 1312 tokens/image)}$$

| Model Provider | Model ID | Service Type | Unit Price (USD / M tokens) | Billing Method | Free Quota |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **BytePlus** | **skylark-embedding-vision** | Inference input (image) <br> Inference input (text) | 0.325 <br> 0.125 | Postpaid | 500K tokens |

---

## 6. Model Units / Flavors
*Model units are billed based on the selected machine type and usage duration. Pricing is independent of the model itself.*

| Machine Type | Billing Method | Pricing (USD / Unit) |
| :--- | :--- | :---: |
| **Flavor-A** | Postpaid (hourly) <br> Prepaid (monthly) | 4.20 <br> 2800.00 |
| **Flavor-C** | Postpaid (hourly) <br> Prepaid (monthly) | 1.80 <br> 1300.00 |

---
*Updated: June 2026*
