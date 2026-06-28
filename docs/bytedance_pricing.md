# Bytedance (Dreamina / BytePlus) Official API Pricing Guide

This document details the official Bytedance (Dreamina / BytePlus) API pricing structures, raw USD token costs, and the calculated ZeroLens credits/pricing breakdown in INR at **₹94 / USD** with a **40% platform margin**.

> **1 Credit = ₹1 INR**  
> Exchange rate: **1 USD = ₹94 INR**  
> All retail prices include a **40% platform margin** over raw API costs.

---

## 1. Video Generation Models (Dreamina Seedance 2.0)

Billing is based on successfully generated videos. Token consumption is calculated as:
$$\text{Token Consumption} = \frac{(\text{Input Video Duration} + \text{Output Video Duration}) \times \text{Output Width} \times \text{Output Height} \times \text{Output Frame Rate}}{1024}$$

### Raw API Token Costs (USD / Million tokens)

| Model ID | Input Option | 480p / 720p | 1080p |
| :--- | :--- | :---: | :---: |
| **dreamina-seedance-2-0-260128** (Pro) | Input **without** video | $7.00 | $7.70 |
| | Input **with** video | $4.30 | $4.70 |
| **dreamina-seedance-2-0-fast-260128** (Fast) | Input **without** video | $5.60 | Not supported |
| | Input **with** video | $3.30 | Not supported |

---

## 2. ZeroLens Pricing Breakdown in INR (₹94 / USD)

### A. Raw INR vs Retail INR (+40% Margin) per Million Tokens

| Model / Option | Raw INR / M tokens | Retail INR / M tokens (+40% Margin) |
| :--- | :---: | :---: |
| **Seedance 2.0 Pro — 480p/720p (No Video)** | ₹658.00 | **₹921.20** |
| **Seedance 2.0 Pro — 480p/720p (With Video)** | ₹404.20 | **₹565.88** |
| **Seedance 2.0 Pro — 1080p (No Video)** | ₹723.80 | **₹1,013.32** |
| **Seedance 2.0 Pro — 1080p (With Video)** | ₹441.80 | **₹618.52** |
| **Seedance 2.0 Fast — 480p/720p (No Video)** | ₹526.40 | **₹736.96** |
| **Seedance 2.0 Fast — 480p/720p (With Video)** | ₹310.20 | **₹434.28** |

---

### B. Estimated Cost per Clip (5 Seconds Output, 16:9 Aspect Ratio)

*Rounded figures are ceiled to the next multiple of 5 (e.g. 21.9 $\rightarrow$ 25).*

#### 1. Input WITHOUT Video (5s Clip)

| Model / Resolution | Raw USD / Clip | Raw INR / Clip | Retail INR / Clip (+40%) | Per-second Rate | Rounded Credits/s |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Seedance 2.0 Pro — 480p** | $0.35 | ₹32.90 | ₹46.06 | ₹9.21/s | **10⚡/s** |
| **Seedance 2.0 Pro — 720p** | $0.76 | ₹71.44 | ₹100.02 | ₹20.00/s | **25⚡/s** |
| **Seedance 2.0 Pro — 1080p** | $1.87 | ₹175.78 | ₹246.09 | ₹49.22/s | **50⚡/s** |
| **Seedance 2.0 Fast — 480p** | $0.28 | ₹26.32 | ₹36.85 | ₹7.37/s | **10⚡/s** |
| **Seedance 2.0 Fast — 720p** | $0.60 | ₹56.40 | ₹78.96 | ₹15.79/s | **20⚡/s** |

#### 2. Input WITH Video (5s Output, 2–15s Input Duration)

| Model / Resolution | Raw USD Range | Raw INR Range | Retail INR Range (+40%) | Rounded Credits/s |
| :--- | :---: | :---: | :---: | :---: |
| **Seedance 2.0 Pro — 480p** | $0.39 – $0.86 | ₹36.66 – ₹80.84 | ₹51.32 – ₹113.18 | **10⚡/s** |
| **Seedance 2.0 Pro — 720p** | $0.86 – $1.87 | ₹80.84 – ₹175.78 | ₹113.18 – ₹246.09 | **25⚡/s** |
| **Seedance 2.0 Pro — 1080p** | $2.11 – $4.59 | ₹198.34 – ₹431.46 | ₹277.68 – ₹604.04 | **50⚡/s** |
| **Seedance 2.0 Fast — 480p** | $0.30 – $0.66 | ₹28.20 – ₹62.04 | ₹39.48 – ₹86.86 | **10⚡/s** |
| **Seedance 2.0 Fast — 720p** | $0.66 – $1.43 | ₹62.04 – ₹134.42 | ₹86.86 – ₹188.19 | **20⚡/s** |

---

## 3. Large Language Models (LLMs)

### Online Inference (Standard Pay-as-you-go)

| Model ID | Input (non-audio) <br> (USD/M tokens) | Input (audio) <br> (USD/M tokens) | Cache-hit input <br> (USD/M tokens) | Output <br> (USD/M tokens) | Retail Cost (INR/M tokens) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **seed-2-0-lite-260428** | $0.25 | $3.75 | $0.05 | $2.00 | Input: **₹32.90** <br> Output: **₹263.20** |
| **seed-2-0-mini-260428** | $0.10 | $1.50 | $0.02 | $0.40 | Input: **₹13.16** <br> Output: **₹52.64** |
| **seed-2-0-pro-260328** | $0.50 | — | $0.10 | $3.00 | Input: **₹65.80** <br> Output: **₹394.80** |
