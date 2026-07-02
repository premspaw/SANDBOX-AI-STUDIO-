# Generate and Edit Videos with Gemini Omni Flash

> [!NOTE]
> Gemini Omni Flash is in preview.

Gemini Omni Flash (`gemini-omni-flash-preview`) is a high-performance multimodal model designed for high-speed video generation, editing, and cinematic control. Gemini Omni is built on the following core capabilities that distinguish it from previous video models:

*   **Native multimodality**: It processes text, image, audio, and video simultaneously, giving you more cohesive, consistent, and controllable output.
*   **Conversational editing**: Enabled by the Interactions API, it lets you iteratively refine and edit your videos through natural language conversation. Describe what you want to change, and the model applies the edit while preserving the parts of the video you want to keep.
*   **World knowledge**: Gemini Omni combines an understanding of physics with Gemini's knowledge of history, science, and cultural context, bridging the gap from photorealism to meaningful storytelling.

---

## Text to Video Generation

Generate a video from a text prompt. The model generates a video with audio based on your text description. Write prompts with details like scene description, camera movement, lighting, and mood for best results.

### Python Example

```python
import base64
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input="A marble rolling fast on a chain reaction style track, continuous smooth shot."
)
with open("marble.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

### REST Response Schema

> [!IMPORTANT]
> The convenience field `interaction.output_video` is SDK-only. Get the video output from the `steps` array when using the REST API directly.

**Raw REST JSON structure:**

```json
{
  "steps": [
    { "type": "user_input", "content": [{"type": "text", "text": "..."}] },
    { "type": "thought", "content": [{"text": "...", "type": "thought"}] },
    {
      "type": "model_output",
      "content": [
        {
          "type": "video",
          "mime_type": "video/mp4",
          "data": "AAAAIGZ0eXBpc29t..." // Base64 encoded video data
        }
      ]
    }
  ],
  "id": "v1_...",
  "status": "completed",
  "model": "gemini-omni-flash-preview",
  "object": "interaction"
}
```

---

## Control Aspect Ratio

Set the `aspect_ratio` to `"9:16"` to create portrait videos. Landscape (`"16:9"`) is the default.

### Python Example

```python
import base64
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input="A futuristic city with neon lights and flying cars, cyberpunk style",
    response_format={
        "type": "video",  # optional
        "aspect_ratio": "9:16"  # Supported values: "9:16", "16:9"
    }
)
with open("example.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

---

## Image to Video Generation

You can provide a reference image with your text prompt. Depending on your prompt, the model will decide how to use the image. This is useful for bringing product shots, illustrations, or photographs to life.

For example, given a reference image of a drawing of a fish jumping out of water, you can use the following prompt to generate a realistic video:

```
turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video
```

### Python Example

```python
import base64
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input=[
        {"type": "image", "data": base64_image, "mime_type": "image/jpeg"},
        {"type": "text", "text": "turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video"}
    ],
)
with open("clownfish.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

> [!NOTE]
> For best results with image-to-video, use high-resolution images and provide specific motion descriptions. Vague prompts like "make it move" produce less compelling results than detailed descriptions of the camera movement, subject motion, and environmental effects.

---

## Subject Reference

You can generate a video incorporating specific subjects provided as reference images. For example, the following code shows how to provide 2 images (a cat and yarn) to generate a video of the cat playing with the yarn.

### Python Example

```python
import base64
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input=[
        {"type": "image", "data": cat_b64, "mime_type": "image/png"},
        {"type": "image", "data": yarn_b64, "mime_type": "image/png"},
        {"type": "text", "text": "A cat playfully batting at a ball of yarn."}
    ],
)
with open("cat.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

---

## Tasks Parameter

Use the `task` parameter in the `video_config` to clearly indicate the intended behavior. For example, if you want the model to generate a video from an image, you can set the parameter to `image_to_video`. If this is not set, the model will infer what you want from the prompt.

Supported values:
*   `text_to_video`
*   `image_to_video`
*   `reference_to_video`
*   `edit`

### Python Example

```python
import base64
from google import genai

client = genai.Client()

interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input=[
        {"type": "image", "data": base64_image, "mime_type": "image/jpeg"},
        {"type": "text", "text": "turn this into realistic footage, using the drawing only as a guide for movement, do not show the drawing in the final video"}
    ],
    generation_config={
      "video_config": {
        "task": "image_to_video",
      }
    },
)
with open("example.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

---

## Stateful Video Editing

Generate a video and edit it iteratively using follow-up prompts. Each turn builds on the previous result. The model remembers the video context, applying your changes while preserving elements you did not mention. Use the `previous_interaction_id` to track the conversation history and the generated video state without re-uploading the previous video.

> [!NOTE]
> See [Limitations](#limitations) for a detailed list of restrictions for video editing.

### Python Example

```python
import base64
from google import genai

client = genai.Client()

# Turn 1: Generate initial video
res1 = client.interactions.create(model="gemini-omni-flash-preview", input="A woman playing violin outdoors.")

# Turn 2: Edit the previous video
res2 = client.interactions.create(
    model="gemini-omni-flash-preview",
    previous_interaction_id=res1.id,
    input="Make the violin invisible."
)
with open("example.mp4", "wb") as f:
    f.write(base64.b64decode(res2.output_video.data))
```

Each turn in the conversation produces a new video. The model understands context from prior turns, letting you make incremental changes like adjusting lighting and swapping backgrounds, without re-describing the entire scene.

---

## Edit Your Own Videos

Upload your videos using the Files API to edit them with Gemini Omni Flash.

> [!NOTE]
> Editing uploaded videos is not available in all regions. See [Limitations](#limitations) section for details.

### Python Example

```python
import time
import base64
from google import genai

client = genai.Client()

# Upload video using the file API
video_file = client.files.upload(file="Video.mp4")

while video_file.state == "PROCESSING":
    print('Waiting for video to be processed.')
    time.sleep(10)
    video_file = client.files.get(name=video_file.name)

if video_file.state == "FAILED":
  raise ValueError(video_file.state)
print(f'Video processing complete: ' + video_file.uri)

# Edit your video
interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input=[
        {"type": "document", "uri": video_file.uri},
        {"type": "text", "text": "When the person touches the mirror, make the mirror ripple beautifully like liquid, and the person's arm turns into reflective mirror material"}
    ],
)
with open("example.mp4", "wb") as f:
    f.write(base64.b64decode(interaction.output_video.data))
