# ☁️ Cloudinary Integration Guide for CineMAI / Sandbox AI Studio

This guide outlines how to use Cloudinary for hosting, optimizing, and transforming user-generated assets (images/videos) in the CineMAI project.

## 🛠️ Configuration
Add your Cloudinary credentials to your `.env` file for security (do not commit them to Git):

```env
CLOUDINARY_CLOUD_NAME=dkkfftfl9
CLOUDINARY_API_KEY=592856475383987
CLOUDINARY_API_SECRET=w4mEkUiTv69hlA2DHH9t7avHUG0
```

## 🚀 Usage Examples in the Codebase

### 1. Initializing Cloudinary (Backend)
Create a file like `services/cloudinaryService.js` in the project:

```javascript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export default cloudinary;
```

### 2. Uploading AI-Generated Images/Videos
When your backend generates an image/video using Gemini or Veo, upload it directly from the buffer or file stream:

```javascript
import cloudinary from './cloudinaryService.js';

export async function uploadAsset(buffer, folder = 'cine-mai-assets') {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' }, 
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes
        });
      }
    ).end(buffer);
  });
}
```

### 3. Displaying and Optimizing Images on the Frontend
For your React components (like the UGC or Canvas nodes), use `f_auto` and `q_auto` to ensure page loads remain lightning fast:

```javascript
// Function to generate optimized image URLs dynamically
export function getOptimizedUrl(publicId) {
  return `https://res.cloudinary.com/dkkfftfl9/image/upload/f_auto,q_auto/${publicId}`;
}

// React usage:
// <img src={getOptimizedUrl(asset.public_id)} alt="AI Generated Asset" />
```
