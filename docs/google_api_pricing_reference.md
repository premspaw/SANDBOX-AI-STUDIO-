# Google Gemini API & Veo Pricing Reference

This document outlines the computation costs for Google's Gemini and Veo models available via Vertex AI. All costs are estimated in Indian Rupees (INR) using an exchange rate of **1 USD = ₹83.00**.

## 🧠 Gemini Text & Multimodal Models (Tokens)

Pricing for Gemini models operates on a token basis, with varying costs for input (prompt) and output (generation).

| Model | Input Price (per 1M Tokens) | Output Price (per 1M Tokens) |
| :--- | :--- | :--- |
| **Gemini 2.5 Flash Lite** (Nano Banana) | ₹8.30 ($0.10) | ₹33.20 ($0.40) |
| **Gemini 2.0 Flash Lite** (Nano Banana) | ₹6.23 ($0.075) | ₹24.90 ($0.30) |
| **Gemini 1.5 Pro** | ₹103.75 ($1.25) | ₹311.25 ($3.75) |
| **Gemini 1.5 Flash** | ₹6.23 ($0.075) | ₹24.90 ($0.30) |

---

## 🖼️ Imagen Image Generation Models

Vertex AI Imagen models provide high-quality image generation and editing.

| Model Tier | Feature | Price (USD) | Price (INR) |
| :--- | :--- | :--- | :--- |
| **Imagen 4 Ultra** | Generation | $0.06 / img | **₹4.98 / img** |
| **Imagen 4** | Generation | $0.04 / img | **₹3.32 / img** |
| **Imagen 4 Fast** | Generation | $0.02 / img | **₹1.66 / img** |
| **Imagen 3** | Gen/Edit | $0.04 / img | **₹3.32 / img** |
| **Imagen 3 Fast** | Generation | $0.02 / img | **₹1.66 / img** |
| **Imagen 2 & 1** | Gen/Edit | $0.02 / img | **₹1.66 / img** |

### 🎼 Lyria Audio Generation
| Model Tier | Feature | Price (USD) | Price (INR) |
| :--- | :--- | :--- | :--- |
| **Lyria 2** | Music Generation | $0.06 / 30s | **₹4.98 / 30s** |

---

## 📊 Text Embeddings (Gemini)
| Type | Price (USD/1K Tokens) | Price (INR/1K Tokens) |
| :--- | :--- | :--- |
| **Online Requests** | $0.00015 | **₹0.01245** |
| **Batch Requests** | $0.00012 | **₹0.00996** |

---

## 📽️ Veo 3.1 Video Generation Models

Google's Veo 3.1 models offer high-fidelity video generation. Pricing varies by resolution and the inclusion of synchronized audio.

| Model Tier | Resolution | Image/Video Only | Video + Audio |
| :--- | :--- | :--- | :--- |
| **Veo 3.1 Fast** | 720p/1080p | **₹8.30/sec** ($0.10/s) | **₹12.45/sec** ($0.15/s) |
| **Veo 3.1 Fast** | 4K | **₹24.90/sec** ($0.30/s) | **₹29.05/sec** ($0.35/s) |
| **Veo 3.1 Standard** | 720p/1080p | **₹16.60/sec** ($0.20/s) | **₹33.20/sec** ($0.40/s) |
| **Veo 3.1 Standard** | 4K | **₹33.20/sec** ($0.40/s) | **₹49.80/sec** ($0.60/s) |

### 🎬 Veo Video Calculation Examples (8-second video)
*   **Veo 3.1 Fast (1080p, Video Only)**: 8s * ₹8.30 = **₹66.40 per video**
*   **Veo 3.1 Fast (1080p, with Audio)**: 8s * ₹12.45 = **₹99.60 per video**
*   **Veo 3.1 Standard (4K, Video Only)**: 8s * ₹33.20 = **₹265.60 per video**

---

## ⚡ Cost Optimization (Vertex AI Batch Inference)

For high-volume, non-time-critical processing (up to 24-hour turnaround), Google offers **Batch Inference** which provides massive cost savings.

*   **Batch Inference Discount**: **50% OFF** standard token and multimodal generation rates.
*   **Context Caching Discount**: **90% OFF** for repeated input tokens (cached context). *Note: Cache and Batch discounts do not stack; the 90% cache discount takes precedence where applicable.*

### 🚀 ZeroLens Margin Strategy using Batch Mode
By utilizing Vertex AI's Batch Inference, ZeroLens can process 1080p Veo videos for **₹4.15/sec** instead of ₹8.30/sec. This 50% technical saving guarantees that the platform maintains a highly profitable margin even across the most aggressive "Unlimited" subscriptions.

---

## ZeroLens Pricing to Users

| Model Tier | Resolution | Feature | Base Cost (INR) | Your Charge to User (+40%) |
| :--- | :--- | :--- | :--- | :--- |
| **Veo 3.1 Fast** | 720p/1080p | Video Only | ₹8.30 / sec | **₹11.62 / sec** |
| **Veo 3.1 Fast** | 720p/1080p | Video + Audio | ₹12.45 / sec | **₹17.43 / sec** |
| **Veo 3.1 Fast** | 4K | Video Only | ₹24.90 / sec | **₹34.86 / sec** |
| **Veo 3.1 Fast** | 4K | Video + Audio | ₹29.05 / sec | **₹40.67 / sec** |
| **Veo 3.1 Standard** | 720p/1080p | Video Only | ₹16.60 / sec | **₹23.24 / sec** |
| **Veo 3.1 Standard** | 720p/1080p | Video + Audio | ₹33.20 / sec | **₹46.48 / sec** |
| **Veo 3.1 Standard** | 4K | Video Only | ₹33.20 / sec | **₹46.48 / sec** |
| **Veo 3.1 Standard** | 4K | Video + Audio | ₹49.80 / sec | **₹69.72 / sec** |

### 🎬 Example: Charging for an 8-Second Video

Here is how much you will charge your users for an 8-second generation compared to your raw API cost:

*   **Veo 3.1 Fast (1080p, Video Only):**
    *   **You Pay:** ₹66.40
    *   **User Pays:** ₹92.96 _(Profit: ₹26.56)_

*   **Veo 3.1 Fast (1080p, with Audio):**
    *   **You Pay:** ₹99.60
    *   **User Pays:** ₹139.44 _(Profit: ₹39.84)_

*   **Veo 3.1 Standard (4K, with Audio):**
    *   **You Pay:** ₹398.40
    *   **User Pays:** ₹557.76 _(Profit: ₹159.36)_
