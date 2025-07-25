const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function generateIcon(size) {
  // Create canvas
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#2563eb"; // Primary blue color
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // Text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${size * 0.5}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("T", size / 2, size / 2);

  // Save the image
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(
    path.join(__dirname, "..", "public", "icons", `icon-${size}x${size}.png`),
    buffer
  );
}

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons for all sizes
sizes.forEach((size) => {
  generateIcon(size);
  console.log(`Generated ${size}x${size} icon`);
});
