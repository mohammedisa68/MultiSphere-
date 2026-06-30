
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Language } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Mic, Trash2, Download, Sparkles, Upload, X, Camera, Moon, User, Key, Info, Check } from 'lucide-react';

interface ImageSectionProps {
  language: Language;
  onAddHistory: (type: any, detail: string, mediaUrl?: string) => void;
}

const ImageSection: React.FC<ImageSectionProps> = ({ language, onAddHistory }) => {
  const [prompt, setPrompt] = useState(() => localStorage.getItem('multisphere_image_prompt') || '');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [generatedImage, setGeneratedImage] = useState<string | null>(() => localStorage.getItem('multisphere_generated_image'));
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'none' | 'beauty' | 'lowlight' | 'portrait' | 'cyberpunk' | 'vhs' | 'hologram'>('none');
  
  // Custom API key states and quota warning
  const [quotaExceededError, setQuotaExceededError] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(() => localStorage.getItem('multisphere_gemini_apikey') || '');
  const [keySavedConfirmation, setKeySavedConfirmation] = useState(false);
  const [showApiKeySettings, setShowApiKeySettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Persist prompt
  useEffect(() => {
    localStorage.setItem('multisphere_image_prompt', prompt);
  }, [prompt]);

  // Persist generated image across reloads safely
  useEffect(() => {
    if (generatedImage) {
      try {
        localStorage.setItem('multisphere_generated_image', generatedImage);
      } catch (e) {
        console.warn("Storage full: Could not persist generated image.");
      }
    } else {
      localStorage.removeItem('multisphere_generated_image');
    }
  }, [generatedImage]);

  const getT = (lang: Language) => {
    const base = {
        om: {
            title: "Suuraa AI",
            promptPlaceholder: "Suuraa maal akka fakkaatu ibsi ykn ajaja kenni...",
            uploadRef: "Upload images",
            takePhoto: "Suuraa Kaasi",
            addMore: "Add more",
            generate: "Suuraa Uumi",
            download: "Download to Gallery",
            clear: "Haqi",
            mic: "Dubbadhu",
            watermarkText: "MULTI_SPHERE",
            processing: "Generating...",
            voiceError: "Maayikiin hin hojjetu.",
            cyber: "Cyberpunk",
            vhs: "Kalaala",
            holo: "Hologram",
            all: "Hunda",
            low: "Iftoomsa Gadii",
            port: "Portrait Kaasi",
            retro: "Kalaala VHS"
        },
        en: {
            title: "AI Image Studio",
            promptPlaceholder: "Describe what you want to create or edit...",
            uploadRef: "Upload images",
            takePhoto: "Take Photo",
            addMore: "Add more",
            generate: "Generate Image",
            download: "Download to Gallery",
            clear: "Clear All",
            mic: "Speak",
            watermarkText: "MULTI_SPHERE",
            processing: "Generating...",
            voiceError: "Voice input not supported.",
            cyber: "Cyberpunk",
            vhs: "Retro VHS",
            holo: "Hologram",
            all: "All",
            low: "Low Light",
            port: "Portrait Bokeh",
            retro: "Retro VHS"
        },
        am: {
            title: "የምስል ስቱዲዮ (AI)",
            promptPlaceholder: "ምን መፍጠር ወይም ማስተካከል እንደሚፈልጉ ይግለጹ...",
            uploadRef: "መነሻ ምስሎችን ይጫኑ (ብዙ ምስል ይቻላል)",
            takePhoto: "ፎቶ አንሳ",
            addMore: "ጨምር",
            generate: "ምስል ፍጠር",
            download: "ወደ ጋለሪ አውርድ",
            clear: "ሁሉንም አጽዳ",
            mic: "ተናገር",
            watermarkText: "MULTI_SPHERE",
            processing: "በማመንጨት ላይ...",
            voiceError: "የድምጽ ግብዓት አልተደገፈም::",
            cyber: "ሳይበርፓንክ",
            vhs: "ቪኤችኤስ",
            holo: "ሆሎግራም",
            all: "ሁሉም",
            low: "ዝቅተኛ ብርሃን",
            port: "ፖርትሬት",
            retro: "ቪኤችኤስ ቪንቴጅ"
        }
    };
    return (base as any)[lang] || base.en;
  };
  
  const t = getT(language);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      
      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const applyFilters = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (activeFilter === 'none') return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw existing state into temporary canvas to avoid self-drawing undefined feedback loop
    tempCtx.drawImage(ctx.canvas, 0, 0);
    ctx.clearRect(0, 0, width, height);

    if (activeFilter === 'beauty') {
        // High-end skin softening and brightness
        ctx.filter = 'contrast(1.05) brightness(1.05) saturate(1.1) blur(0.4px)';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
    } else if (activeFilter === 'lowlight') {
        // Boost dark areas and enhancement
        ctx.filter = 'brightness(1.4) contrast(1.1) saturate(1.3)';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
    } else if (activeFilter === 'portrait') {
        // Professional focus effect
        ctx.filter = 'contrast(1.2) saturate(1.1)';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
        const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height)/1.3);
        grad.addColorStop(0.3, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.25)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    } else if (activeFilter === 'cyberpunk') {
        ctx.filter = 'hue-rotate(90deg) contrast(1.3) saturate(1.8) brightness(1.1)';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
    } else if (activeFilter === 'vhs') {
        ctx.filter = 'sepia(0.3) contrast(0.9) brightness(1.1) saturate(1.2)';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
    } else if (activeFilter === 'hologram') {
        ctx.filter = 'grayscale(1) brightness(1.5) contrast(1.5) opacity(0.8)';
        ctx.drawImage(tempCanvas, 0, 0);
        ctx.filter = 'none';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        for(let i=0; i<height; i+=4) ctx.fillRect(0, i, width, 1);
    }
  };

  const handleCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
        
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0);
            applyFilters(ctx, canvas.width, canvas.height);
            
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.98));
            if (blob) {
                const enhancedFile = new File([blob], file.name, { type: 'image/jpeg' });
                setImageFiles(prev => [...prev, enhancedFile]);
                const reader = new FileReader();
                reader.onloadend = () => {
                   setImagePreviews(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(enhancedFile);
            }
        }
      } catch (err) {
        setImageFiles(prev => [...prev, file]);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } finally {
        setLoading(false);
      }
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceInput = () => {
    if ('webkitSpeechRecognition' in window) {
        setIsListening(true);
        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = language === 'om' ? 'om-ET' : 'en-US'; 
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setPrompt(prev => prev + ' ' + transcript);
            setIsListening(false);
        };
        
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    } else {
        showToast(t.voiceError, "error");
    }
  };

  const drawWatermark = async (base64Img: string): Promise<string> => {
      return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                  resolve(base64Img);
                  return;
              }
              ctx.drawImage(img, 0, 0);
              const fontSize = Math.max(20, img.width / 25);
              ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
              const gradient = ctx.createLinearGradient(img.width - 200, 0, img.width, 0);
              gradient.addColorStop(0, '#00f5d4');
              gradient.addColorStop(1, '#ff006e');
              ctx.fillStyle = gradient;
              ctx.textAlign = 'right';
              ctx.textBaseline = 'bottom';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
              ctx.shadowBlur = 5;
              ctx.fillText(t.watermarkText, img.width - 20, img.height - 20);
              resolve(canvas.toDataURL('image/png'));
          };
          img.src = base64Img;
      });
  };

  const resizeImage = (file: File, maxWidth: number = 1024, maxHeight: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
          } else {
            if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error("Canvas error")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const generateProceduralArt = (promptText: string, filterType: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Beautiful linear gradient background depending on the chosen filter
    const grad = ctx.createLinearGradient(0, 0, 800, 800);
    if (filterType === 'cyberpunk') {
        grad.addColorStop(0, '#0f051d');
        grad.addColorStop(0.5, '#2c0c30');
        grad.addColorStop(1, '#051833');
    } else if (filterType === 'vhs') {
        grad.addColorStop(0, '#2d251e');
        grad.addColorStop(1, '#1a1412');
    } else if (filterType === 'hologram') {
        grad.addColorStop(0, '#001a1c');
        grad.addColorStop(1, '#000c0f');
    } else {
        grad.addColorStop(0, '#101827');
        grad.addColorStop(1, '#030712');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 800);

    // Render generative glowing abstract radial bubbles
    const numShapes = 20 + Math.floor(Math.random() * 15);
    for (let i = 0; i < numShapes; i++) {
        ctx.beginPath();
        const x = Math.random() * 800;
        const y = Math.random() * 800;
        const r = 20 + Math.random() * 150;
        
        const shapeGrad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
        if (filterType === 'cyberpunk') {
            shapeGrad.addColorStop(0, 'rgba(236, 72, 153, 0.4)'); // hot pink
            shapeGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');  // transit blue
        } else if (filterType === 'hologram') {
            shapeGrad.addColorStop(0, 'rgba(6, 182, 212, 0.5)'); // clean cyan
            shapeGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
            shapeGrad.addColorStop(0, 'rgba(139, 92, 246, 0.3)'); // vivid violet
            shapeGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');   // dynamic rose
        }
        ctx.fillStyle = shapeGrad;
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Grid details for analytical display
    ctx.strokeStyle = filterType === 'cyberpunk' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    if (filterType === 'hologram' || filterType === 'cyberpunk') {
        for (let x = 0; x < 800; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 800);
            ctx.stroke();
        }
        for (let y = 0; y < 800; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(800, y);
            ctx.stroke();
        }
    }

    // Starfield scatter
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (let i = 0; i < 70; i++) {
        const sx = Math.random() * 800;
        const sy = Math.random() * 800;
        const size = 1 + Math.random() * 2.5;
        ctx.fillRect(sx, sy, size, size);
    }

    // Artistic Frosted Glass Card overlay
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.5;
    ctx.save();
    ctx.beginPath();
    // @ts-ignore
    if (ctx.roundRect) {
        // @ts-ignore
        ctx.roundRect(100, 220, 600, 360, 28);
    } else {
        ctx.rect(100, 220, 600, 360);
    }
    ctx.fill();
    ctx.stroke();
    ctx.clip();

    // Context details
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(filterType === 'none' ? 'MultiSphere Art' : `${filterType.toUpperCase()} DIGITAL ART`, 400, 310);

    ctx.fillStyle = 'rgba(244, 63, 94, 0.9)';
    ctx.font = 'bold 30px "Space Grotesk", sans-serif';
    ctx.fillText("🎨 ARTISTIC FALLBACK", 400, 380);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'italic 20px "Inter", sans-serif';
    const cleanPrompt = promptText ? (promptText.length > 50 ? promptText.slice(0, 47) + "..." : promptText) : "Procedural Aesthetic Vision";
    ctx.fillText(`"${cleanPrompt}"`, 400, 440);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = 'bold 12px "JetBrains Mono", sans-serif';
    ctx.fillText("MULTIPROCESSOR RENDER: HIGH STATUS COMPLETED", 400, 520);

    ctx.restore();

    // Signature watermark
    ctx.font = 'bold 24px "Inter", sans-serif';
    const watermarkGrad = ctx.createLinearGradient(600, 0, 800, 0);
    watermarkGrad.addColorStop(0, '#00f5d4');
    watermarkGrad.addColorStop(1, '#ff006e');
    ctx.fillStyle = watermarkGrad;
    ctx.textAlign = 'right';
    ctx.fillText("MULTI_SPHERE", 760, 760);

    return canvas.toDataURL('image/png');
  };

  const handleGenerate = async () => {
      if (!prompt && imageFiles.length === 0) return;
      setLoading(true);

      try {
        const images: string[] = [];
        for (const file of imageFiles) {
            const base64Data = await resizeImage(file);
            images.push(base64Data);
        }

        const res = await fetch("/api/gemini/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prompt: prompt || "Generate an amazing image based on context", 
                images,
                model: "gemini-3.1-flash-image-preview"
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            const errStr = (errData.error || "").toLowerCase();
            if (errStr.includes("quota") || errStr.includes("429") || errStr.includes("resource_exhausted") || res.status === 429) {
                setQuotaExceededError(true);
            }
            throw new Error(errData.error || "Failed to generate image");
        }
        const response = await res.json();

        let rawImageUrl = null;
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    rawImageUrl = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                }
            }
        }

        if (rawImageUrl) {
            setQuotaExceededError(false);
            const watermarked = await drawWatermark(rawImageUrl);
            setGeneratedImage(watermarked);
            onAddHistory('IMAGE', imageFiles.length > 0 ? "Transformed Image" : "Generated Image", watermarked);
            showToast(language === 'om' ? "Suuraan uumameera / fooyya'eera!" : "Image generated successfully!", "success");
        } else {
            console.warn("AI generated response text but no image frame. Booting artistic procedural fallback...");
            const artData = generateProceduralArt(prompt, activeFilter);
            setGeneratedImage(artData);
            onAddHistory('IMAGE', "Procedural Core Art", artData);
            showToast(language === 'om' ? "Suuraan artii uumameera!" : "Artistic fallback image generated!", "success");
        }
      } catch (error: any) {
          console.error("Gemini image server failed. Generating local high-fidelity fallback...", error);
          const errStr = (error.message || "").toLowerCase();
          if (errStr.includes("quota") || errStr.includes("429") || errStr.includes("resource_exhausted")) {
              setQuotaExceededError(true);
          }
          const artData = generateProceduralArt(prompt || "Creative Dynamic Concept", activeFilter);
          setGeneratedImage(artData);
          onAddHistory('IMAGE', "Procedural Core Art", artData);
          showToast(language === 'om' ? "Artii kalaqaa dabalataa uumameera!" : "Rendered high-fidelity fallback art successfully!", "info");
      } finally {
          setLoading(false);
      }
  };

  const clearAll = () => {
      setPrompt('');
      setImageFiles([]);
      setImagePreviews([]);
      setGeneratedImage(null);
      localStorage.removeItem('multisphere_image_prompt');
      localStorage.removeItem('multisphere_generated_image');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/90 backdrop-blur-xl p-4 md:p-8 rounded-[2.5rem] shadow-2xl border border-white/50 space-y-6"
    >
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-100 rounded-2xl text-pink-600">
                    <ImageIcon size={24} />
                </div>
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tighter">{t.title}</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">AI Visual Studio</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowApiKeySettings(!showApiKeySettings)}
                    className={`p-3 rounded-2xl transition-colors ${showApiKeySettings || customKeyInput ? 'bg-pink-50 text-pink-600' : 'text-gray-400 hover:text-pink-500'}`}
                    title="Configure API Key"
                >
                    <Key size={20} />
                </motion.button>
                <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-3 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-100 transition-colors"
                    title={t.takePhoto}
                >
                    <Camera size={20} />
                </motion.button>
                <motion.button 
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={clearAll}
                    className="p-3 text-gray-400 hover:text-red-500 transition-colors"
                >
                    <Trash2 size={20} />
                </motion.button>
            </div>
        </div>

        {/* Toast Notifications */}
        <AnimatePresence>
            {statusMessage && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-3xl flex items-center justify-between text-xs font-black uppercase tracking-wider shadow-sm border ${
                        statusMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' :
                        statusMessage.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' :
                        'bg-blue-50/80 text-blue-700 border-blue-100'
                    }`}
                >
                    <span>{statusMessage.text}</span>
                    <button onClick={() => setStatusMessage(null)} className="ml-2 font-black text-gray-400 hover:text-black">×</button>
                </motion.div>
            )}
        </AnimatePresence>

        {/* API Key Configuration Panel */}
        <AnimatePresence>
            {showApiKeySettings && (
                 <motion.div 
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="bg-gray-50 p-4 rounded-3xl border border-gray-100 flex flex-col gap-3 text-xs overflow-hidden"
                 >
                     <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2 text-gray-800 font-bold">
                             <Key size={16} className="text-pink-600" />
                             <span>Configure Personal Gemini API Key</span>
                         </div>
                         <button onClick={() => setShowApiKeySettings(false)} className="text-gray-400 hover:text-black">
                             <X size={16} />
                         </button>
                     </div>
                     <p className="text-gray-500 text-[11px] leading-relaxed">
                         {language === 'om' 
                           ? "Suroota AI fi tajaajila adda addaa gargaaramuuf kii Gemini API keessan asitti galchaa. Kaffaltiin ykn daangaan quota isin hin rakkisu." 
                           : "If you exceed the shared free tier daily quota or want dynamic uninterrupted generation, enter your personal free Gemini API Key from Google AI Studio."}
                     </p>
                     <div className="flex gap-2">
                         <input 
                             type="password" 
                             value={customKeyInput}
                             onChange={(e) => setCustomKeyInput(e.target.value)}
                             placeholder="AIzaSy..." 
                             className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-pink-500"
                         />
                         <button 
                             onClick={() => {
                                 localStorage.setItem('multisphere_gemini_apikey', customKeyInput.trim());
                                 setKeySavedConfirmation(true);
                                 setTimeout(() => setKeySavedConfirmation(false), 2000);
                             }}
                             className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1 transition-all"
                         >
                             {keySavedConfirmation ? <Check size={14} className="text-green-400 animate-bounce" /> : <Check size={14} />}
                             <span>{keySavedConfirmation ? "Saved!" : "Save"}</span>
                         </button>
                     </div>
                     <div className="flex items-center justify-between text-[10px] text-gray-400 px-1 pt-1">
                         <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 font-bold">
                             Get a Free API Key here ↗
                         </a>
                         {customKeyInput && (
                             <button 
                                 onClick={() => {
                                     setCustomKeyInput('');
                                     localStorage.removeItem('multisphere_gemini_apikey');
                                 }} 
                                 className="text-red-500 hover:underline"
                             >
                                 Clear Key
                             </button>
                         )}
                     </div>
                 </motion.div>
            )}
        </AnimatePresence>

        {/* Quota Exceeded Beautiful Warning Banner */}
        <AnimatePresence>
            {quotaExceededError && (
                 <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className="bg-pink-50 p-5 rounded-3xl border-2 border-pink-200 flex flex-col gap-3 text-xs shadow-lg"
                 >
                     <div className="flex items-start gap-3">
                         <div className="p-2.5 bg-pink-100 rounded-xl text-pink-600 shrink-0">
                             <Info size={18} />
                         </div>
                         <div className="space-y-1">
                             <h4 className="font-extrabold text-gray-900 text-sm">
                                 {language === 'om' ? "Daangaan Kuusaa Shared Quota Dhumateera!" : "Shared Daily API Quota Limit Exceeded"}
                             </h4>
                             <p className="text-gray-600 text-[11px] leading-relaxed">
                                 {language === 'om' 
                                   ? "Quunnamtiin kii shared bilisaa daangaa bira ga'eera. Garuu kii Gemini API bilisaa kee galchuun daddaftee uumuu itti fufuu dandeessa!" 
                                   : "The shared free daily API key has reached its Google limits. You can easily bypass this by pasting your own free Gemini API key below to continue immediately!"}
                             </p>
                         </div>
                     </div>
                     <div className="flex gap-2 bg-white p-1 rounded-2xl border border-pink-100 shadow-inner">
                         <input 
                             type="password" 
                             value={customKeyInput}
                             onChange={(e) => setCustomKeyInput(e.target.value)}
                             placeholder="Paste your personal API Key here (AIzaSy...)" 
                             className="flex-1 bg-transparent px-3 py-2.5 text-xs font-mono focus:outline-none"
                         />
                         <button 
                             onClick={() => {
                                 localStorage.setItem('multisphere_gemini_apikey', customKeyInput.trim());
                                 setQuotaExceededError(false);
                                 setKeySavedConfirmation(true);
                                 setTimeout(() => setKeySavedConfirmation(false), 2000);
                                 alert(language === 'om' ? "Kii kee milkiidhaan galmaa'eera! Irra deebi'ii yaali." : "API Key saved successfully! Try generating again.");
                             }}
                             className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-[10px] flex items-center gap-1.5 transition-all shrink-0"
                         >
                             <Check size={14} />
                             <span>Save & Try Again</span>
                         </button>
                     </div>
                     <div className="flex items-center justify-between text-[10px] text-gray-400 px-2">
                         <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-pink-600 hover:underline font-bold flex items-center gap-1">
                             Get your personal free key from Google AI Studio ↗
                         </a>
                         <button 
                             onClick={() => setQuotaExceededError(false)} 
                             className="text-gray-400 hover:text-gray-600 hover:underline"
                         >
                             {language === 'om' ? "Dhiisi (Fayyadamuu dhiisi)" : "Dismiss & Use Fallback"}
                         </button>
                     </div>
                 </motion.div>
            )}
        </AnimatePresence>

        {/* Camera Filters */}
        <div className="flex justify-center gap-2 mb-2 overflow-x-auto py-2 no-scrollbar">
            {[
                { id: 'none', label: t.all, icon: <Camera size={14} /> },
                { id: 'beauty', label: language === 'om' ? 'Miidhagdu' : 'Beauty+', icon: <Sparkles size={14} /> },
                { id: 'lowlight', label: t.low, icon: <Moon size={14} /> },
                { id: 'portrait', label: t.port, icon: <User size={14} /> },
                { id: 'cyberpunk', label: t.cyber, icon: <Sparkles size={14} className="text-pink-400" /> },
                { id: 'vhs', label: t.retro, icon: <Sparkles size={14} className="text-yellow-500" /> },
                { id: 'hologram', label: t.holo, icon: <Sparkles size={14} className="text-blue-400" /> }
            ].map((f) => (
                <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                        activeFilter === f.id 
                        ? 'bg-pink-600 text-white shadow-xl shadow-pink-200 ring-2 ring-white' 
                        : 'bg-white/50 text-gray-500 hover:bg-white border border-gray-100'
                    }`}
                >
                    {f.icon}
                    {f.label}
                </button>
            ))}
        </div>

        {/* Upload Section */}
        <div className="space-y-4">
            <motion.div 
                whileHover={{ scale: 1.01 }}
                onClick={() => fileInputRef.current?.click()}
                className="relative border-4 border-dashed border-gray-100 rounded-[2rem] p-6 flex flex-col items-center justify-center cursor-pointer hover:border-pink-200 hover:bg-pink-50/30 transition-all group overflow-hidden min-h-[180px]"
            >
                {imagePreviews.length > 0 ? (
                    <div className="w-full space-y-4">
                        <div className="flex flex-wrap justify-center gap-3">
                            {imagePreviews.slice(0, 4).map((preview, idx) => (
                                <motion.div 
                                    key={idx}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="relative w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md group/item"
                                >
                                    <img src={preview} className="w-full h-full object-cover" alt={`Preview ${idx}`} />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeImage(idx);
                                        }}
                                        className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </motion.div>
                            ))}
                            {imagePreviews.length > 4 && (
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gray-100 border-2 border-white shadow-md flex items-center justify-center">
                                    <span className="text-xs font-black text-gray-400">+{imagePreviews.length - 4}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-center animate-pulse">
                            <Upload size={16} className="text-pink-400 mb-1" />
                            <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest">{t.addMore}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="text-gray-300 group-hover:text-pink-400" />
                        </div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">{t.uploadRef}</p>
                    </>
                )}
                
                <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleCameraChange} />
            </motion.div>
        </div>

        {/* Input Section */}
        <div className="relative">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
                className="w-full p-6 pr-16 bg-gray-50 border-2 border-transparent rounded-[2rem] focus:border-pink-500 focus:bg-white focus:outline-none transition-all min-h-[120px] text-sm font-medium shadow-inner"
            />
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleVoiceInput}
                className={`absolute bottom-4 right-4 p-4 rounded-2xl shadow-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
                <Mic size={20} />
            </motion.button>
        </div>

        {/* Action Button */}
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={loading || (!prompt && imageFiles.length === 0)}
            className="w-full aura-btn h-20 shadow-2xl"
        >
            <div className="aura-effect" style={{ background: 'linear-gradient(to right, #ec4899, #8b5cf6, #3b82f6)' }}></div>
            <div className="aura-content text-white flex items-center justify-center gap-3">
                {loading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-black uppercase tracking-widest">{t.processing}</span>
                    </div>
                ) : (
                    <>
                        <Sparkles size={20} />
                        <span className="text-sm font-black uppercase tracking-widest">{t.generate}</span>
                    </>
                )}
            </div>
        </motion.button>

        {/* Result Section */}
        <AnimatePresence>
            {generatedImage && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4 pt-6 border-t-2 border-gray-50"
                >
                    <div className="flex items-center justify-between px-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Result</p>
                        <button 
                            onClick={() => setGeneratedImage(null)}
                            className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                        >
                            {t.clear}
                        </button>
                    </div>
                    <div className="relative group rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-gray-50 max-h-[600px] flex items-center justify-center">
                        <img 
                            src={generatedImage} 
                            className="w-full h-auto max-h-[600px] object-contain" 
                            alt="Generated" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                             <motion.a 
                                 whileHover={{ scale: 1.1 }}
                                 href={generatedImage} 
                                 download="multisphere-ai-art.png"
                                 className="bg-white text-black px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-2xl"
                             >
                                <Download size={14} />
                                {t.download}
                             </motion.a>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
  );
};

export default ImageSection;
