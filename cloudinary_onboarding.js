import { v2 as cloudinary } from 'cloudinary';

// 1. Configure Cloudinary inline
cloudinary.config({
    cloud_name: 'dkkfftfl9',
    api_key: '592856475383987',
    api_secret: 'w4mEkUiTv69hlA2DHH9t7avHUG0'
});

async function run() {
    try {
        const sampleImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
        console.log(`Uploading sample image from: ${sampleImageUrl}`);

        // 2. Upload an image
        const uploadResult = await cloudinary.uploader.upload(sampleImageUrl, {
            public_id: 'sample_onboarding'
        });

        console.log(`Upload successful!`);
        console.log(`Secure URL: ${uploadResult.secure_url}`);
        console.log(`Public ID: ${uploadResult.public_id}`);

        // 3. Get image details
        console.log('\n--- Image Metadata ---');
        console.log(`Width: ${uploadResult.width}px`);
        console.log(`Height: ${uploadResult.height}px`);
        console.log(`Format: ${uploadResult.format}`);
        console.log(`File Size: ${uploadResult.bytes} bytes`);

        // 4. Transform the image
        // f_auto: Automatically selects the best image format for the requesting browser (e.g., WebP or AVIF)
        // q_auto: Automatically controls the compression and quality to deliver the optimal file size without visible loss
        const transformedUrl = cloudinary.url(uploadResult.public_id, {
            secure: true,
            fetch_format: 'auto',
            quality: 'auto'
        });

        console.log('\nDone! Click link below to see optimized version of the image. Check the size and the format.');
        console.log(transformedUrl);

    } catch (error) {
        console.error('Error during Cloudinary onboarding flow:', error);
    }
}

run();
