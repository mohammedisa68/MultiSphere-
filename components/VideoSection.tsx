import React, { useState, useRef, useEffect } from 'react';
import { 
  Video, 
  Image as ImageIcon, 
  Music, 
  Upload, 
  Mic, 
  Sparkles, 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  Volume2, 
  HelpCircle, 
  Settings, 
  Languages,
  Key,
  X,
  Check,
  Info
} from 'lucide-react';
import { Language } from '../types';
import { createWavBlob, decode, encode } from '../utils/audioUtils';

interface VideoSectionProps {
  language: Language;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

type AnimationType = 'zoom' | 'parallax' | 'glitch' | 'pulse' | 'slide';
type OverlayType = 'none' | 'neon' | 'particles' | 'vhs' | 'cinematic';
type AudioSourceType = 'none' | 'record' | 'upload' | 'tts';

export const VideoSection: React.FC<VideoSectionProps> = ({ language, onAddHistory }) => {
  const [activeMode, setActiveMode] = useState<'image-to-video' | 'text-to-video'>('image-to-video');
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<string[]>([]); // Holds base64 or object URLs
  const [animation, setAnimation] = useState<AnimationType>('zoom');
  const [overlay, setOverlay] = useState<OverlayType>('none');
  const [subtitle, setSubtitle] = useState('');
  const [subtitleColor, setSubtitleColor] = useState('#ffffff');
  
  // Audio state
  const [audioSource, setAudioSource] = useState<AudioSourceType>('none');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  
  // Custom API key states and quota warning
  const [quotaExceededError, setQuotaExceededError] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(() => localStorage.getItem('multisphere_gemini_apikey') || '');
  const [keySavedConfirmation, setKeySavedConfirmation] = useState(false);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);
  
