/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { MENU } from './types';

const SECRET_ITEMS = [
    { name: "DOUBLE GLITCH", price: 7.45 },
    { name: "VECTOR SAUCE", price: 0.40 },
    { name: "MEMORY LEEK", price: 2.56 },
    { name: "BINARY LETTUCE", price: 1.01 },
    { name: "DEAD PIXELS", price: 0.50 },
    { name: "SEASONAL HACK", price: 7.30 },
];

export const OrderBoxSVG: React.FC<{ modelVolume?: number }> = ({ modelVolume = 0 }) => (
    <svg className="box-svg-layer" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        <defs>
            <linearGradient id="metalGradVertical" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor: 'var(--metal-dark)'}} />
                <stop offset="20%" style={{stopColor: 'var(--metal-light)'}} />
                <stop offset="50%" style={{stopColor: 'var(--metal-mid)'}} />
                <stop offset="80%" style={{stopColor: 'var(--metal-light)'}} />
                <stop offset="100%" style={{stopColor: 'var(--metal-dark)'}} />
            </linearGradient>
            <pattern id="speakerHoles" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="2.5" fill="#222" />
            </pattern>
        </defs>
        {/* Extended pole height to 2000 to ensure it goes off-screen */}
        <rect x="160" y="500" width="80" height="2000" fill="url(#metalGradVertical)" stroke="#222" strokeWidth="2"/>
        <path d="M 30 50 C 30 30, 370 30, 370 50 L 370 550 C 370 570, 30 570, 30 550 Z" fill="url(#metalGradVertical)" stroke="#111" strokeWidth="4"/>
        
        {/* Speaker Grill */}
        <rect x="50" y="495" width="300" height="40" fill="url(#speakerHoles)" rx="4" stroke="#333" strokeWidth="3"/>
        <rect x="50" y="495" width="300" height="40" fill="url(#metalGradVertical)" opacity="0.2" rx="4"/>
        
        {/* Volume Responsive Glow */}
        <rect 
            x="50" y="495" width="300" height="40" 
            fill="#ffce00" 
            rx="4" 
            opacity={modelVolume} 
            style={{ 
                filter: 'blur(5px)', 
                mixBlendMode: 'screen',
                transition: 'opacity 0.05s linear' 
            }} 
        />
    </svg>
);

