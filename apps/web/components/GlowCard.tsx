'use client';

import React, { useRef, useState } from 'react';
import gsap from 'gsap';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'indigo' | 'emerald' | 'amber' | 'rose';
  hudCorners?: boolean;
}

export default function GlowCard({ 
  children, 
  className = '', 
  glowColor = 'cyan',
  hudCorners = true 
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    // GSAP 3D perspective tilt effect
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;

    gsap.to(cardRef.current, {
      rotateX,
      rotateY,
      transformPerspective: 1000,
      duration: 0.2,
      ease: 'power1.out',
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        rotateX: 0,
        rotateY: 0,
        scale: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
      });
    }
  };

  const glowMap = {
    cyan: 'rgba(34, 211, 238, 0.3)',
    indigo: 'rgba(99, 102, 241, 0.3)',
    emerald: 'rgba(52, 211, 153, 0.3)',
    amber: 'rgba(251, 191, 36, 0.3)',
    rose: 'rgba(244, 63, 94, 0.3)',
  };

  const accentColorMap = {
    cyan: '#22d3ee',
    indigo: '#818cf8',
    emerald: '#34d399',
    amber: '#fbbf24',
    rose: '#f43f5e',
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-2xl border border-slate-800/80 bg-slate-950/70 backdrop-blur-2xl transition-all duration-300 overflow-hidden group ${className}`}
      style={{
        boxShadow: isHovered 
          ? `0 20px 40px -15px ${glowMap[glowColor]}, inset 0 0 20px ${glowMap[glowColor]}` 
          : '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Dynamic Cursor Spotlight Overlay */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px transition-opacity duration-300 opacity-100 rounded-2xl z-0"
          style={{
            background: `radial-gradient(450px circle at ${mousePos.x}px ${mousePos.y}px, ${glowMap[glowColor]}, transparent 70%)`,
          }}
        />
      )}

      {/* Cyber HUD Corner Bracket Accents */}
      {hudCorners && (
        <>
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 transition-colors duration-300 z-20" style={{ borderColor: isHovered ? accentColorMap[glowColor] : 'rgba(148, 163, 184, 0.3)' }} />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 transition-colors duration-300 z-20" style={{ borderColor: isHovered ? accentColorMap[glowColor] : 'rgba(148, 163, 184, 0.3)' }} />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 transition-colors duration-300 z-20" style={{ borderColor: isHovered ? accentColorMap[glowColor] : 'rgba(148, 163, 184, 0.3)' }} />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 transition-colors duration-300 z-20" style={{ borderColor: isHovered ? accentColorMap[glowColor] : 'rgba(148, 163, 184, 0.3)' }} />
        </>
      )}

      {/* Dynamic Border Spotlight mask */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl border-2 z-10 transition-opacity duration-300"
          style={{
            borderColor: accentColorMap[glowColor],
            maskImage: `radial-gradient(180px circle at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
            WebkitMaskImage: `radial-gradient(180px circle at ${mousePos.x}px ${mousePos.y}px, black, transparent)`,
          }}
        />
      )}

      {/* Top light sheen */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent group-hover:via-cyan-300 transition-all" />

      {/* Inner Content Container */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
