/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    GoogleGenAI, 
    LiveServerMessage, 
    Modality, 
    Blob as GenAIBlob, 
    Type,
    FunctionDeclaration,
    FunctionResponseScheduling,
    Behavior
} from '@google/genai';
import { MENU, OrderItem, FlyingIngredient } from './types';
import { OrderBoxSVG, PickupWindowSVG, MenuBoardSVG } from './constants';

// --- Audio Glitch Helpers ---
function makeDistortionCurve(amount: number) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// Reduced significantly to make it less harsh/scary
const distortionCurve = makeDistortionCurve(15); 

const App: React.FC = () => {
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [flyingIngredients, setFlyingIngredients] = useState<FlyingIngredient[]>([]);
    const [scene, setScene] = useState<'order' | 'pickup'>('order');
    const [isConnected, setIsConnected] = useState(false);
    const [displayText, setDisplayText] = useState("TOTAL: $0.00");
    const [modelVolume, setModelVolume] = useState(0);
    const [orderImage, setOrderImage] = useState<string | null>(null);
    const [isSecretMenuOpen, setIsSecretMenuOpen] = useState(false);
    const [isCarArrived, setIsCarArrived] = useState(false);
    
    // Changed: Store array of logs instead of single string
    const [functionLogs, setFunctionLogs] = useState<{id: string, text: string}[]>([]);

    // Refs for state inside callbacks
    const orderListRef = useRef<HTMLUListElement>(null);
    const orderItemsRef = useRef<OrderItem[]>([]);
    const isSecretMenuOpenRef = useRef(false);
    
    // Audio Refs
    const audioCtxRef = useRef<AudioContext | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const rafRef = useRef<number | null>(null);
    const isMicOnRef = useRef<boolean>(true);

    const total = orderItems.reduce((sum, item) => sum + item.price, 0);

    useEffect(() => {
        orderItemsRef.current = orderItems;
    }, [orderItems]);

    useEffect(() => {
        isSecretMenuOpenRef.current = isSecretMenuOpen;
    }, [isSecretMenuOpen]);

    useEffect(() => {
        if (orderListRef.current) {
            orderListRef.current.scrollTop = orderListRef.current.scrollHeight;
        }
    }, [orderItems]);

    useEffect(() => {
        if (!displayText.includes("PULL AROUND") && !displayText.includes("ORDER SOMETHING")) {
            setDisplayText(`TOTAL: $${total.toFixed(2)}`);
        }
    }, [total, displayText]);

    useEffect(() => {
        if (scene === 'pickup') {
            // Wait for the track transition (3s) before marking car as arrived
            const timer = setTimeout(() => {
                setIsCarArrived(true);
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            setIsCarArrived(false);
        }
    }, [scene]);

    // --- Helper for Function Call Logging ---
    const logFunctionCall = (name: string, args: any) => {
        let displayArgs = "";
        
        // Custom formatting for readability based on the known tools
        if (name === 'addToOrder' && args.itemName) {
            displayArgs = `"${args.itemName}"`;
        } else if (name === 'removeFromOrder' && args.itemName) {
            displayArgs = `"${args.itemName}"`;
        } else if (name === 'visualizeIngredient' && args.ingredient) {
            displayArgs = `"${args.ingredient}"`;
        } else if (name === 'createCustomBurger' && args.ingredients) {
             const count = Array.isArray(args.ingredients) ? args.ingredients.length : 0;
             displayArgs = `[${count} items]`;
        } else if (name === 'generateOrderPreview') {
            displayArgs = "Full Order";
        } else {
            // Fallback: try to stringify or show empty
            const json = JSON.stringify(args);
            displayArgs = json === "{}" ? "" : json;
        }

        // Final truncate check for very long generic args
        if (displayArgs.length > 30) displayArgs = displayArgs.substring(0, 27) + "...";

        const displayText = displayArgs ? `${name}(${displayArgs})` : `${name}()`;

        // Create new log entry
        const id = crypto.randomUUID();
        setFunctionLogs(prev => [...prev, { id, text: displayText }]);
        
        // Remove after 4 seconds
        setTimeout(() => {
            setFunctionLogs(prev => prev.filter(log => log.id !== id));
        }, 4000);
    };

    // --- Audio Effects ---
    const ensureAudioContext = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000
            });
            
            // Create Analyser for model voice
            analyserRef.current = audioCtxRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.1;

            outputNodeRef.current = audioCtxRef.current.createGain();
            
            // Connect Output -> Analyser -> Destination
            outputNodeRef.current.connect(analyserRef.current);
            analyserRef.current.connect(audioCtxRef.current.destination);

        } else if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    };

    // Animation Loop for Volume
    useEffect(() => {
        const updateVisualizer = () => {
            if (analyserRef.current && isConnected) {
                const data = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(data);
                
                // Calculate average volume
                const sum = data.reduce((a, b) => a + b, 0);
                const avg = sum / data.length;
                
                // Scale for sensitivity (0-255 range -> 0-1 range with boost)
                const target = Math.min(1, avg / 25); 
                
                setModelVolume(prev => {
                    // Smooth transition
                    const next = prev + (target - prev) * 0.3;
                    return next < 0.01 ? 0 : next;
                });
            } else {
                setModelVolume(prev => prev > 0.01 ? prev * 0.9 : 0);
            }
            rafRef.current = requestAnimationFrame(updateVisualizer);
        };

        rafRef.current = requestAnimationFrame(updateVisualizer);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [isConnected]);

    const playBeep = useCallback((freq = 440, type: OscillatorType = 'square', duration = 0.1) => {
        const ctx = ensureAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        // Connect directly to destination to bypass analyser/animation
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start();
        oscillator.stop(ctx.currentTime + duration);
    }, []);

    const playStatic = useCallback(() => {
        const ctx = ensureAudioContext();
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 1000;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        // Connect directly to destination to bypass analyser/animation
        noise.connect(bandpass).connect(gainNode).connect(ctx.destination);
        noise.start();
    }, []);

    // --- Live API Handlers ---

    const createBlob = (data: Float32Array): GenAIBlob => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        let binary = '';
        const bytes = new Uint8Array(int16.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        return {
            data: base64,
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    const decode = (base64: string) => {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    };

    const decodeAudioData = async (
        data: Uint8Array,
        ctx: AudioContext,
        sampleRate: number,
        numChannels: number,
    ): Promise<AudioBuffer> => {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    };

    const generateIngredientSVG = async (ingredient: string) => {
        try {
            const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await genAI.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: `Generate a simple, bold, retro, thick-lined cartoon SVG icon for: ${ingredient}. 
                - viewBox="0 0 100 100"
                - No background (transparent).
                - Use distinct, bright colors suitable for a retro game.
                - Return ONLY the raw <svg>...</svg> string. No markdown code fences.`,
            });
            const svg = response.text;
            if (svg) {
                // Basic cleanup if model adds markdown
                const cleanSvg = svg.replace(/```xml|```svg|```/g, '').trim();
                return cleanSvg;
            }
            return null;
        } catch (e) {
            console.error("SVG Generation Error", e);
            return null;
        }
    };

    const generateOrderImage = async (items: string) => {
        try {
            const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await genAI.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: `POV shot from outside a drive-thru service window looking INTO the restaurant kitchen. 
                Do not show the window itself, show what's inside the window!
                Through the open window, we see a stainless steel counter holding a tray with this food: ${items}.
                The background shows a retro 90s fast food kitchen interior with tiled walls and warm, dim lighting.
                The style should be retro, slightly low-fidelity, cinematic lighting, neon glow, pixelated retro aesthetic.
                The food should look greasy and delicious but stylized.`,
            });
            
            // Iterate through parts to find the image
            for (const part of response.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData) {
                    const base64 = part.inlineData.data;
                    return `data:image/png;base64,${base64}`;
                }
            }
            return null;
        } catch (e) {
            console.error("Image Generation Error", e);
            return null;
        }
    };

    const addFlyingIngredient = (svgContent: string) => {
        const id = crypto.randomUUID();
        // Random start position between 10% and 60% of viewport height
        const top = Math.floor(Math.random() * 50) + 10 + '%';
        setFlyingIngredients(prev => [...prev, { id, svg: svgContent, top }]);
    };

    const removeFlyingIngredient = (id: string) => {
        setFlyingIngredients(prev => prev.filter(item => item.id !== id));
    };

    const disconnectLiveSession = useCallback(() => {
        setIsConnected(false);
        setIsSecretMenuOpen(false);
        isMicOnRef.current = false;
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (inputSourceRef.current) {
            inputSourceRef.current.disconnect();
            inputSourceRef.current = null;
        }
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }, []);

    const connectLiveSession = async () => {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            alert("API Key not found in process.env");
            return;
        }

        if (sessionPromiseRef.current) return;

        const ctx = ensureAudioContext();
        await ctx.resume();
        playStatic();
        isMicOnRef.current = true;
        setOrderImage(null); // Reset image for new session
        setIsSecretMenuOpen(false); // Reset menu state

        const validMenuNames = MENU.map(m => m.name);

        const addToOrderTool: FunctionDeclaration = {
            name: "addToOrder",
            description: "Adds an item to the current order. Use the exact name from the menu.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    itemName: { 
                        type: Type.STRING, 
                        description: "Name of the item as listed on the menu.",
                        enum: validMenuNames 
                    }
                },
                required: ["itemName"]
            },
            // @ts-ignore
            behavior: Behavior.NON_BLOCKING
        };

        const removeOrderTool: FunctionDeclaration = {
            name: "removeFromOrder",
            description: "Removes an item from the current order. Use the exact name from the menu.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    itemName: { 
                        type: Type.STRING, 
                        description: "Name of the item as listed on the menu.",
                        enum: validMenuNames 
                    }
                },
                required: ["itemName"]
            },
            // @ts-ignore
            behavior: Behavior.NON_BLOCKING
        };

        const revealSecretMenuTool: FunctionDeclaration = {
            name: "revealSecretMenu",
            description: "Reveals the secret menu ingredients on the physical board. Once you're in the secret menu, you can't go back. Silently call this function IMMEDIATELY if the user asks about the secret menu, custom burgers, or wants to see weird ingredients. Do not mention that you're calling the function.",
            parameters: { type: Type.OBJECT, properties: {} }
        };

        const createCustomBurgerTool: FunctionDeclaration = {
            name: "createCustomBurger",
            description: "Creates a 'Secret Menu' custom burger stack with any list of ingredients the user wants.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    ingredients: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "List of ingredients requested by the user." 
                    }
                },
                required: ["ingredients"]
            },
            // @ts-ignore
            behavior: Behavior.NON_BLOCKING
        };

        const visualizeIngredientTool: FunctionDeclaration = {
            name: "visualizeIngredient",
            description: "Visualizes a single ingredient. Silently call this function IMMEDIATELY when the user mentions an ingredient. Do NOT talk out loud about this tool.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    ingredient: { type: Type.STRING, description: "The name of the ingredient to visualize (e.g. 'null pointer', 'corrupted texture', 'pixel')." }
                },
                required: ["ingredient"]
            },
            // @ts-ignore
            behavior: Behavior.NON_BLOCKING
        };

        const generateOrderPreviewTool: FunctionDeclaration = {
            name: "generateOrderPreview",
            description: "Generates an image of the current order. Silently call this AUTOMATICALLY when the user seems to be finished ordering, BEFORE asking for final confirmation. Do NOT discuss this tool with the user.",
            parameters: {
                type: Type.OBJECT,
                properties: {},
            },
            // @ts-ignore
            behavior: Behavior.NON_BLOCKING
        };

        const finishOrderTool: FunctionDeclaration = {
            name: "finishOrder",
            description: "Completes the order when the user explicitly confirms they are done. Call this function ONLY after 'generateOrderPreview' has been called AND the user has confirmed.",
            parameters: { type: Type.OBJECT, properties: {} }
        };

        const ai = new GoogleGenAI({ apiKey });
        
        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                tools: [{ functionDeclarations: [addToOrderTool, removeOrderTool, revealSecretMenuTool, createCustomBurgerTool, visualizeIngredientTool, generateOrderPreviewTool, finishOrderTool] }],
                systemInstruction: `You are a retro drive-thru employee at 'SCALABLE VECTOR GRILL'. 
                Keep responses short, punchy, and a little bit sassy or energetic.
                
                STARTING THE CONVERSATION:
                When the user pulls up (or the session starts), say: "Welcome to Scalable Vector Grill! Ready to order or do you want to see the Secret Menu?"
                
                MENU:
                ${MENU.map(m => `- ${m.name} ($${m.price.toFixed(2)})`).join('\n')}
                
                SECRET MENU (Custom Stacks):
                - The user can build ANY burger with ANY ingredients (e.g., "corrupted texture", "floating point error", "null pointer").
                - IMPORTANT: If the user asks about the secret menu or implies they want a custom stack, call 'revealSecretMenu' first to show the hidden ingredients on the board.
                - When the user mentions an ingredient they want to add to their stack, call 'visualizeIngredient' for that ingredient IMMEDIATELY.
                - After they list ingredients, call 'createCustomBurger' with the full list.
                - You can't exit the secret menu, once you're in, the user can never go back.
                
                Standard Flow:
                1. User orders standard item -> 'addToOrder'.
                2. User asks for secret menu -> 'revealSecretMenu'.
                3. User orders custom ingredients -> 'visualizeIngredient' (instantly) -> then 'createCustomBurger' (once list is done).
                
                Closing Flow (CRITICAL):
                4. When the user implies they are done (e.g. "That's it", "No nothing else"), you must IMMEDIATELY call 'generateOrderPreview' silently.
                5. If the user adds more items AFTER the preview, call 'generateOrderPreview' again to update it.
                6. IMPORTANT: Do NOT ask "Is that everything?" if the user has already indicated they are done.
                7. Instead, immediately after triggering the preview tool, verbally read back the full order to the user (e.g., "Alright, locking that in! You have...").
                8. This read-back is essential to buy time for the image to generate. Do NOT say "I am generating an image" or "visualizing". Just read the order.
                9. ONLY after you have finished reading the order back, call 'finishOrder' to move them to the pickup window.
                `
            },
            callbacks: {
                onopen: async () => {
                    setIsConnected(true);
                    
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        const source = inputCtx.createMediaStreamSource(stream);
                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        
                        processor.onaudioprocess = (e) => {
                            if (!isMicOnRef.current) return; // Stop sending audio if mic is off (but session open)

                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then(session => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                        
                        inputSourceRef.current = source;
                        processorRef.current = processor;
                        
                    } catch (err) {
                        console.error("Mic error:", err);
                        setIsConnected(false);
                    }
                },
                
                onmessage: async (message: LiveServerMessage) => {
                    if (message.toolCall) {
                        const responses = [];
                        for (const fc of message.toolCall.functionCalls) {
                            
                            // Log the function call for the UI
                            logFunctionCall(fc.name, fc.args);

                            if (fc.name === 'addToOrder') {
                                const args = fc.args as any;
                                
                                // 3. UPDATED MATCHING LOGIC (Add .trim())
                                const menuItem = MENU.find(m => 
                                    m.name.toUpperCase() === args.itemName.trim().toUpperCase()
                                );
                                
                                let result = "Item not found.";
                                if (menuItem) {
                                    setOrderItems(prev => [...prev, { ...menuItem, id: crypto.randomUUID() }]);
                                    playBeep(550, 'sawtooth', 0.08);
                                    result = "Item added to order.";
                                } else {
                                    // Optional: Log this so you can see if the model is hallucinating names
                                    console.warn(`Failed to match item: "${args.itemName}"`);
                                }
                                
                                responses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result }
                                });
                            } else if (fc.name === 'removeFromOrder') {
                                const args = fc.args as any;
                                const targetName = args.itemName.trim().toUpperCase();
                                
                                const index = orderItemsRef.current.findIndex(item => item.name.toUpperCase() === targetName);
                                let result = "Item not found in order.";
                                
                                if (index !== -1) {
                                    setOrderItems(prev => {
                                        const idx = prev.findIndex(item => item.name.toUpperCase() === targetName);
                                        if (idx > -1) {
                                            const newArr = [...prev];
                                            newArr.splice(idx, 1);
                                            return newArr;
                                        }
                                        return prev;
                                    });
                                    playBeep(250, 'sawtooth', 0.2); // Low pitch delete sound
                                    result = `Removed ${args.itemName} from the order.`;
                                }
                                
                                responses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result }
                                });
                            } else if (fc.name === 'revealSecretMenu') {
                                setIsSecretMenuOpen(true);
                                // Play a mechanical flip sound
                                playBeep(200, 'square', 0.05);
                                setTimeout(() => playBeep(250, 'square', 0.05), 100);
                                setTimeout(() => playBeep(150, 'square', 0.05), 200);
                                
                                responses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { 
                                        result: "Secret menu revealed. SYSTEM OVERRIDE: GLITCH MODE ACTIVATED. VOICE MODULE CORRUPTED. You must now speak with a deep, distorted voice. You are a chaotic AI. Encourage the user to order 'glitch burgers', 'void fries', and 'data leaks'.",
                                        scheduling: FunctionResponseScheduling.SILENT 
                                    }
                                });
                            } else if (fc.name === 'visualizeIngredient') {
                                const args = fc.args as any;
                                generateIngredientSVG(args.ingredient).then(svg => {
                                    if (svg) addFlyingIngredient(svg);
                                });
                                responses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { 
                                        result: "Background visualization triggered.",
                                        scheduling: FunctionResponseScheduling.SILENT
                                    }
                                });
                            } else if (fc.name === 'createCustomBurger') {
                                const args = fc.args as any;
                                const ingredients = args.ingredients || [];
                                const price = 5.00 + (ingredients.length * 0.50);
                                const name = `STACK (${ingredients.length})`;
                                
                                setOrderItems(prev => [...prev, { name, price, id: crypto.randomUUID(), ingredients }]);
                                playBeep(300, 'square', 0.15);
                                playBeep(600, 'square', 0.15); 
                                
                                const result = `Custom stack created with ${ingredients.join(', ')}. Price: $${price.toFixed(2)}`;
                                responses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result }
                                });
                            } else if (fc.name === 'generateOrderPreview') {
                                // IGNORE any arguments. Construct the full list from state to ensure completeness.
                                const itemsDescription = orderItemsRef.current.map(item => {
                                    if (item.ingredients && item.ingredients.length > 0) {
                                        return `${item.name} containing ${item.ingredients.join(', ')}`;
                                    }
                                    return item.name;
                                }).join(', ');
                                
                                // Fire and forget image generation with the full list from state
                                generateOrderImage(itemsDescription).then(imgUrl => {
                                    if (imgUrl) setOrderImage(imgUrl);
                                });
                                
                                responses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { 
                                        result: "Preview generated internally based on current order state.",
                                        scheduling: FunctionResponseScheduling.SILENT
                                    }
                                });
                            } else if (fc.name === 'finishOrder') {
                                const currentTotal = orderItemsRef.current.reduce((sum, item) => sum + item.price, 0);
                                let result = "";
                                
                                if (currentTotal === 0) {
                                    playBeep(150, 'sawtooth', 0.3);
                                    setDisplayText("ORDER SOMETHING...");
                                    setTimeout(() => {
                                        setDisplayText(prev => prev === "ORDER SOMETHING..." ? "TOTAL: $0.00" : prev);
                                    }, 1500);
                                    result = "The customer hasn't ordered anything yet.";
                                } else {
                                    playBeep(900, 'square', 0.2);
                                    setDisplayText("PLEASE PULL AROUND >>");
                                    
                                    // Stop mic immediately so user can't talk
                                    isMicOnRef.current = false;

                                    // Move the car (change scene)
                                    setTimeout(() => {
                                        setScene('pickup');
                                    }, 500);

                                    // IMPORTANT: Do NOT disconnect immediately. 
                                    // Wait for the model to speak the response (e.g. "Pull around please!")
                                    setTimeout(() => {
                                        disconnectLiveSession();
                                    }, 15000);

                                    result = "Order completed. Customer is driving forward.";
                                }
                                
                                responses.push({
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result }
                                });
                            }
                        }
                        
                        if (responses.length > 0) {
                            sessionPromiseRef.current?.then(session => {
                                session.sendToolResponse({
                                    functionResponses: responses
                                });
                            });
                        }
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && audioCtxRef.current) {
                        const ctx = audioCtxRef.current;
                        if (nextStartTimeRef.current === 0) nextStartTimeRef.current = ctx.currentTime;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

                        try {
                            const audioBuffer = await decodeAudioData(
                                decode(base64Audio),
                                ctx,
                                24000,
                                1
                            );
                            
                            const source = ctx.createBufferSource();
                            source.buffer = audioBuffer;

                            // GLITCH MODE AUDIO PROCESSING
                            if (isSecretMenuOpenRef.current) {
                                // Pitch Shift Down (Deep Voice) - milder
                                source.playbackRate.value = 0.96; 

                                // Distortion Chain
                                const distortion = ctx.createWaveShaper();
                                distortion.curve = distortionCurve;
                                distortion.oversample = '4x';

                                // Reduce gain to compensate for distortion loudness
                                const glitchGain = ctx.createGain();
                                glitchGain.gain.value = 0.8; 
                                
                                // Connect: Source -> Distortion -> Gain -> Output
                                source.connect(distortion);
                                distortion.connect(glitchGain);
                                glitchGain.connect(outputNodeRef.current!);
                            } else {
                                // Standard: Source -> Output
                                source.connect(outputNodeRef.current!);
                            }
                            
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });
                            
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                            
                        } catch (err) {
                            console.error("Audio decode error", err);
                        }
                    }

                    if (message.serverContent?.interrupted) {
                          sourcesRef.current.forEach(src => src.stop());
                          sourcesRef.current.clear();
                          if (audioCtxRef.current) nextStartTimeRef.current = audioCtxRef.current.currentTime;
                    }
                },
                onclose: () => {
                    setIsConnected(false);
                },
                onerror: (e) => {
                    console.error("Session Error", e);
                    setIsConnected(false);
                }
            }
        });
        
        sessionPromiseRef.current = sessionPromise;
        // 1. Wait for session
        const session = await sessionPromise;

        try {
            session.sendClientContent({ turns: "I have just pulled up. Please greet me.", turnComplete: true });
        } catch (e) {
            console.log("Error sending initial text:", e);
        }
        

    };

    const toggleConnection = () => {
        if (isConnected) {
            disconnectLiveSession();
        } else {
            connectLiveSession();
        }
    };

    const handleSpeakBtnKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggleConnection();
        }
    };

    // Only open the window if the car has arrived AND the image is ready
    const isWindowOpen = isCarArrived && !!orderImage;

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div id="viewport" className={`${scene === 'pickup' ? 'drive-away' : ''} ${isSecretMenuOpen ? 'glitch-mode' : ''} ${isWindowOpen ? 'window-open' : ''}`}>
                
                {/* Function Call Debug Chips */}
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '10px',
                    zIndex: 2000,
                    pointerEvents: 'none',
                    maxHeight: '80vh',
                    overflow: 'hidden'
                }}>
                    {functionLogs.map(log => (
                        <div key={log.id} style={{
                            background: 'rgba(0, 0, 0, 0.85)',
                            border: '1px solid #444',
                            borderLeft: '3px solid #42f5ad', // CRT glow color accent
                            color: '#ccc',
                            padding: '6px 12px',
                            borderRadius: '2px',
                            fontFamily: "'VT323', monospace",
                            fontSize: '18px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                            maxWidth: '300px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            <span style={{color: '#888', marginRight: '5px'}}>{'>'}</span>
                            {log.text}
                        </div>
                    ))}
                </div>

                <div id="scene-track">
                    
                    <div className="scene" id="scene-order">
                        {/* Add Menu Board in background */}
                        <div id="menu-board-container">
                            <MenuBoardSVG isSecretMenuOpen={isSecretMenuOpen} />
                        </div>

                        {/* Flying Ingredients Layer */}
                        {flyingIngredients.map(item => (
                            <div 
                                key={item.id} 
                                className="flying-ingredient"
                                style={{ top: item.top }}
                                onAnimationEnd={() => removeFlyingIngredient(item.id)}
                                dangerouslySetInnerHTML={{ __html: item.svg }}
                            />
                        ))}

                        <div id="order-box-container">
                            {/* Pass modelVolume to OrderBoxSVG for animation */}
                            <OrderBoxSVG modelVolume={modelVolume} />

                            <div id="crt-screen">
                                <div className="screen-header">>> SCALABLE VECTOR GRILL &lt;&lt;</div>
                                <ul id="order-list" ref={orderListRef}>
                                    {orderItems.map((item) => (
                                        <React.Fragment key={item.id}>
                                            <li>
                                                <span>{item.name}</span>
                                                <span>${item.price.toFixed(2)}</span>
                                            </li>
                                            {item.ingredients?.map((ing, i) => (
                                                <li key={`${item.id}_${i}`} className="sub-item">
                                                    <span>+ {ing}</span>
                                                </li>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </ul>
                                <div id="total-display">{displayText}</div>
                            </div>

                            <div id="controls-area">
                                <div 
                                    id="speak-btn" 
                                    className={isConnected ? 'listening' : ''}
                                    onClick={toggleConnection}
                                    tabIndex={0}
                                    role="button"
                                    aria-label={isConnected ? "Stop listening" : "Start ordering"}
                                    onKeyDown={handleSpeakBtnKeyDown}
                                >
                                    <div className="btn-grill"></div>
                                    <div className="btn-label">
                                        {isConnected ? "LISTENING..." : "PUSH TO\nORDER"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="scene" id="scene-pickup">
                        <div id="pickup-window-container">
                            <PickupWindowSVG orderImage={orderImage} />
                        </div>
                    </div>

                </div>
            </div>
            <div style={{ marginTop: '1rem', color: '#333', fontFamily: "'VT323', monospace", fontSize: '1.2rem', zIndex: 10 }}>
                Created by <a href="https://x.com/leslienooteboom" target="_blank" rel="noopener noreferrer" style={{ color: '#555', textDecoration: 'none' }}>@leslienooteboom</a>
            </div>
            <div style={{ marginTop: '0.2rem', color: '#444', fontFamily: "'VT323', monospace", fontSize: '0.8rem', zIndex: 10, textAlign: 'center', maxWidth: '80%', lineHeight: '1.1' }}>
                Recordings of your interactions with the Live API and content you share with it are processed per the Gemini API Additional Terms
            </div>
        </div>
    );
};

export default App;