export const MenuBoardSVG: React.FC<{ isSecretMenuOpen: boolean }> = ({ isSecretMenuOpen }) => (
    <svg className="menu-svg-layer" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg" style={{ overflow: 'visible' }}>
        <defs>
            {/* 3D Pole Gradient */}
            <linearGradient id="poleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#111" />
                <stop offset="30%" stopColor="#444" />
                <stop offset="50%" stopColor="#666" />
                <stop offset="70%" stopColor="#444" />
                <stop offset="100%" stopColor="#111" />
            </linearGradient>

            {/* Board Frame Gradient */}
            <linearGradient id="boardFrame3D" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: '#5c4b35'}} />
                <stop offset="10%" style={{stopColor: '#8c7b65'}} />
                <stop offset="50%" style={{stopColor: '#3a2817'}} />
                <stop offset="90%" style={{stopColor: '#8c7b65'}} />
                <stop offset="100%" style={{stopColor: '#1a1005'}} />
            </linearGradient>

            {/* Neon Text Filter */}
            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>

            {/* Grid Pattern for Background */}
            <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                 <rect width="20" height="20" fill="#222"/>
                 <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1"/>
            </pattern>
            
            {/* Header Gradient - Darker to blend with board */}
            <linearGradient id="headerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: '#7d6b55'}} /> 
                <stop offset="50%" style={{stopColor: '#4d3e2e'}} /> 
                <stop offset="100%" style={{stopColor: '#2b1e14'}} /> 
            </linearGradient>
            
            {/* Rim Light for Border 3D effect */}
            <linearGradient id="rimLight" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6"/>
                <stop offset="20%" stopColor="#ffffff" stopOpacity="0.2"/>
                <stop offset="80%" stopColor="#000000" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#000000" stopOpacity="0.8"/>
            </linearGradient>

            <style>
                {`
                    @keyframes neonFlicker {
                        0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 1; filter: url(#neonGlow); }
                        20%, 24%, 55% { opacity: 0.7; filter: none; }
                    }
                    .neon-text { animation: neonFlicker 3s infinite alternate; }
                    
                    @keyframes pulseText {
                        0% { fill: #aaa; }
                        50% { fill: #fff; }
                        100% { fill: #aaa; }
                    }
                    .secret-text { animation: pulseText 2s infinite; }
                    
                    @keyframes blinkLed {
                        0% { opacity: 0.3; }
                        45% { opacity: 0.3; }
                        50% { opacity: 1; }
                        55% { opacity: 0.3; }
                        100% { opacity: 0.3; }
                    }
                    .led-blink { animation: blinkLed 2s infinite; }
                    
                    /* Flipboard Styles */
                    .menu-row {
                        transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                        transform-origin: 50% 12px; /* Center of the row text roughly */
                    }
                    .flipped-out {
                        transform: scaleY(0);
                        opacity: 0;
                    }
                    .flipped-in {
                        transform: scaleY(1);
                        opacity: 1;
                    }
                    /* Stagger delays for flip effect */
                    ${Array.from({length: 8}, (_, i) => `
                        .row-${i} { transition-delay: ${i * 0.1}s; }
                    `).join('')}
                `}
            </style>
        </defs>
        
        {/* Poles with 3D Gradient */}
        <rect x="50" y="580" width="20" height="1000" fill="url(#poleGradient)" />
        <rect x="330" y="580" width="20" height="1000" fill="url(#poleGradient)" />
        
        {/* Pole Base Shadows */}
        <path d="M 40 580 L 80 580 L 60 590 Z" fill="#000" opacity="0.5" filter="blur(3px)" />
        <path d="M 320 580 L 360 580 L 340 590 Z" fill="#000" opacity="0.5" filter="blur(3px)" />

        <g>
            {/* Board Main Frame */}
            <rect x="0" y="0" width="400" height="600" rx="10" fill="url(#gridPattern)" stroke="url(#boardFrame3D)" strokeWidth="16" />
            
            {/* Outer Border Highlight (Rim Light) */}
            <rect x="-8" y="-8" width="416" height="616" rx="18" fill="none" stroke="url(#rimLight)" strokeWidth="2" />
            
            {/* Inner Border Shadow */}
            <rect x="8" y="8" width="384" height="584" rx="4" fill="none" stroke="#000" strokeWidth="4" opacity="0.3" />

            {/* Decorative Screws in Corners */}
            <circle cx="20" cy="20" r="5" fill="#888" stroke="#111" strokeWidth="1" />
            <line x1="17" y1="20" x2="23" y2="20" stroke="#333" strokeWidth="1" transform="rotate(45 20 20)"/>
            
            <circle cx="380" cy="20" r="5" fill="#888" stroke="#111" strokeWidth="1" />
            <line x1="377" y1="20" x2="383" y2="20" stroke="#333" strokeWidth="1" transform="rotate(15 380 20)"/>
            
            <circle cx="20" cy="580" r="5" fill="#888" stroke="#111" strokeWidth="1" />
            <line x1="17" y1="580" x2="23" y2="580" stroke="#333" strokeWidth="1" transform="rotate(-30 20 580)"/>
            
            <circle cx="380" cy="580" r="5" fill="#888" stroke="#111" strokeWidth="1" />
            <line x1="377" y1="580" x2="383" y2="580" stroke="#333" strokeWidth="1" transform="rotate(90 380 580)"/>
            
            {/* Header Section */}
            <g transform="translate(0, 5)">
                <rect x="30" y="30" width="340" height="70" fill="url(#headerGrad)" rx="4"  style={{boxShadow: "0 5px 10px rgba(0,0,0,0.5)"}} />
                {/* Gloss on Header */}
                <path d="M 32 32 L 368 32 L 368 60 C 368 60 200 80 32 60 Z" fill="#fff" opacity="0.1" />
                
                <text x="200" y="75" textAnchor="middle" fill="#ffeebb" fontFamily="monospace" fontSize="38" fontWeight="bold" className="neon-text" style={{textShadow: "0 0 8px #ffaa00"}}>
                    SVG MENU
                </text>
            </g>

            {/* Menu Items */}
            <g transform="translate(40, 130)">
                {MENU.map((item, i) => (
                    <g key={i} transform={`translate(0, ${i * 48})`}>
                        {/* Alternating Row Backgrounds */}
                        <rect x="-10" y="0" width="340" height="32" rx="4" fill={i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent"} />
                        
                        {/* Standard Menu Item */}
                        <g className={`menu-row row-${i} ${isSecretMenuOpen ? 'flipped-out' : 'flipped-in'}`}>
                            <text x="0" y="22" fill="#ffebcd" fontFamily="monospace" fontSize="24" fontWeight="bold" style={{textShadow: "2px 2px 0px #000"}}>
                                {item.name}
                            </text>
                            <text x="320" y="22" textAnchor="end" fill="#ffae42" fontFamily="monospace" fontSize="24" style={{textShadow: "2px 2px 0px #000"}}>
                                ${item.price.toFixed(2)}
                            </text>
                        </g>

                        {/* Secret Menu Item - Flipping In */}
                        <g className={`menu-row row-${i} ${isSecretMenuOpen ? 'flipped-in' : 'flipped-out'}`}>
                            <text x="0" y="22" fill="#42f5ad" fontFamily="monospace" fontSize="24" fontWeight="bold" style={{textShadow: "2px 2px 0px #000"}}>
                                {SECRET_ITEMS[i]?.name || "UNKNOWN"}
                            </text>
                            <text x="320" y="22" textAnchor="end" fill="#267a56" fontFamily="monospace" fontSize="24" style={{textShadow: "2px 2px 0px #000"}}>
                                ${SECRET_ITEMS[i]?.price.toFixed(2) || "?.??"}
                            </text>
                        </g>

                        <line x1="0" y1="28" x2="320" y2="28" stroke="#444" strokeDasharray="2 3" strokeWidth="1" />
                    </g>
                ))}
            </g>
            
            {/* Secret Menu Hint with animation */}
             <g transform="translate(40, 510)">
                <rect x="-10" y="0" width="340" height="70" fill="rgba(0,0,0,0.6)" rx="4" stroke="#444" strokeWidth="2" />
                {/* Warning Striping */}
                <defs>
                    <pattern id="warningStripes" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                        <rect x="0" y="0" width="10" height="20" fill="#333" />
                        <rect x="10" y="0" width="10" height="20" fill="#222" />
                    </pattern>
                </defs>
                <rect x="-8" y="2" width="336" height="66" fill="url(#warningStripes)" opacity="0.5" rx="3" />
                
                <text x="160" y="25" textAnchor="middle" className="secret-text" fontFamily="monospace" fontSize="18" fontWeight="bold" letterSpacing="2">
                    ⚠ SECRET MENU ⚠
                </text>
                 <text x="160" y="50" textAnchor="middle" fill="#ffffff" fontFamily="monospace" fontSize="14">
                    ASK FOR CUSTOM INGREDIENTS
                </text>
                
                {/* Blinking LEDs in corners of secret menu */}
                <circle cx="5" cy="10" r="3" fill="#f00" className="led-blink" />
                <circle cx="315" cy="10" r="3" fill="#f00" className="led-blink" style={{animationDelay: "0.5s"}}/>
                <circle cx="5" cy="60" r="3" fill="#f00" className="led-blink" style={{animationDelay: "1s"}}/>
                <circle cx="315" cy="60" r="3" fill="#f00" className="led-blink" style={{animationDelay: "1.5s"}}/>
            </g>
        </g>
    </svg>
);

