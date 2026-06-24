import { uploadToGCS } from '../services/storageService.js';

async function testStorage() {
  console.log("Testing upload to primary storage (R2)...");
  try {
    const testFileName = `test-storage-service-${Date.now()}.txt`;
    const buffer = Buffer.from("Hello from Sandbox Storage Service Verification!", "utf-8");
    
    console.log(`Uploading dummy file: ${testFileName}...`);
    const publicUrl = await uploadToGCS(buffer, testFileName, 'text/plain');
    
    if (publicUrl) {
      console.log("✅ Success! File uploaded successfully.");
      console.log("Returned URL:", publicUrl);
    } else {
      console.error("❌ Failed to upload. Returned null.");
    }
  } catch (error) {
    console.error("❌ Unexpected error:", error.message || error);
  }
}

testStorage();
