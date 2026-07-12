import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';

// Helper: Convert Float32Array to Int16 PCM (little-endian)
function float32ToInt16(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Uint8Array(buffer);
}

// Helper: Convert base64 to Int16Array
function base64ToInt16Array(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

// Helper: Convert Int16Array to Float32Array
function int16ToFloat32(int16Array) {
  const float32 = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32[i] = int16Array[i] / 32768.0;
  }
  return float32;
}

// Helper: Convert Uint8Array to base64
function uint8ArrayToBase64(uint8) {
  let binary = '';
  const len = uint8.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return window.btoa(binary);
}

export function useLivingAvatar() {
  const [isActive, setIsActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  
  // Real-time volumes (0 to 100)
  const [volumeInput, setVolumeInput] = useState(0);
  const [volumeOutput, setVolumeOutput] = useState(0);

  // Synchronized refs to prevent closures in requestAnimationFrame loop
  const isActiveRef = useRef(false);
  const isRecordingRef = useRef(false);
  const volumeInputRef = useRef(0);
  const volumeOutputRef = useRef(0);
  const transcriptRef = useRef([]);
  const configRef = useRef(null);

  // Refs for WebSockets, AudioContext, Nodes, etc.
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const audioQueueRef = useRef([]);
  const nextPlayTimeRef = useRef(0);
  const activeSourcesRef = useRef([]);
  const outputGainNodeRef = useRef(null);

  // Audio Destination for combined recording
  const recordAudioDestRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // For canvas video export
  const animationFrameRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const avatarImageRef = useRef(null); // Ref to the selected avatar image element

  // Retrieve API Key
  const getApiKey = () => {
    const userProfile = useAppStore.getState().userProfile;
    if (userProfile?.role === 'admin' || userProfile?.email === 'premspaw@gmail.com') {
      return localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
    }
    return localStorage.getItem('GOOGLE_API_KEY') || window.aistudio?.apiKey || import.meta.env.VITE_GOOGLE_API_KEY || '';
  };

  // Helper to append a message to the transcript
  const addTranscriptMessage = (role, text) => {
    setTranscript(prev => {
      let updated;
      if (prev.length > 0 && prev[prev.length - 1].role === role) {
        updated = [...prev];
        updated[updated.length - 1].text += ' ' + text;
      } else {
        updated = [...prev, { role, text }];
      }
      transcriptRef.current = updated;
      return updated;
    });
  };

  // Local interruption: Stop all currently playing audio chunks
  const handleLocalInterruption = () => {
    if (activeSourcesRef.current.length > 0) {
      activeSourcesRef.current.forEach(source => {
        try {
          source.stop();
        } catch (e) {
          // already stopped
        }
      });
      activeSourcesRef.current = [];
    }
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;
    setVolumeOutput(0);
    volumeOutputRef.current = 0;
  };

  // WebSocket Connection & Session Setup
  const connect = async (config, canvasElement = null, avatarImgElement = null) => {
    const { characterName, personality, language, voice, avatarUrl } = config;
    configRef.current = config;
    setError(null);
    setTranscript([]);
    transcriptRef.current = [];

    const apiKey = getApiKey();
    if (!apiKey) {
      setError("Google API Key not found. Please add your key in Settings.");
      return;
    }

    try {
      // 1. Initialize AudioContext (must be inside user-interaction thread)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      audioContextRef.current = audioContext;

      // 2. Request Mic Permission
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;

      // 3. Connect WebSocket
      const host = "wss://generativelanguage.googleapis.com";
      const path = "/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
      const wsUrl = `${host}${path}?key=${apiKey}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsActive(true);
        isActiveRef.current = true;

        // Send setup message
        const setupMessage = {
          setup: {
            model: "models/gemini-2.5-flash-native-audio-latest",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voice || "Aoede"
                  }
                }
              }
            },
            systemInstruction: {
              parts: [
                {
                  text: `You are a living, real-time interactive AI character named ${characterName || "Aoede"}.\n\nPersonality details:\n${personality || "Helpful, engaging, and professional."}\n\nLanguage to use: ${language || "English"}.\n\nRules:\n1. Keep your responses extremely concise and dialogue-oriented. Speak in a maximum of 1-3 sentences. Do not dump walls of text.\n2. Engage naturally and listen closely. Avoid formal introductions unless asked.\n3. Make your responses highly natural, using voice inflections matching your personality.`
                }
              ]
            }
          }
        };

        ws.send(JSON.stringify(setupMessage));

        // If we have an avatar image, send it as initial context
        if (avatarUrl) {
          // Send inline content context (image context)
          fetch(avatarUrl)
            .then(res => res.blob())
            .then(blob => {
              const reader = new FileReader();
              reader.readAsDataURL(blob);
              reader.onloadend = () => {
                const base64Data = reader.result.split(',')[1];
                const mimeType = blob.type || 'image/jpeg';
                const imageContextMessage = {
                  clientContent: {
                    turns: [
                      {
                        role: "user",
                        parts: [
                          {
                            inlineData: {
                              mimeType,
                              data: base64Data
                            }
                          },
                          {
                            text: "This is my visual identity avatar. Please analyze my visual style and embody me perfectly."
                          }
                        ]
                      }
                    ],
                    turnComplete: true
                  }
                };
                ws.send(JSON.stringify(imageContextMessage));
              };
            })
            .catch(err => {
              console.warn("Failed to send avatar context image to Gemini Live:", err);
            });
        }

        // Initialize Mic Processor
        startMicStreaming(audioContext, micStream, ws);

        // Kick off visualizer loop as soon as we connect
        if (canvasElement) {
          exportCanvasRef.current = canvasElement;
          avatarImageRef.current = avatarImgElement;
          startCanvasDrawingLoop(canvasElement, avatarImgElement, config);
        }
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle server content (AI output)
          if (data.serverContent) {
            const { modelTurn, interrupted } = data.serverContent;

            if (interrupted) {
              handleLocalInterruption();
              return;
            }

            if (modelTurn && modelTurn.parts) {
              let partText = "";
              modelTurn.parts.forEach(part => {
                // If it has text (transcript)
                if (part.text) {
                  partText += part.text;
                }

                // If it has audio
                if (part.inlineData && part.inlineData.mimeType === "audio/pcm") {
                  const base64Audio = part.inlineData.data;
                  const int16Array = base64ToInt16Array(base64Audio);
                  const float32Array = int16ToFloat32(int16Array);
                  queueAudioForPlayback(float32Array);
                }
              });

              if (partText) {
                addTranscriptMessage('model', partText);
              }
            }
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("Gemini Live WebSocket error:", err);
        setError("WebSocket error occurred. Connection closed.");
        disconnect();
      };

      ws.onclose = () => {
        setIsActive(false);
        isActiveRef.current = false;
      };

    } catch (err) {
      console.error("Go Live initialization failed:", err);
      setError(err.message || "Failed to start microphone or establish live connection.");
      disconnect();
    }
  };

  // Capture Microphone and Stream base64 PCM
  const startMicStreaming = (audioContext, micStream, ws) => {
    const micSource = audioContext.createMediaStreamSource(micStream);

    // Create a script processor node (bufferSize = 2048, 1 input channel, 1 output channel)
    const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
    scriptProcessorRef.current = scriptProcessor;

    // Output gain node for playback
    const outputGain = audioContext.createGain();
    outputGainNodeRef.current = outputGain;
    outputGain.connect(audioContext.destination);

    // Also connect output playback to the record audio destination if active
    if (recordAudioDestRef.current) {
      outputGain.connect(recordAudioDestRef.current);
    }

    scriptProcessor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const inputBuffer = e.inputBuffer.getChannelData(0);

      // Measure volume (RMS)
      let sum = 0;
      for (let i = 0; i < inputBuffer.length; i++) {
        sum += inputBuffer[i] * inputBuffer[i];
      }
      const rms = Math.sqrt(sum / inputBuffer.length);
      const dbVolume = Math.round(Math.min(100, rms * 350));
      setVolumeInput(dbVolume);
      volumeInputRef.current = dbVolume;

      // Simple interruption: If user starts speaking loudly and AI is playing, interrupt AI
      if (dbVolume > 20 && activeSourcesRef.current.length > 0) {
        handleLocalInterruption();
      }

      // Convert to Int16 PCM and base64
      const pcmBytes = float32ToInt16(inputBuffer);
      const base64PCM = uint8ArrayToBase64(pcmBytes);

      const realtimeInputMessage = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: "audio/pcm",
              data: base64PCM
            }
          ]
        }
      };

      ws.send(JSON.stringify(realtimeInputMessage));
    };

    // Route mic source to processor and connect processor to destination (to drive processing)
    micSource.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    // Route mic source to record destination too
    if (recordAudioDestRef.current) {
      micSource.connect(recordAudioDestRef.current);
    }
  };

  // Queue received Float32 PCM samples for seamless playback
  const queueAudioForPlayback = (float32Array) => {
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    // Create an AudioBuffer (1 channel, 16000Hz)
    const audioBuffer = audioContext.createBuffer(1, float32Array.length, 16000);
    audioBuffer.copyToChannel(float32Array, 0);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    // Route playback through the output gain node (for volume controls & recording)
    if (outputGainNodeRef.current) {
      source.connect(outputGainNodeRef.current);
    } else {
      source.connect(audioContext.destination);
    }

    // Schedule playback seamlessly
    const currentTime = audioContext.currentTime;
    let playTime = nextPlayTimeRef.current;

    if (playTime < currentTime) {
      // Add a tiny buffer delay to avoid click artifacts
      playTime = currentTime + 0.05;
    }

    source.start(playTime);
    nextPlayTimeRef.current = playTime + audioBuffer.duration;

    // Track active sources so we can stop them if interrupted
    activeSourcesRef.current.push(source);
    source.onended = () => {
      activeSourcesRef.current = activeSourcesRef.current.filter(src => src !== source);
      if (activeSourcesRef.current.length === 0) {
        setVolumeOutput(0);
        volumeOutputRef.current = 0;
      }
    };

    // Calculate AI speaker volume (RMS) to update visualizer
    let sum = 0;
    for (let i = 0; i < float32Array.length; i++) {
      sum += float32Array[i] * float32Array[i];
    }
    const rms = Math.sqrt(sum / float32Array.length);
    const dbVolume = Math.round(Math.min(100, rms * 300));
    setVolumeOutput(dbVolume);
    volumeOutputRef.current = dbVolume;
  };

  // Disconnect & Cleanup
  const disconnect = () => {
    setIsActive(false);
    isActiveRef.current = false;
    handleLocalInterruption();

    if (isRecordingRef.current) {
      stopRecording();
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (err) {
        console.debug("WebSocket close failed", err);
      }
      wsRef.current = null;
    }

    // Stop Mic Stream Tracks
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }

    // Disconnect script processor
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (err) {
        console.debug("Script processor disconnect failed", err);
      }
      scriptProcessorRef.current = null;
    }

    // Close AudioContext
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (err) {
        console.debug("AudioContext close failed", err);
      }
      audioContextRef.current = null;
    }

    setVolumeInput(0);
    setVolumeOutput(0);
    volumeInputRef.current = 0;
    volumeOutputRef.current = 0;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Start Canvas Recording & MediaRecorder (Video Export)
  const startRecording = (canvasElement = null, avatarImgElement = null, config = null) => {
    if (!isActiveRef.current) return;
    recordedChunksRef.current = [];
    isRecordingRef.current = true;
    setIsRecording(true);

    const canvas = canvasElement || exportCanvasRef.current;
    const avatarImg = avatarImgElement || avatarImageRef.current;
    const finalConfig = config || configRef.current;

    if (!canvas) {
      console.warn("[LivingAvatar] Cannot start recording: Canvas element not available.");
      return;
    }

    exportCanvasRef.current = canvas;
    avatarImageRef.current = avatarImg;

    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    // Create a combined audio stream destination
    const audioDestination = audioContext.createMediaStreamDestination();
    recordAudioDestRef.current = audioDestination;

    // Route mic stream & AI output to the recording stream
    if (micStreamRef.current) {
      try {
        const micSourceNode = audioContext.createMediaStreamSource(micStreamRef.current);
        micSourceNode.connect(audioDestination);
      } catch (err) {
        console.debug("Mic source connection failed", err);
      }
    }
    if (outputGainNodeRef.current) {
      outputGainNodeRef.current.connect(audioDestination);
    }

    // Ensure drawing loop is active
    if (!animationFrameRef.current) {
      startCanvasDrawingLoop(canvas, avatarImg, finalConfig);
    }

    // Capture Canvas Stream at 30 fps
    const canvasStream = canvas.captureStream(30);

    // Combine Video and Audio tracks
    const videoTrack = canvasStream.getVideoTracks()[0];
    const audioTrack = audioDestination.stream.getAudioTracks()[0];

    const combinedStream = new MediaStream();
    if (videoTrack) combinedStream.addTrack(videoTrack);
    if (audioTrack) combinedStream.addTrack(audioTrack);

    // Setup MediaRecorder (use vp9/opus or standard webm)
    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm' };
    }

    const mediaRecorder = new MediaRecorder(combinedStream, options);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${finalConfig?.characterName || 'avatar'}-live-session-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    mediaRecorder.start(100); // chunk every 100ms
  };

  // Stop Canvas Recording
  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Disconnect recording destination
    if (recordAudioDestRef.current) {
      try {
        recordAudioDestRef.current.disconnect();
      } catch (err) {
        console.debug("Audio destination disconnect failed", err);
      }
      recordAudioDestRef.current = null;
    }
  };

  // Send typed text message
  const sendTextMessage = (text) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const textMessage = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text: text }]
          }
        ],
        turnComplete: true
      }
    };

    wsRef.current.send(JSON.stringify(textMessage));
    addTranscriptMessage('user', text);
  };

  // Clear dialog transcripts
  const clearTranscript = () => {
    setTranscript([]);
    transcriptRef.current = [];
  };

  // Dynamic canvas drawing loop at 30fps
  const startCanvasDrawingLoop = (canvas, avatarImg, config) => {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    let frame = 0;

    const draw = () => {
      if (!isActiveRef.current) return;

      frame++;

      // 1. Draw futuristic deep background
      ctx.fillStyle = '#050508';
      ctx.fillRect(0, 0, width, height);

      // Draw cyber grid
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw subtle background glowing radial circles
      const gradient = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, 400);
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0.08)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 400, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Avatar (Center)
      const avatarSize = 320;
      const avatarX = width / 2 - avatarSize / 2;
      const avatarY = height / 2 - avatarSize / 2 - 40;

      // Draw outer glowing pulsing rings
      const pulseFactor = 1 + (volumeOutputRef.current > 0 ? (volumeOutputRef.current / 100) * 0.15 : Math.sin(frame * 0.05) * 0.03);
      
      ctx.strokeStyle = volumeOutputRef.current > 0 ? 'rgba(0, 255, 255, 0.4)' : 'rgba(0, 255, 255, 0.15)';
      ctx.lineWidth = 4;
      ctx.shadowBlur = volumeOutputRef.current > 0 ? 25 : 5;
      ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 40, (avatarSize / 2 + 15) * pulseFactor, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset shadow

      // Draw secondary magenta pulsing ring
      ctx.strokeStyle = volumeInputRef.current > 0 ? 'rgba(255, 0, 255, 0.4)' : 'rgba(255, 0, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 40, (avatarSize / 2 + 30) * (1 + (volumeInputRef.current / 100) * 0.1), 0, Math.PI * 2);
      ctx.stroke();

      // Draw clip-path avatar image (Circular)
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2 - 40, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();

      if (avatarImg && avatarImg.complete) {
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      } else {
        // Fallback: draw glowing sphere
        const faceGradient = ctx.createRadialGradient(width / 2, height / 2 - 40, 20, width / 2, height / 2 - 40, avatarSize / 2);
        faceGradient.addColorStop(0, '#00ffff');
        faceGradient.addColorStop(0.5, '#7b2cbf');
        faceGradient.addColorStop(1, '#120224');
        ctx.fillStyle = faceGradient;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2 - 40, avatarSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Draw dual voice activity waves at the bottom
      const waveY = height - 140;
      ctx.lineWidth = 3;
      
      // User Mic (Left side, Magenta)
      ctx.strokeStyle = '#ff00ff';
      ctx.beginPath();
      for (let i = 0; i < width / 2; i += 10) {
        const factor = 1 - (i / (width / 2));
        const amp = (volumeInputRef.current / 100) * 45 * Math.sin(frame * 0.3 + i * 0.05) * factor;
        if (i === 0) ctx.moveTo(width / 2 - i, waveY + amp);
        else ctx.lineTo(width / 2 - i, waveY + amp);
      }
      ctx.stroke();

      // AI Response (Right side, Cyan)
      ctx.strokeStyle = '#00ffff';
      ctx.beginPath();
      for (let i = 0; i < width / 2; i += 10) {
        const factor = 1 - (i / (width / 2));
        const amp = (volumeOutputRef.current / 100) * 55 * Math.sin(frame * 0.4 + i * 0.04) * factor;
        if (i === 0) ctx.moveTo(width / 2 + i, waveY + amp);
        else ctx.lineTo(width / 2 + i, waveY + amp);
      }
      ctx.stroke();

      // Draw center visualizer join node
      ctx.fillStyle = volumeOutputRef.current > 0 ? '#00ffff' : (volumeInputRef.current > 0 ? '#ff00ff' : '#ffffff');
      ctx.beginPath();
      ctx.arc(width / 2, waveY, 6, 0, Math.PI * 2);
      ctx.fill();

      // 4. Interface overlay texts
      // Header details
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'bold 12px "Courier New", Courier, monospace';
      ctx.fillText(`ZEROLENS NEURAL STREAMER v2.5`, 40, 50);
      ctx.fillText(`VOICE CODEC: PCM 16KHZ MONO`, width - 260, 50);

      // Character / Brand details
      ctx.fillStyle = '#00ffff';
      ctx.font = 'italic bold 28px "Arial", sans-serif';
      ctx.fillText(config.characterName?.toUpperCase() || 'AOEDE', 40, 95);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 14px "Arial", sans-serif';
      ctx.fillText(`VOICE: ${config.voice || 'Aoede'}`, 40, 120);

      // Live Stats at the bottom
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(40, height - 75, width - 80, 2);

      // Recording or Active stream indicators
      if (isRecordingRef.current) {
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        if (Math.floor(frame / 15) % 2 === 0) {
          ctx.arc(60, height - 48, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 15px "Courier New", monospace';
        ctx.fillText("LIVE RECORDING IN PROGRESS", 80, height - 44);
      } else {
        ctx.fillStyle = '#bef264';
        ctx.beginPath();
        ctx.arc(60, height - 48, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = 'bold 13px "Courier New", monospace';
        ctx.fillText("STREAM ACTIVE - SECURED", 80, height - 44);
      }

      // Print latest dialogue at the bottom right
      const lastTurn = transcriptRef.current[transcriptRef.current.length - 1];
      if (lastTurn) {
        ctx.fillStyle = lastTurn.role === 'model' ? '#00ffff' : '#ff00ff';
        ctx.font = 'bold 13px "Courier New", monospace';
        const rawLabel = lastTurn.role === 'model' ? `${config.characterName || 'AI'}: ` : 'YOU: ';
        const textToDraw = rawLabel + (lastTurn.text.length > 50 ? lastTurn.text.slice(0, 50) + "..." : lastTurn.text);
        ctx.fillText(textToDraw.toUpperCase(), width - 520, height - 44);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    animationFrameRef.current = requestAnimationFrame(draw);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isActive,
    isRecording,
    transcript,
    error,
    volumeInput,
    volumeOutput,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    sendTextMessage,
    clearTranscript
  };
}
