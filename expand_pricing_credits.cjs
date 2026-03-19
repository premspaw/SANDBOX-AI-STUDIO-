const fs = require('fs');
let c = fs.readFileSync('src/components/pages/PricingPage.jsx', 'utf8');

const targetSnippet = `    const modelPricing = [
        {
            category: "Video Generation",
            models: [
                { name: "Kling 3.0 (720p/1080p)", cost: "6-7 credits/5s" },
                { name: "Veo 3.1 (720p/1080p)", cost: "3-6 credits/5s" },
                { name: "Veo 3.1 4K", cost: "12 credits/5s" },
                { name: "Kling Omni 3 Image Ref", cost: "5 credits/5s" }
            ]
        }
    ];`;

const replacementSnippet = `    const modelPricing = [
        {
            category: "Image Production",
            models: [
                { name: "Nano Banana Standard", cost: "1 credit" },
                { name: "Nano Banana 2 / Flash", cost: "2 credits" },
                { name: "Nano Banana Pro", cost: "5 credits" },
                { name: "Multi-Shot 9-Grid Matrix", cost: "2 credits" },
                { name: "4K AI Upscaling Master", cost: "3 credits" }
            ]
        },
        {
            category: "Video Production",
            models: [
                { name: "Veo 3.1 Fast Preview (5s)", cost: "10 credits" },
                { name: "Veo 3.1 High Fidelity (5s)", cost: "20 credits" },
                { name: "Kling 3.0 Action (5s)", cost: "10 credits" }
            ]
        },
        {
            category: "Workflows & Scenarios",
            models: [
                { name: "Storyboard 9-Frame Setup", cost: "5 credits" },
                { name: "UGC Script Narrative Generation", cost: "1 credit" },
                { name: "UGC Scene Single Render", cost: "10 credits" },
                { name: "UGC Full Compilation Production", cost: "20 credits" }
            ]
        },
        {
            category: "Commercial & Forge",
            models: [
                { name: "Product Shoot Context (Single)", cost: "3 credits" },
                { name: "Product Pack (5 Scenes Bundle)", cost: "12 credits" },
                { name: "360 Rotating Turn Showcase", cost: "8 credits" },
                { name: "AI Character Identity Kit", cost: "15 credits" },
                { name: "Movie Matrix Grid Embeddings", cost: "10 credits" }
            ]
        }
    ];`;

if (c.includes(targetSnippet)) {
    c = c.replace(targetSnippet, replacementSnippet);
    fs.writeFileSync('src/components/pages/PricingPage.jsx', c, 'utf8');
    console.log('Populated all credits categories into the model pricing on page grid tables.');
} else {
    console.log('Error: Could not find original modelPricing declaration to replace.');
}