```

> [!NOTE]
> You can also pass the data directly in base64, but since videos can be quite big we recommend using the File API.

---

## Retrieving Videos with a URI

Use the `delivery="uri"` parameter in `response_format` to retrieve generated videos that are larger than 4MB. This returns a Google-hosted URI that you can poll until the video is `ACTIVE` before downloading.

### Python Example

```python
import time
from google import genai

client = genai.Client()

# 1. Request video via URI delivery
interaction = client.interactions.create(
    model="gemini-omni-flash-preview",
    input="A beautiful sunset.",
    response_format={"type": "video", "delivery": "uri"}
)

# 2. Extract file name and poll for ACTIVE state
video_output = interaction.output_video
file_name = video_output.uri.split("/")[-1] # Extract ID

print("Waiting for video processing...")
while True:
    f_info = client.files.get(name=f"files/{file_name}")
    if f_info.state.name == "ACTIVE":
        break
    elif f_info.state.name == "FAILED":
        raise RuntimeError("Generation failed.")
    time.sleep(5)

# 3. Download the final video
video_bytes = client.files.download(file=video_output.uri)
with open("output.mp4", "wb") as f:
    f.write(video_bytes)
```

**Raw REST JSON structure (URI):**

```json
{
  "steps": [
    { "type": "user_input", "content": [{"type": "text", "text": "..."}] },
    { "type": "thought", "content": [{"text": "...", "type": "thought"}] },
    {
      "type": "model_output",
      "content": [
        {
          "type": "video",
          "mime_type": "video/mp4",
          "uri": "https://generativelanguage.googleapis.com/v1beta/files/...:download?alt=media"
        }
      ]
    }
  ],
  "id": "v1_...",
  "status": "completed",
  "model": "gemini-omni-flash-preview",
  "object": "interaction"
}
```

> [!NOTE]
> Currently, calling `GET /v1beta/interactions/{id}` returns the video as inline base64 data in the `data` field, even if the interaction was originally created with `delivery: "uri"`. The `uri` field is only guaranteed to be present in the initial creation response or SSE stream.

---

## Best Practices

*   **Use URI delivery for large videos**: For videos larger than 4MB (>720p when available), use `delivery="uri"` in `response_format` to avoid payload size limits.
*   **Optimized performance**: Set `background=false`, `store=false`, and `stream=false` for faster, synchronous unary generation. Note that setting `store=false` means the generated video won't be editable in subsequent turns using the `previous_interaction_id`.
*   **Prompt precision**: See prompt guidance section for details.

---

## Limitations

*   Uploading and editing images containing minors is not supported in the European Economic Area (EEA), Switzerland, and the United Kingdom.
*   Uploading and editing images containing certain recognizable people is not supported.
*   Editing uploaded videos is not currently available for users in the European Economic Area (EEA), Switzerland, and the United Kingdom (editing videos generated by the model is supported).
*   Uploading audio references is unsupported in the current version of the API.
*   Video references up to 3 seconds in duration are accepted by the API schema but are not correctly processed by the model at this time.
*   Referencing or reasoning across multiple videos is not supported. Attempting multi-video prompting may result in degraded model performance or unexpected outputs.
*   Video extension and video interpolation (generating video between a first and last frame) are not supported.
*   Voice editing is not supported.
*   Provisioned throughput is not supported.
*   System instructions, temperature, `top_p`, stop sequences, and negative prompts are not supported (you can put your negatives in the regular prompt: e.g., "Do not do X").
*   Using YouTube videos as media source is not supported.

---

## Technical Details

*   All generated videos include SynthID watermarking, which is invisible to viewers but can be detected programmatically for provenance verification.
*   Video generation times vary based on duration, resolution, and current API load. Longer and higher-resolution videos take more time to generate.
*   Content safety filters are applied to both input prompts and generated video (and depend on your region). Prompts that violate usage policies will be blocked.
*   English (EN) is fully supported, but other languages have not been evaluated, so they may work but results can vary.

---

## Gemini Omni Flash Prompt Guide

### Single Scene
By default, Omni Flash will try to create a video with a few different shots. It'll attempt to craft an interesting narrative based on the prompt.

If you need the output video to contain a single scene, you must prompt for that using phrases like:
*   *In a single unbroken scene*
*   *In a single continuous shot*
*   *No scene cuts*

**Example:**
> Continuous, unbroken handheld shot of a fluffy tabby cat sitting on a sunny windowsill, looking out into a leafy garden. The cat's tail twitches slowly, and its ears rotate slightly toward ambient noises. Sunbeams illuminate dust motes in the air. Sound design: Gentle breeze, distant bird chirps. No dialogue.

### Removing Unwanted Elements
If the generated video contains things you don't want, include simple negative prompts to avoid them:
*   *No dialogue*
*   *No embellishments*
*   *No extra sound effects*

### Prompts for Editing
Simple prompts work best for video editing. Overly descriptive prompts can lead to unintended changes.

**Examples of simple editing prompts:**
*   *Make this video anime*
*   *Put a fashionable hat on this person*
*   *Change the lighting to be more dramatic*
*   *Change the text on the sign to say "Omni Flash"*

When editing a specific aspect of the video, include **"Keep everything else the same"** to maintain visual consistency.

**Examples of applying this technique:**
*   **Avoid:** *In the video of the man sitting on the sofa, please add a small black cat that runs from the right side of the screen, jumps onto his lap, and then he starts to stroke its head while looking down.*
*   **Simplify:** *Add a cat that jumps onto his lap, he begins to pet it. Keep everything else the same.*
*   **Avoid:** *Please remove the cell phone that the person is holding in their hand and fill in the background so it looks like they are just holding their hand empty.*
*   **Simplify:** *Make the phone invisible. Keep everything else the same.*

### Prompting the Audio
By default, the model will try to generate an appropriate audio track for a video. This might not always be what you want. You can use your prompt to describe the type of audio you want. This is especially important if you want music in your video:
*   *Include calm background music*
*   *The video has a high energy techno beat*
*   *The audio is a low tinny radio broadcast in the background, playing a song*

### Timing Events
You can prompt for things to happen at specific times in the video. There is no precise syntax needed and you can use natural language. This is especially useful in creating your own scene cuts, rhythm, or rapid-fire sequences.

**Examples:**
*   *After 3 seconds, a woman enters the scene.*
*   *At 5s the chorus starts in the background audio.*
*   *Every 2s cut to a new frame.*
*   *In a rapid fire sequence, every half a second (12 frames at 24fps) change the scene to a new location.*

You can also use a timecode syntax:
```
[0-3s] A person is walking
[3-6s] They stop and turn around
[6-10s] They start running
```

### Meta Prompting
You can ask Gemini Omni Flash to pay attention to general qualities or principles of video generation:
*   *Consider micro-detail, expression and timing to create a very rich, detailed but entirely natural scene.*
*   *Be extremely detailed in your descriptions of characters and environments. Apply costume design principles to characters. Be very specific about the people, items and objects in the scene.*
*   *Include plenty of appropriate detail in the background elements to make the scene feel realistic and natural.*
*   *Make a rapid fire video that shows a different rare [thing] every 1s, upbeat music, include text to label the thing.*

### Text in Videos
You can prompt to include text in your video, and Gemini Omni will render it in a way that is correct and readable. If there will be naturally occurring text in your video, even in background elements, it can help to define what it should say.
*   *One word on the screen at a time: "did, you, know, that, Omni, can, do, awesome, text?" Each word appears for 1s with a different animated style. No dialogue.*
*   *There is a street sign that says: "This is an AI generation by Omni", there is a storefront that says: "All you need AI", there's a car with the number plate: "OMN111"*

### Using Tags in Prompts to Set Image Roles

You can use tags to bind uploaded media to specific generation roles. This lets you specify whether each image is an initial frame or a reference.

#### 1. Simple Tags (Recommended)
For simple cases where image roles are clear from the prompt, you can bind images to roles directly:
*   `<FIRST_FRAME>`: Use the image as the starting frame of the video. E.g., `<FIRST_FRAME> a woman is walking`
*   `<IMAGE_REF_N>`: Use the image as a reference. E.g., `in the style of <IMAGE_REF_0> a woman <IMAGE_REF_1> is walking` (combines style reference from the first image and subject reference from the second image). Image references start from 0.

**Example with 6 reference images:**
> [0-3s] A studio fashion sequence. Starting with woman `<IMAGE_REF_0>`, she is holding `<IMAGE_REF_1>`  
> [3-6s] Then we see the man `<IMAGE_REF_2>` holding `<IMAGE_REF_3>`  
> [6-10s] And finally another woman `<IMAGE_REF_4>` who is holding `<IMAGE_REF_5>` while walking.

#### 2. Explicit Declarations
For more complex cases with multiple images and multiple roles, you can use explicit prefix tags paired with natural language instruction suffixes.

*   **Declaring sources and reference images:**
    *   `[# Sources <FIRST_FRAME>@Image1]` will use the first image as the starting frame.
    *   `[# References <IMAGE_REF_0>@Image1]` will use the first image as a reference.
    *   `[# References <IMAGE_REF_1>@Image2]` will use the second image as a reference.
    *   `[# References <IMAGE_REF_0>@Image1 <IMAGE_REF_1>@Image2]` will use both images as references.
    *   `[# Sources <FIRST_FRAME>@Image1] [# References <IMAGE_REF_0>@Image2]` will use the first image as the starting frame and the second image as a reference.
*   **Guiding instructions:** Add guiding instructions at the very end of your prompt:
    *   For starting frame: *"Use this image as the starting frame."*
    *   For reference images: *"Use the given image(s) as references for video generation. The images should not be used as literal initial frames."*

**Example expanded prompt:**
> `[# Sources <FIRST_FRAME>@Image1] [# References <IMAGE_REF_0>@Image2] a woman <IMAGE_REF_0> is walking. Use Image1 as the starting frame. Use Image2 as a reference for the video generation.`