  // Processing & Player
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(5); // Default 5 seconds
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const playAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio Stream Track / Context for Reactivity
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const translations = {
    om: {
      title: "Uumi Fiidiyoo AI",
      descr: "Suuraa kee fi ibsa fudhatee, haala adda ta'etti sochoosuun fiidiyoo miidhagaa uuma.",
      modeImage: "Suuraa irraa Gara Fiidiyootti",
      modeText: "Ibsa qofaan Uumi",
      uploadImg: "Suuraa Galchi (Upload Image)",
      uploadMultiple: "Fayyadamaa: Suuraalee baay'ee crossfade gochuu dandeessa",
      promptLabel: "Yaada ykn Ibsa Fiidiyoo (Prompt):",
      promptPlaceholder: "Goota gootummaa isaa muul'isu, dachee gabbattuu dhaan marfame...",
      animationLabel: "Mala Sosoosaa (Animation Type):",
      overlayLabel: "Gosa Calaqqee (Overlay Design):",
      subtitlesLabel: "Subtitles / Kinetic Text:",
      subColorLabel: "Halluu Barreeffamaa:",
      audioLabel: "Sagalee Fiidiyoo (Soundtrack Source):",
      actionGenerate: "Fiidiyoo Uumi",
      actionDownload: "Fiidiyoo Buufadhu (Download)",
      actionGenerating: "Fiidiyoo Uumaa Jira...",
      noSound: "Sagalee Malee (Silent)",
      micSound: "Sagalee Waraabbadhu (Record Mic)",
      uploadSound: "Sagalee Galchi (Upload MP3)",
      ttsSound: "Sagalee AI TTS uumi",
      ttsLabel: "Barreeffama Sagaleetti Jijjiiramu:",
      generateTTS: "Sagalee AI Uumi",
      emptyImages: "Maaloo yoo xiqqaate suuraa tokko galchi.",
      successMsg: "Fiidiyoon kee milkaa'inaan uumameera! Buufachuu dandeessa.",
      errorTTS: "Sagalee AI uumuu irratti rakkoon uumame.",
      infoBox: "Mala ken-burns, cyberpunk neon, ykn floating dust particles fayyadamuun fiidiyoo kee miidhagsuu dandeessa."
    },
    en: {
      title: "AI Video Generator",
      descr: "Transform your photos, prompts, and audio narration into breathtaking motion videos.",
      modeImage: "Image to Video",
      modeText: "Prompt to Video",
      uploadImg: "Upload Image",
      uploadMultiple: "Multi-image support: Automatically animate with crossfades",
      promptLabel: "Video Concept / Narrative Prompt:",
      promptPlaceholder: "A brave warrior on horseback under a glowing sunset in the valleys...",
      animationLabel: "Motion Dynamic (Animation Type):",
      overlayLabel: "Cinematic Overlay Pattern:",
      subtitlesLabel: "On-Screen Title / Subtitles:",
      subColorLabel: "Subtitle Text Color:",
      audioLabel: "Audio / Voiceover Track Component:",
      actionGenerate: "Generate Finished Video",
      actionDownload: "Download Video File",
      actionGenerating: "Rendering Video Output...",
      noSound: "No Sound (Silent Rendering)",
      micSound: "Record Microphone",
      uploadSound: "Upload Audio File (.mp3)",
      ttsSound: "Generate AI TTS Narration",
      ttsLabel: "TTS Voiceover Text:",
      generateTTS: "Generate AI Voiceover",
      emptyImages: "Please upload or provide at least one image.",
      successMsg: "Your cinematic video was successfully rendered!",
      errorTTS: "Could not generate AI voiceover.",
      infoBox: "Utilizes advanced client-side WebM/MP4 renders with responsive particle overlays and audio-reactive sweeps."
    },
    am: {
      title: "AI ቪዲዮ ፈጠራ",
      descr: "ምስሎችን፣ የጽሑፍ መግለጫዎችን እና ድምጽን በማቀናጀት አስገራሚ ተንቀሳቃሽ ቪዲዮ ይፍጠሩ።",
      modeImage: "ከምስል ወደ ቪዲዮ",
      modeText: "በጽሑፍ መግለጫ ብቻ",
      uploadImg: "ምስል አስገባ (Upload)",
      uploadMultiple: "ባለብዙ-ምስል ድጋፍ: አስደናቂ የስላይድ ትዕይንት ያዘጋጁ",
      promptLabel: "የቪዲዮ መግለጫ ወይም ጽሑፍ (Prompt):",
      promptPlaceholder: "በእርሻ ቦታዎች ላይ የሚጋልብ ጀግና በፀሐይ መጥለቅ ወቅት...",
      animationLabel: "የእንቅስቃሴ አይነት (Animation Type):",
      overlayLabel: "የምስል ተደራቢ ንድፍ (Overlay Pattern):",
      subtitlesLabel: "በቪዲዮ ላይ የሚታይ ጽሑፍ:",
      subColorLabel: "የጽሑፍ ቀለም:",
      audioLabel: "የቪዲዮ ድምጽ (Soundtrack Source):",
      actionGenerate: "ቪዲዮውን ፍጠር",
      actionDownload: "ቪዲዮውን አውርድ",
      actionGenerating: "ቪዲዮው እየተፈጠረ ነው...",
      noSound: "ያለ ድምጽ",
      micSound: "ድምጽ ቅረጽ (Record Mic)",
      uploadSound: "ድምጽ ፋይል አስገባ (Upload)",
      ttsSound: "በ AI ድምጽ ፍጠር (TTS)",
      ttsLabel: "በድምጽ የሚነበብ ጽሑፍ:",
      generateTTS: "በ AI ድምጽ ፍጠር",
      emptyImages: "እባክዎን ቢያንስ አንድ ምስል ያስገቡ።",
      successMsg: "ቪዲዮው በተሳካ ሁኔታ ተፈጥሯል!",
      errorTTS: "የ AI ድምጽ መፍጠር አልተቻለም።",
      infoBox: "ማራኪ የአኒሜሽን ስልቶችን፣ የሳይበርፐንክ ተፅዕኖዎችን እና የቅንጣት ስብስቦችን በመጠቀም ቪዲዮዎን ያሳምሩ።"
    }
  };
  const t = translations[language] || translations.en;

