// Starfield.tsx — Animated star background rendered on a full-screen HTML canvas.
// Used on both LandingPage and PrivacyPage as the cosmic background effect.
// The canvas is fixed (stays in place while content scrolls) and sits behind
// all content via z-index: -1.
//
// How the animation works:
//   - 200 stars are created with random x, y, and z (depth) values.
//   - Each frame, z decreases (stars move toward the viewer).
//   - The perspective formula (k = 128 / z) converts 3D position to 2D screen coords,
//     making distant stars appear small and near stars appear large and bright.
//   - When a star's z reaches 0 (passed the viewer), it resets to a new random position.
//
// To change the number of stars, edit the `length: 200` value.
// To change animation speed, edit the `star.z -= 0.5` decrement.
// To change the background color, edit the `ctx.fillStyle = '#070718'` line.

import React, { useEffect, useRef } from 'react';

export function Starfield() {
  // canvasRef — direct reference to the <canvas> DOM element.
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fill the viewport on mount.
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    // Create 200 stars with random starting positions and sizes.
    // z acts as depth: high z = far away, low z = close to viewer.
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * w,
      size: Math.random() * 2,
    }));

    let animationFrameId: number;

    // draw — runs every animation frame via requestAnimationFrame.
    const draw = () => {
      // Clear canvas with the dark background color each frame.
      ctx.fillStyle = '#070718';
      ctx.fillRect(0, 0, w, h);

      stars.forEach(star => {
        // Move star closer each frame (decrease z = closer to viewer).
        star.z -= 0.5;

        // Reset star to far away when it passes the viewer (z <= 0).
        if (star.z <= 0) {
          star.x = Math.random() * w;
          star.y = Math.random() * h;
          star.z = w;
        }

        // Perspective projection: k scales position and size based on depth.
        const k = 128 / star.z;
        const px = (star.x - w / 2) * k + w / 2; // projected screen X
        const py = (star.y - h / 2) * k + h / 2; // projected screen Y
        const size = star.size * k;               // larger as star gets closer

        // Only draw stars that are within the canvas bounds.
        if (px >= 0 && px <= w && py >= 0 && py <= h) {
          ctx.beginPath();
          // Opacity increases as star approaches (closer = brighter).
          ctx.fillStyle = `rgba(255, 255, 255, ${1 - star.z / w})`;
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw(); // Start the animation loop.

    // handleResize — updates canvas dimensions when the browser window is resized.
    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Cleanup: cancel animation loop and remove resize listener when component unmounts.
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []); // Empty dependency array — only runs once on mount.

  // fixed inset-0: fills the full viewport.
  // pointer-events-none: clicks pass through to content behind.
  // z-[-1]: renders behind all page content.
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[-1]" />;
}
