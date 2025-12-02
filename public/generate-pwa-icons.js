// Simple icon generation for PWA
const fs = require('fs');
const path = require('path');

// Create a simple SVG icon for MyAmbulex
const createIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#14b8a6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0891b2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="512" height="512" fill="url(#bgGradient)" rx="80"/>
  
  <!-- Medical Cross -->
  <g transform="translate(256,256)">
    <!-- Horizontal bar -->
    <rect x="-80" y="-20" width="160" height="40" fill="white" rx="20"/>
    <!-- Vertical bar -->
    <rect x="-20" y="-80" width="40" height="160" fill="white" rx="20"/>
  </g>
  
  <!-- Heart Icon -->
  <g transform="translate(256,200)" fill="#ff6b6b">
    <path d="M0,15 C-15,-10 -45,-10 -45,10 C-45,35 0,60 0,60 C0,60 45,35 45,10 C45,-10 15,-10 0,15 Z"/>
  </g>
  
  <!-- Vehicle/Transport Element -->
  <g transform="translate(256,320)" fill="white" opacity="0.9">
    <!-- Simple vehicle representation -->
    <rect x="-60" y="-15" width="120" height="30" rx="15"/>
    <!-- Wheels -->
    <circle cx="-35" cy="15" r="12" fill="#14b8a6"/>
    <circle cx="35" cy="15" r="12" fill="#14b8a6"/>
  </g>
</svg>`;

// Generate different sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  const svgContent = createIcon(size);
  fs.writeFileSync(path.join(__dirname, 'pwa-icons', `icon-${size}x${size}.svg`), svgContent);
});

console.log('PWA icons generated successfully!');
