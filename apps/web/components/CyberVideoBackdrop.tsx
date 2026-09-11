'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function CyberVideoBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Dynamic 3D wireframe cube objects floating in background
    class FloatingCube {
      x: number;
      y: number;
      z: number;
      size: number;
      rx: number;
      ry: number;
      rz: number;
      speedX: number;
      speedY: number;
      speedR: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.z = Math.random() * 400 + 100;
        this.size = Math.random() * 35 + 20;
        this.rx = Math.random() * Math.PI;
        this.ry = Math.random() * Math.PI;
        this.rz = Math.random() * Math.PI;
        this.speedX = (Math.random() - 0.5) * 0.4;
        this.speedY = (Math.random() - 0.5) * 0.4;
        this.speedR = (Math.random() - 0.5) * 0.01;
        const colors = ['rgba(34, 211, 238, 0.25)', 'rgba(99, 102, 241, 0.25)', 'rgba(168, 85, 247, 0.25)'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rx += this.speedR;
        this.ry += this.speedR * 1.5;

        if (this.x < -100) this.x = width + 100;
        if (this.x > width + 100) this.x = -100;
        if (this.y < -100) this.y = height + 100;
        if (this.y > height + 100) this.y = -100;
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.translate(this.x, this.y);
        c.strokeStyle = this.color;
        c.lineWidth = 1.2;
        c.shadowColor = this.color;
        c.shadowBlur = 10;

        const s = this.size;
        // Project 3D cube wireframe
        const cosX = Math.cos(this.rx), sinX = Math.sin(this.rx);
        const cosY = Math.cos(this.ry), sinY = Math.sin(this.ry);

        const project = (px: number, py: number, pz: number) => {
          let x1 = px * cosY - pz * sinY;
          let z1 = px * sinY + pz * cosY;
          let y1 = py * cosX - z1 * sinX;
          return { x: x1, y: y1 };
        };

        const vertices = [
          project(-s, -s, -s), project(s, -s, -s), project(s, s, -s), project(-s, s, -s),
          project(-s, -s, s),  project(s, -s, s),  project(s, s, s),  project(-s, s, s),
        ];

        const edges = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ];

        c.beginPath();
        edges.forEach(([v1, v2]) => {
          c.moveTo(vertices[v1].x, vertices[v1].y);
          c.lineTo(vertices[v2].x, vertices[v2].y);
        });
        c.stroke();
        c.restore();
      }
    }

    // Code rain characters
    const charArray = '0101010101THREATSYNCSOCSECURITYAIROBOTIC';
    const fontSize = 12;
    const columns = Math.floor(width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const cubes = Array.from({ length: 12 }, () => new FloatingCube());

    let frame = 0;
    const render = () => {
      frame++;
      ctx.fillStyle = 'rgba(2, 8, 23, 0.15)';
      ctx.fillRect(0, 0, width, height);

      // Render Matrix code rain streams faintly in background
      if (frame % 2 === 0) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.08)';
        ctx.font = `${fontSize}px monospace`;
        for (let i = 0; i < drops.length; i += 3) {
          const text = charArray[Math.floor(Math.random() * charArray.length)];
          ctx.fillText(text, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }

      // Draw floating 3D wireframe cubes
      cubes.forEach((cube) => {
        cube.update();
        cube.draw(ctx);
      });

      animFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Background Image Matrix with Scanline Overlay */}
      <div 
        className="absolute inset-0 opacity-15 bg-cover bg-center transition-opacity duration-1000 filter blur-xs"
        style={{ backgroundImage: 'url(/assets/command_center.jpg)' }}
      />
      {/* Dynamic Animated Canvas Backdrop */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-70" />
      {/* Scanline CRT overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-30 pointer-events-none" />
      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(2,8,23,0.85)_100%)] pointer-events-none" />
    </div>
  );
}
