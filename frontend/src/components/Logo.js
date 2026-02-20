import React from 'react';

const Logo = ({ className, size = 40 }) => {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 512 512"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Background Circle with Gradient */}
            <defs>
                <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1a1a2e" />
                    <stop offset="50%" stopColor="#16213e" />
                    <stop offset="100%" stopColor="#0f3460" />
                </linearGradient>
                <linearGradient id="textGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFE17B" />
                    <stop offset="100%" stopColor="#D4AF37" />
                </linearGradient>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            <circle cx="256" cy="256" r="250" fill="url(#bgGradient)" stroke="#FFE17B" strokeWidth="4" />

            {/* Stars */}
            <g opacity="0.8">
                <circle cx="100" cy="100" r="3" fill="white">
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="400" cy="150" r="4" fill="white">
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="150" cy="400" r="2" fill="white">
                    <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="350" cy="80" r="3" fill="#FFE17B">
                    <animate attributeName="opacity" values="0.7;0.1;0.7" dur="2.5s" repeatCount="indefinite" />
                </circle>
            </g>

            {/* Rainbow Arc */}
            <path d="M100 300 Q256 150 412 300" stroke="rgba(255,255,255,0.2)" strokeWidth="40" fill="none" opacity="0.3">
                <animate attributeName="opacity" values="0.2;0.4;0.2" dur="5s" repeatCount="indefinite" />
            </path>

            {/* Magic Book Placeholder */}
            <g>
                <path d="M200 380 L256 360 L312 380 L312 430 L256 410 L200 430 Z" fill="#FFE17B" opacity="0.8" filter="url(#glow)" />
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" dur="3s" repeatCount="indefinite" />
            </g>

            {/* Main Text */}
            <text
                x="256"
                y="260"
                textAnchor="middle"
                fill="url(#textGradient)"
                style={{
                    fontFamily: "'Segoe UI', Roboto, serif",
                    fontSize: '85px',
                    fontWeight: '900',
                    filter: 'url(#glow)',
                    textShadow: '0 0 20px rgba(255,225,123,0.3)'
                }}
            >
                Magic
                <animate attributeName="opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite" />
            </text>
            <text
                x="256"
                y="340"
                textAnchor="middle"
                fill="url(#textGradient)"
                style={{
                    fontFamily: "'Segoe UI', Roboto, serif",
                    fontSize: '90px',
                    fontWeight: '900',
                    filter: 'url(#glow)',
                    textShadow: '0 0 20px rgba(255,225,123,0.3)'
                }}
            >
                English
                <animate attributeName="opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite" />
            </text>

            {/* Sparkles */}
            <path d="M420 250 L425 240 L430 250 L440 255 L430 260 L425 270 L420 260 L410 255 Z" fill="#FFE17B">
                <animateTransform attributeName="transform" type="rotate" from="0 425 255" to="360 425 255" dur="4s" repeatCount="indefinite" />
            </path>
        </svg>
    );
};

export default Logo;