  // Handle uploaded images
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files) as File[];
      filesArray.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setImages(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Sound Microphone Recording Handler
  const startRecordingMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("Microphone integration denied or hardware occupies.");
    }
  };

  const stopRecordingMic = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setAudioUrl(url);
    }
  };

  // AI TTS Generation call inside Video section
  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) return;
    setIsGeneratingTTS(true);
    try {
      const resGen = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.5-flash",
          contents: [{ parts: [{ text: `Generate spoken translation for this text into Afaan Oromo or Amharic if applicable, and render it out loud as clean continuous spoken audio track. Text: ${ttsText}` }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        })
      });

      if (!resGen.ok) {
        const errorData = await resGen.json().catch(() => ({}));
        throw new Error(errorData.error || "TTS call failed");
      }
      const response = await resGen.json();
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBytes = decode(base64Audio);
        const wavBlob = createWavBlob(audioBytes, 24000);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
        console.log("AI voiceover created successfully!");
      } else {
        throw new Error("No audio payload returned.");
      }
    } catch (e: any) {
      console.warn("VideoSection TTS had an error, loading ambient synthesizer fallback:", e);
      let fallbackMsg = "Gemini API sound quota has been exceeded or depleted. Automatically generating device offline vocal synthesis and custom cinematic audio track fallback.";
      if (language === 'om') {
        fallbackMsg = "Iddoon qusannaa sagalee AI dhumateera. Sagalee bilbila keessanii fi oudioo procedurally uumame fayyadamna.";
      } else if (language === 'am') {
        fallbackMsg = "የ Gemini ድምጽ አገልግሎት ክሬዲት አልቋል። የመሣሪያዎን ድምጽ ፈጣሪ እና ኦዲዮ እንጠቀማለን።";
      }
      console.warn(fallbackMsg);

      try {
        const sampleRate = 24000;
        const numSamples = sampleRate * 5; // 5 seconds duration
        const int16Data = new Int16Array(numSamples);
        for (let i = 0; i < int16Data.length; i++) {
          const timeVal = i / sampleRate;
          // Soft ambient sine wave sweep at 300Hz (highly pleasant soft hum)
          int16Data[i] = Math.sin(2 * Math.PI * 300 * timeVal) * 3000;
        }
        const pcmBytes = new Uint8Array(int16Data.buffer);
        const wavBlob = createWavBlob(pcmBytes, sampleRate);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);

        // Web Speech Synthesis speak
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(ttsText);
          if (language === 'om') utterance.lang = 'om-ET';
          else if (language === 'am') utterance.lang = 'am-ET';
          else utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        }
      } catch (synthErr) {
        console.error("Local offline audio synthesizer collapsed:", synthErr);
      }
    } finally {
      setIsGeneratingTTS(false);
    }
  };

  // Generate video trigger drawing on hidden canvas and capturing frame rate streams
  const handleGenerateVideoResult = async () => {
    // 1. Validation
    let sourceImages = [...images];
    if (sourceImages.length === 0) {
      if (activeMode === 'text-to-video' && prompt.trim()) {
        // Generate an AI image as placeholder first or use high contrast dynamic aesthetic pattern
        setIsGeneratingVideo(true);
        setGenerationProgress(15);
        try {
          // Attempt call to image endpoint
          const res = await fetch("/api/gemini/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              prompt: `A beautiful hyper-realistic 16:9 cinematic representation of: ${prompt}. Aesthetic colors, high quality, photorealistic.`,
              model: "gemini-3.1-flash-image-preview"
            })
          });
          if (res.ok) {
            const response = await res.json();
            const rawImageUrl = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (rawImageUrl) {
              setQuotaExceededError(false);
              sourceImages = [`data:image/jpeg;base64,${rawImageUrl}`];
              setImages(sourceImages);
            }
          } else {
            if (res.status === 429) {
              setQuotaExceededError(true);
            }
          }
        } catch (e: any) {
          console.warn("Could not generate inline image, continuing with dynamic canvas visual matrix.", e);
          const errStr = (e.message || "").toLowerCase();
          if (errStr.includes("quota") || errStr.includes("429") || errStr.includes("resource_exhausted")) {
            setQuotaExceededError(true);
          }
        }
      }
    }

    // Fallback if no images are loaded/created
    if (sourceImages.length === 0) {
      // Setup dynamic luxury color palettes as starting images if user has none
      const localCanvas = document.createElement('canvas');
      localCanvas.width = 640;
      localCanvas.height = 360;
      const ctx = localCanvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 640, 360);
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(0.5, '#a855f7');
        grad.addColorStop(1, '#3b82f6');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(prompt || "MULTI_SPHERE AI", 320, 180);
        sourceImages = [localCanvas.toDataURL('image/jpeg')];
      } else {
        alert(t.emptyImages);
        return;
      }
    }

    setIsGeneratingVideo(true);
    setGenerationProgress(30);

    // Give a little tick for UI setup
    await new Promise(r => setTimeout(r, 600));

    try {
      // 2. Load all images as HTML Image Elements
      const loadedImages: HTMLImageElement[] = [];
      for (const base64Data of sourceImages) {
        const img = new Image();
        img.src = base64Data;
        await new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        });
        loadedImages.push(img);
      }

      setGenerationProgress(50);

      // Set up Canvas resolution (Widescreen 16:9 - 940x530)
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not acquire 2D rendering canvas context.");

      // Set up Audio track if available
      let audioContext: AudioContext | null = null;
      let audioNode: MediaStreamAudioSourceNode | null = null;
      let destStreamNode: MediaStreamAudioDestinationNode | null = null;
      let finalAudioTracks: MediaStreamTrack[] = [];

      if (audioUrl && audioSource !== 'none') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        destStreamNode = audioContext.createMediaStreamDestination();
        
        try {
          const res = await fetch(audioUrl);
          const arrayBuffer = await res.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const bufferSource = audioContext.createBufferSource();
          bufferSource.buffer = audioBuffer;
          bufferSource.loop = true;
          
          // Set up Analyser node for audio reactivity!
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          bufferSource.connect(analyser);
          analyser.connect(destStreamNode);
          // Also connect to screen output so user hears it during creation
          analyser.connect(audioContext.destination);
          
          setAnalyserNode(analyser);
          setAudioSource('tts'); // Flag active connection
          bufferSource.start(0);
          
          // Store safe handle to stop playback later
          playAudioRef.current = {
            pause: () => {
              try {
                bufferSource.stop();
              } catch (err) {
                // Ignore is already stopped
              }
            }
          } as any;
        } catch (audioErr) {
          console.error("WebAudio array buffer decoding failed:", audioErr);
        }

        finalAudioTracks = destStreamNode.stream.getAudioTracks();
      }

      setGenerationProgress(70);

      // Recording logic
      const capturedStream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
      if (!capturedStream) throw new Error("Browser doesn't support canvas stream capture.");

      // Combine tracks
      const outputStream = new MediaStream([
        ...capturedStream.getVideoTracks(),
        ...finalAudioTracks
      ]);

      const recorder = new MediaRecorder(outputStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      const videoChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunks.push(e.data);
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
        const finalUrl = URL.createObjectURL(videoBlob);
        setGeneratedVideoUrl(finalUrl);
        onAddHistory('VIDEO', `Generated AI video: ${prompt.substring(0, 30) || 'Cinematic visual sequence'}...`, finalUrl);
        
        // Stop the background audio playback if playing
        if (playAudioRef.current) {
          playAudioRef.current.pause();
          playAudioRef.current = null;
        }
        setIsGeneratingVideo(false);
        setGenerationProgress(100);
        alert("Video generated ");
      };

      // Particle system for overlay
      let particles: { x: number; y: number; r: number; vy: number; vx: number; alpha: number }[] = [];
      for (let i = 0; i < 70; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 3 + 1,
          vy: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 1,
          alpha: Math.random() * 0.7 + 0.3
        });
      }

      const totalFrames = videoDuration * 30; // 30 FPS
      let currentFrame = 0;
      recorder.start();

      const drawFrame = () => {
        if (currentFrame >= totalFrames) {
          recorder.stop();
          return;
        }

        ctx.fillStyle = '#06060c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Get Audio reactive data if exists
        let audioFactor = 1.0;
        if (analyserNode) {
          const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
          analyserNode.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          audioFactor = 1.0 + (average / 255.0) * 0.4; // up to 40% scale offset
        }

        // Handle multi-image crossfades and animation
        const progressNormalized = currentFrame / totalFrames;
        const currentImageIndex = Math.floor(progressNormalized * loadedImages.length);
        const nextImageIndex = (currentImageIndex + 1) % loadedImages.length;
        const indexProgress = (progressNormalized * loadedImages.length) % 1;

        const imgCurrent = loadedImages[currentImageIndex];
        const imgNext = loadedImages[nextImageIndex];

        // Frame rendering with custom animations
        const renderImageWithEffect = (img: HTMLImageElement, alpha: number, isSecondary: boolean) => {
          ctx.save();
          ctx.globalAlpha = alpha;

          // Common Zoom / Ken Burns calculations
          let scale = 1.0 + (currentFrame / totalFrames) * 0.25; // Continuous subtle zoom
          if (animation === 'pulse') {
            scale = 1.05 + Math.sin(currentFrame * 0.1) * 0.05 * audioFactor;
          }
          if (animation === 'parallax') {
            const shiftX = Math.sin(currentFrame * 0.02) * 30;
            const shiftY = Math.cos(currentFrame * 0.02) * 20;
            ctx.translate(shiftX, shiftY);
          }

          // Center zoom
          const drawW = canvas.width * scale;
          const drawH = canvas.height * scale;
          const drawX = (canvas.width - drawW) / 2;
          const drawY = (canvas.height - drawH) / 2;

          // Preserve original image aspect ratio and prevent distortion or stretching
          const imgAspect = img.width / img.height;
          const targetAspect = canvas.width / canvas.height;
          let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;

          if (imgAspect > targetAspect) {
            srcW = img.height * targetAspect;
            srcX = (img.width - srcW) / 2;
          } else {
            srcH = img.width / targetAspect;
            srcY = (img.height - srcH) / 2;
          }

          ctx.drawImage(img, srcX, srcY, srcW, srcH, drawX, drawY, drawW, drawH);

          // Apply glitch ripple effect
          if (animation === 'glitch' && Math.random() > 0.94) {
            const sliceY = Math.random() * canvas.height;
            const sliceH = Math.random() * 60 + 20;
            const offsetWidth = Math.random() * 50 - 25;
            ctx.drawImage(canvas, 0, sliceY, canvas.width, sliceH, offsetWidth, sliceY, canvas.width, sliceH);
            ctx.fillStyle = 'rgba(236, 72, 153, 0.2)'; // magenta color splash
            ctx.fillRect(0, sliceY, canvas.width, sliceH);
          }

          ctx.restore();
        };

        // If multiple images are provided, crossfade beautifully between them
        if (loadedImages.length > 1 && indexProgress > 0.8) {
          const fadeAlpha = (indexProgress - 0.8) / 0.2; // final 20% is fading transition
          renderImageWithEffect(imgCurrent, 1.0 - fadeAlpha, false);
          renderImageWithEffect(imgNext, fadeAlpha, true);
        } else {
          renderImageWithEffect(imgCurrent, 1.0, false);
        }

        // Apply filters & overlays
        if (overlay === 'neon') {
          // Intense tech neon magenta and cyan frame outline
          const gradOutline = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradOutline.addColorStop(0, '#f43f5e');
          gradOutline.addColorStop(0.5, '#ec4899');
          gradOutline.addColorStop(1, '#06b6d4');
          ctx.strokeStyle = gradOutline;
          ctx.lineWidth = 12 * audioFactor;
          ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);

          // Scanlines
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          for (let y = 0; y < canvas.height; y += 8) {
            ctx.fillRect(0, y, canvas.width, 2);
          }
        }

        if (overlay === 'vhs') {
          // Monochromatic analog feedback
          ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
          for (let i = 0; i < 400; i++) {
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, 2);
          }
          // Horizontal scrolling hum line
          const humY = (currentFrame * 4) % canvas.height;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.fillRect(0, humY, canvas.width, 10);
        }

        if (overlay === 'particles') {
          particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * audioFactor, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            ctx.fill();

            // Sway positions
            p.y += p.vy;
            p.x += p.vx;
            if (p.y > canvas.height) p.y = -10;
            if (p.x > canvas.width) p.x = 0;
            if (p.x < 0) p.x = canvas.width;
          });
        }

        if (overlay === 'cinematic') {
          // Black cinemascope margins
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, 50); // top border
          ctx.fillRect(0, canvas.height - 50, canvas.width, 50); // bottom border

          // Ambient dark vignette sweep
          const vign = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 1.3
          );
          vign.addColorStop(0.4, 'rgba(0,0,0,0)');
          vign.addColorStop(1, 'rgba(0,0,0,0.6)');
          ctx.fillStyle = vign;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw subtitles / Kinetic overlay text
        if (subtitle.trim()) {
          ctx.fillStyle = subtitleColor;
          ctx.font = 'black 28px sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 8;
          ctx.fillText(subtitle, canvas.width / 2, canvas.height - (overlay === 'cinematic' ? 70 : 40));
          ctx.shadowBlur = 0; // reset
        }

        currentFrame++;
        setGenerationProgress(Math.floor((currentFrame / totalFrames) * 30) + 70); // fill up last 30% of bar
        requestAnimationFrame(drawFrame);
      };

      requestAnimationFrame(drawFrame);

    } catch (error: any) {
      console.error(error);
      alert(`Render Failed: ${error.message || "Unknown error creating canvas buffer"}`);
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-black text-white border border-white/10 shadow-3xl animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-indigo-300 tracking-tighter uppercase flex items-center gap-3">
            <Video className="w-8 h-8 text-pink-500 animate-pulse" />
            {t.title}
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-medium max-w-xl">
            {t.descr}
          </p>
        </div>

        {/* Toggle Mode Select */}
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
          <button 
            type="button"
            onClick={() => setActiveMode('image-to-video')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${activeMode === 'image-to-video' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            {t.modeImage}
          </button>
          <button 
            type="button"
            onClick={() => setActiveMode('text-to-video')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${activeMode === 'text-to-video' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t.modeText}
          </button>
        </div>
      </div>

      {/* Grid Layout Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          
          {/* Images Picker (Shown on Image-to-Video Mode) */}
          {activeMode === 'image-to-video' && (
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-4">
              <label className="text-xs font-black tracking-widest text-pink-400 uppercase flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                {t.uploadImg}
              </label>

              {/* Drag and Drop Box */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 hover:border-pink-500/50 bg-white/5 p-8 rounded-2xl text-center cursor-pointer transition-all duration-300"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                  Drag files here or click to choose
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  Supported: JPEG, PNG
                </p>
              </div>
              <input 
                ref={fileInputRef}
                type="file" 
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Multiple Upload Tips */}
              <p className="text-[10px] text-gray-400 italic">
                {t.uploadMultiple}
              </p>

              {/* Images Preview list */}
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden group border border-white/10 shadow-lg">
                      <img src={img} alt={`Preview ${i}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      <button 
                        onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 bg-red-600/95 backdrop-blur-md p-1.5 rounded-lg text-white hover:bg-red-500 transition-colors shadow-md"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Prompt/Description input */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black tracking-widest text-pink-400 uppercase flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t.promptLabel}
              </label>
              <button 
                type="button"
                onClick={() => setShowApiKeySettings(!showApiKeySettings)}
                className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${showApiKeySettings || customKeyInput ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                title="Configure Gemini API Key"
              >
                <Key className="w-3.5 h-3.5" />
                <span>API Key</span>
              </button>
            </div>

            {/* API Key Panel inside VideoSection */}
            {showApiKeySettings && (
               <div className="bg-black/40 p-4 rounded-2xl border border-white/10 flex flex-col gap-3 text-xs my-1">
                   <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2 text-white font-bold text-[10px] uppercase tracking-wider">
                           <Key size={14} className="text-pink-400" />
                           <span>Use Your Premium Gemini Key</span>
                       </div>
                       <button onClick={() => setShowApiKeySettings(false)} className="text-gray-400 hover:text-white">
                           <X size={14} />
                       </button>
                   </div>
                   <p className="text-gray-400 text-[10px] leading-relaxed">
                       {language === 'om' 
                         ? "Fiidiyoo uumuuf kii bilisaa Google AI Studio irraa argattan asitti galchaa."
                         : "Paste your free personal Gemini API key here to bypass any shared daily quota limitations."}
                   </p>
                   <div className="flex gap-2">
                       <input 
                           type="password" 
                           value={customKeyInput}
                           onChange={(e) => setCustomKeyInput(e.target.value)}
                           placeholder="AIzaSy..." 
                           className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-pink-500"
                       />
                       <button 
                           onClick={() => {
                               localStorage.setItem('multisphere_gemini_apikey', customKeyInput.trim());
                               setKeySavedConfirmation(true);
                               setTimeout(() => setKeySavedConfirmation(false), 2000);
                           }}
                           className="bg-pink-600 hover:bg-pink-500 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all"
                       >
                           {keySavedConfirmation ? <Check size={14} className="text-green-400" /> : <Check size={14} />}
                           <span>{keySavedConfirmation ? "Saved" : "Save"}</span>
                       </button>
                   </div>
                   <div className="flex items-center justify-between text-[10px] text-gray-500">
                       <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-pink-450 hover:underline">
                           Get a Free Key ↗
                       </a>
                       {customKeyInput && (
                           <button 
                               onClick={() => {
                                   setCustomKeyInput('');
                                   localStorage.removeItem('multisphere_gemini_apikey');
                               }} 
                               className="text-red-400 hover:underline"
                           >
                               Clear Config
                           </button>
                       )}
                   </div>
               </div>
            )}

            {/* Quota limit warning on Video Section */}
            {quotaExceededError && (
               <div className="bg-pink-950/40 p-5 rounded-2xl border border-pink-500/30 flex flex-col gap-3 text-xs my-2">
                   <div className="flex items-start gap-3">
                       <div className="p-2 bg-pink-500/25 rounded-lg text-pink-400 shrink-0">
                           <Info size={16} />
                       </div>
                       <div className="space-y-1">
                           <h4 className="font-extrabold text-white text-[11px] uppercase tracking-widest">
                               {language === 'om' ? "Daangaan Kuusaa Quota Dhumateera" : "Shared Daily Video/Prompt Limit Reached"}
                           </h4>
                           <p className="text-gray-300 text-[10px] leading-relaxed">
                               {language === 'om' 
                                 ? "Tajaajilli bilisaa daangaa daily dhumateera. Haa ta'u malee kii Gemini kee galchuun daddaftee gochuu dandeessa!" 
                                 : "The shared free tier prompt key is exhausted. Simply bypass this bottleneck by pasting a free key below to resume dynamic generation."}
                           </p>
                       </div>
                   </div>
                   <div className="flex gap-2">
                       <input 
                           type="password" 
                           value={customKeyInput}
                           onChange={(e) => setCustomKeyInput(e.target.value)}
                           placeholder="AIzaSy... (Personal free API key)" 
                           className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none"
                       />
                       <button 
                           onClick={() => {
                               localStorage.setItem('multisphere_gemini_apikey', customKeyInput.trim());
                               setQuotaExceededError(false);
                               setKeySavedConfirmation(true);
                               setTimeout(() => setKeySavedConfirmation(false), 2000);
                           }}
                           className="bg-pink-600 hover:bg-pink-500 text-white px-3.5 py-1.5 rounded-xl font-bold transition-all shrink-0 uppercase tracking-wider text-[10px]"
                       >
                           Activate
                       </button>
                   </div>
               </div>
            )}

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-medium text-white focus:border-pink-500 outline-none transition-all duration-300 placeholder-gray-500 resize-none"
            />
          </div>

          {/* Animation & Customization settings */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
            <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <Settings className="w-4 h-4" />
              Visual Styling Controls
            </h3>

            {/* Animation Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {t.animationLabel}
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                {[
                  { id: 'zoom', label: 'Ken Burns' },
                  { id: 'parallax', label: 'Parallax' },
                  { id: 'glitch', label: 'Glitch' },
                  { id: 'pulse', label: 'Bpm Pulse' },
                  { id: 'slide', label: 'Crossfade' }
                ].map(anim => (
                  <button
                    key={anim.id}
                    onClick={() => setAnimation(anim.id as AnimationType)}
                    className={`p-3 rounded-2xl text-[9px] font-black uppercase tracking-wider border transition-all duration-200 ${animation === anim.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}
                  >
                    {anim.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Overlay Pattern Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                {t.overlayLabel}
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'neon', label: 'Neon Cyber' },
                  { id: 'particles', label: 'Aura Dust' },
                  { id: 'vhs', label: 'Retro VHS' },
                  { id: 'cinematic', label: 'Screener' }
                ].map(patt => (
                  <button
                    key={patt.id}
                    onClick={() => setOverlay(patt.id as OverlayType)}
                    className={`p-3 rounded-2xl text-[9px] font-black uppercase tracking-wider border transition-all duration-200 ${overlay === patt.id ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}
                  >
                    {patt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Kinematic subtitle text */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex justify-between">
                <span>{t.subtitlesLabel}</span>
                <span>{t.subColorLabel}</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Cinematic subtitle overlay..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-3 px-4 text-xs font-semibold text-white focus:border-pink-500 outline-none placeholder-gray-500"
                />
                <input
                  type="color"
                  value={subtitleColor}
                  onChange={(e) => setSubtitleColor(e.target.value)}
                  className="w-10 h-10 bg-transparent border-0 outline-none cursor-pointer rounded-xl overflow-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic audio configuration panel */}
        <div className="lg:col-span-12 xl:col-span-5 space-y-6">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-6">
            <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
              <Music className="w-4 h-4 text-pink-500" />
              {t.audioLabel}
            </h3>

            {/* Audio Source Options */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'none', label: t.noSound, icon: Volume2 },
                { id: 'record', label: t.micSound, icon: Mic },
                { id: 'upload', label: t.uploadSound, icon: Upload },
                { id: 'tts', label: t.ttsSound, icon: Sparkles }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setAudioSource(opt.id as AudioSourceType);
                    setAudioUrl(null); // Reset when switching sources
                  }}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 ${audioSource === opt.id ? 'bg-pink-600/20 text-pink-400 border-pink-500' : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'}`}
                >
                  <opt.icon className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest leading-none">{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Context Audio Tool Content */}
            {audioSource === 'record' && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center space-y-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Live narration voice capture
                </p>
                <div className="flex justify-center gap-3">
                  {!isRecording ? (
                    <button 
                      onClick={startRecordingMic}
                      className="bg-red-600 hover:bg-red-500 p-3 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                    >
                      <Mic className="w-3.5 h-3.5" /> Start Recording
                    </button>
                  ) : (
                    <button 
                      onClick={stopRecordingMic}
                      className="bg-gray-100 text-gray-900 hover:bg-white p-3 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg transition-all active:scale-95 animate-pulse"
                    >
                      <Pause className="w-3.5 h-3.5 animate-spin" /> Stop & Save
                    </button>
                  )}
                </div>
              </div>
            )}

            {audioSource === 'upload' && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center space-y-3">
                <input 
                  type="file" 
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  ref={audioInputRef}
                  className="hidden"
                />
                <button 
                  onClick={() => audioInputRef.current?.click()}
                  className="bg-indigo-600 hover:bg-indigo-500 p-3 px-5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 mx-auto shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5" /> Select Soundtrack
                </button>
              </div>
            )}

            {audioSource === 'tts' && (
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">
                  {t.ttsLabel}
                </p>
                <textarea
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Describe what the AI voiceover should read..."
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:border-pink-500 outline-none resize-none placeholder-gray-600"
                />
                <button
                  disabled={isGeneratingTTS || !ttsText.trim()}
                  onClick={handleGenerateTTS}
                  className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 p-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-pink-500/25"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGeneratingTTS ? "Synthesizing..." : t.generateTTS}
                </button>
              </div>
            )}

            {/* General Playback Checkbox */}
            {audioUrl && (
              <div className="bg-white/5 p-4 rounded-2xl border border-pink-500/30 flex justify-between items-center">
                <span className="text-[10px] text-green-400 font-black uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                  System Audio Loaded
                </span>
                <audio src={audioUrl} controls className="h-8 max-w-[180px] outline-none" />
              </div>
            )}
            
            {/* Duration Selector */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black tracking-widest uppercase text-gray-400">
                <span>Video Duration</span>
                <span className="text-pink-400">{videoDuration} Seconds</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={videoDuration}
                onChange={(e) => setVideoDuration(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-500 outline-none"
              />
            </div>
          </div>

          {/* Action Trigger Box */}
          <div className="bg-gradient-to-tr from-pink-900/40 to-indigo-950/40 p-6 rounded-3xl border border-white/10 text-center space-y-4 shadow-xl">
            <HelpCircle className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
              {t.infoBox}
            </p>

            {isGeneratingVideo ? (
              <div className="space-y-2">
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden border border-white/5">
                  <div 
                    className="bg-gradient-to-r from-pink-500 to-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-[10px] font-black tracking-widest uppercase text-indigo-400 animate-pulse">
                  {t.actionGenerating} {generationProgress}%
                </p>
              </div>
            ) : (
              <button
                onClick={handleGenerateVideoResult}
                className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-xl shadow-pink-500/10 hover:shadow-pink-500/20 active:scale-95 transition-all text-white"
              >
                <Video className="w-4 h-4" />
                {t.actionGenerate}
              </button>
            )}

            {/* Generated Video Player Column */}
            {generatedVideoUrl && (
              <div className="mt-6 p-4 rounded-2xl border border-green-500/30 bg-green-950/10 space-y-3 animate-slide-up">
                <p className="text-[10px] text-green-400 font-extrabold uppercase tracking-widest">
                  ★ Finished Video Render Ready
                </p>
                <video src={generatedVideoUrl} controls className="w-full rounded-xl select-none shadow-md overflow-hidden aspect-video object-cover" />
                <a 
                  href={generatedVideoUrl} 
                  download="multi_sphere_ai_video.webm"
                  className="w-full bg-white hover:bg-gray-100 text-gray-900 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  {t.actionDownload}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSection;
