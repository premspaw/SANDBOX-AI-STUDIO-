import { S3Client, ListBucketsCommand, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

const R2_ACCOUNT_ID = '4e88f062bf55477ce55ad23d8e7c6394';
const R2_ACCESS_KEY_ID = '6fed64d113e41fb3ad1115d06b7c7fdf';
const R2_SECRET_ACCESS_KEY = '268f203df31be8aaf0c1a8c0e981beaf3d626cc2968c97cfe3865806c693e25c';
const R2_ENDPOINT_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

console.log("Testing R2 connection with endpoint:", R2_ENDPOINT_URL);
console.log("Access Key ID:", R2_ACCESS_KEY_ID);

const r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT_URL,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function run() {
    try {
        console.log("Listing buckets...");
        const response = await r2Client.send(new ListBucketsCommand({}));
        console.log("Buckets found:", response.Buckets.map(b => b.Name));

        // Try listing objects in the bucket specified by the user
        const bucketName = 'zerolensbucket-cdn';
        console.log(`Listing objects in bucket "${bucketName}"...`);
        try {
            const objects = await r2Client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 5 }));
            console.log(`Bucket "${bucketName}" is accessible! Objects found:`, (objects.Contents || []).map(o => o.Key));

            // Test upload
            console.log("Uploading test file...");
            const testKey = `test-${Date.now()}.txt`;
            await r2Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: testKey,
                Body: Buffer.from("Hello from Antigravity check!", "utf-8"),
                ContentType: "text/plain"
            }));
            console.log(`Upload successful! Key: ${testKey}`);

            // Test if it can be retrieved publicly
            const publicR2Url = `https://${bucketName}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${testKey}`;
            console.log(`R2 S3 URL: ${publicR2Url}`);
            
            // Wait a second, then check if public dev URL works if we guess it or let's just see.
            console.log("Completed read/write verification.");
        } catch (bucketErr) {
            console.error(`Error accessing bucket "${bucketName}":`, bucketErr.message);
        }
    } catch (err) {
        console.error("General R2 Connection Error:", err.message || err);
    }
}

run();