export const PickupWindowSVG: React.FC<{ orderImage?: string | null }> = ({ orderImage }) => (
    <svg className="window-svg-layer" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
            <pattern id="detailedBricks" x="0" y="0" width="120" height="60" patternUnits="userSpaceOnUse">
                <filter id="baseRoughness">
                    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="5" result="roughness"/>
                    <feColorMatrix in="roughness" type="matrix" values="0.3 0 0 0 0.1, 0 0.3 0 0 0.1, 0 0 0.3 0 0.1, 0 0 0 1 0"/>
                </filter>
                <rect width="120" height="60" filter="url(#baseRoughness)"/>
                <rect x="0" y="0" width="120" height="60" fill="var(--brick-red)" opacity="0.75"/>
                
                <line x1="0" y1="0" x2="120" y2="0" stroke="var(--mortar-dark)" strokeWidth="5" strokeLinecap="square"/>
                <line x1="0" y1="60" x2="120" y2="60" stroke="var(--mortar-dark)" strokeWidth="5" strokeLinecap="square"/>

                <line x1="0" y1="30" x2="120" y2="30" stroke="var(--mortar-gap)" strokeWidth="7" strokeLinecap="square"/>

                <line x1="60" y1="0" x2="60" y2="30" stroke="var(--mortar-dark)" strokeWidth="5" strokeLinecap="square"/>
                <line x1="0" y1="30" x2="0" y2="60" stroke="var(--mortar-dark)" strokeWidth="5" strokeLinecap="square"/>
                <line x1="120" y1="30" x2="120" y2="60" stroke="var(--mortar-dark)" strokeWidth="5" strokeLinecap="square"/>
                
                <filter id="fineDirt"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3"/><feColorMatrix type="matrix" values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 0.4 0"/></filter>
                <rect width="120" height="60" filter="url(#fineDirt)" opacity="0.5" style={{mixBlendMode: 'multiply'}}/>
            </pattern>
            <linearGradient id="metalGradHoriz" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: 'var(--metal-mid)'}} />
                <stop offset="40%" style={{stopColor: 'var(--metal-light)'}} />
                <stop offset="60%" style={{stopColor: 'var(--metal-dark)'}} />
                <stop offset="100%" style={{stopColor: 'var(--metal-mid)'}} />
            </linearGradient>
            {/* Same vertical gradient from OrderBox for consistency */}
            <linearGradient id="metalGradVertical" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor: 'var(--metal-dark)'}} />
                <stop offset="20%" style={{stopColor: 'var(--metal-light)'}} />
                <stop offset="50%" style={{stopColor: 'var(--metal-mid)'}} />
                <stop offset="80%" style={{stopColor: 'var(--metal-light)'}} />
                <stop offset="100%" style={{stopColor: 'var(--metal-dark)'}} />
            </linearGradient>
            <radialGradient id="signBacklight" cx="50%" cy="50%" r="70%">
                <stop offset="0%" style={{stopColor: '#fff7d1'}} /> 
                <stop offset="70%" style={{stopColor: '#e6c75c'}} /> 
                <stop offset="100%" style={{stopColor: '#cfa830'}} /> 
            </radialGradient>
            <pattern id="kitchenTiles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <rect width="40" height="40" fill="#222" />
                <rect x="1" y="1" width="38" height="38" fill="#333" />
                <rect x="0" y="0" width="40" height="40" fill="rgba(255,255,255,0.05)" />
            </pattern>
            <linearGradient id="interiorShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{stopColor: 'rgba(0,0,0,0.8)'}} />
                <stop offset="50%" style={{stopColor: 'rgba(0,0,0,0.2)'}} />
                <stop offset="100%" style={{stopColor: 'rgba(0,0,0,0.6)'}} />
            </linearGradient>
            <pattern id="speakerHoles" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="2.5" fill="#222" />
            </pattern>
        </defs>

        <rect x="-100" y="-100" width="1200" height="800" fill="url(#detailedBricks)" />

        <g transform="translate(230, 40)">
            <rect x="0" y="0" width="340" height="100" rx="20" ry="20" fill="url(#metalGradHoriz)" stroke="#222" strokeWidth="4"/>
            <rect id="sign-face" x="15" y="15" width="310" height="70" rx="12" ry="12" fill="url(#signBacklight)" stroke="#b09235" strokeWidth="2"/>
            <text x="170" y="50" textAnchor="middle" dominantBaseline="middle" className="pickup-sign-text">PICK UP</text>
        </g>

        <g transform="translate(120, 300)">
            <rect x="0" y="0" width="80" height="120" fill="url(#metalGradVertical)" stroke="#333" strokeWidth="3" rx="5"/>
                <rect x="10" y="40" width="60" height="60" fill="url(#speakerHoles)" stroke="#222"/>
                <circle cx="40" cy="25" r="8" fill="#a00" stroke="#500" strokeWidth="2"/>
        </g>

        <g transform="translate(220, 160)">
            {/* Window Frame */}
            <rect x="-20" y="-20" width="400" height="340" fill="url(#metalGradVertical)" stroke="#222" strokeWidth="4"/>
            
            {/* Window Interior - The "Hole" or the Image */}
            <g clipPath="url(#windowClip)">
                <clipPath id="windowClip">
                     <rect x="0" y="0" width="360" height="300" />
                </clipPath>
                
                {/* Kitchen Interior Background (Default) */}
                <rect x="0" y="0" width="360" height="300" fill="url(#kitchenTiles)" />
                <rect x="0" y="0" width="360" height="300" fill="url(#interiorShadow)" />
                
                {/* Pacing Employee Shadow - NEW */}
                {!orderImage && (
                    <g style={{ animation: 'pacing 3s ease-in-out infinite' }} opacity="0.6">
                         <defs>
                             <filter id="shadowBlur">
                                 <feGaussianBlur stdDeviation="6" />
                             </filter>
                         </defs>
                         <g filter="url(#shadowBlur)">
                             <ellipse cx="180" cy="180" rx="50" ry="90" fill="#000" />
                             <circle cx="180" cy="90" r="35" fill="#000" />
                         </g>
                    </g>
                )}

                {/* Generated Order Image */}
                {orderImage && (
                    <image 
                        href={orderImage} 
                        x="0" y="0" width="360" height="300" 
                        preserveAspectRatio="xMidYMid slice"
                    />
                )}

                {/* Subtle Counter ledge inside */}
                <rect x="0" y="280" width="360" height="20" fill="#222" />
            </g>

            <g id="sliding-glass-pane">
                <rect x="0" y="0" width="360" height="300" fill="none" stroke="url(#metalGradHoriz)" strokeWidth="12"/>
                {/* Glass reflection, slightly more opaque to make the hole look deeper behind it */}
                <rect x="6" y="6" width="348" height="288" fill="rgba(100, 150, 180, 0.15)" stroke="#87ceeb" strokeWidth="1"/>
                <polygon points="10,290 150,10 220,10 80,290" fill="rgba(255,255,255,0.1)"/>
            </g>
        </g>
        <rect x="200" y="460" width="440" height="60" fill="url(#metalGradHoriz)" stroke="#222" strokeWidth="4"/>
        <rect x="210" y="520" width="420" height="20" fill="rgba(0,0,0,0.5)"/>
    </svg>
);