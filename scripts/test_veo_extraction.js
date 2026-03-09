/**
 * Test script for findVideoInResponse logic.
 */
function findVideoInResponse(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.uri || obj.videoBytes || obj.bytesBase64Encoded) return obj;
    if (obj.video && (obj.video.uri || obj.video.videoBytes || obj.video.bytesBase64Encoded)) return obj.video;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const result = findVideoInResponse(obj[key]);
            if (result) return result;
        }
    }
    return null;
}

const testCases = [
    {
        name: "Standard SDK Response",
        data: { response: { generatedVideos: [{ video: { videoBytes: "B64_DATA" } }] } },
        expected: "B64_DATA"
    },
    {
        name: "Predict API (Vertex) Response",
        data: { response: { predictions: [{ bytesBase64Encoded: "B64_DATA" }] } },
        expected: "B64_DATA"
    },
    {
        name: "Direct URI Response",
        data: { name: "op", done: true, response: { uri: "https://gcs.com/video" } },
        expected: "https://gcs.com/video"
    },
    {
        name: "Deeply Nested Response",
        data: { a: { b: { c: [{ video: { videoBytes: "DEEP_B64" } }] } } },
        expected: "DEEP_B64"
    }
];

testCases.forEach(tc => {
    const result = findVideoInResponse(tc.data);
    const value = result?.videoBytes || result?.bytesBase64Encoded || result?.uri;
    console.log(`[${tc.name}] ${value === tc.expected ? "✅ PASS" : "❌ FAIL"} (Got: ${value || "null"})`);
});
