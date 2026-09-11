'use client';

import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Camera, ShieldCheck, UserCheck, Lock, RefreshCw, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import GlowCard from './GlowCard';

export default function BiometricCameraScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scanStatus, setScanStatus] = useState('STANDBY — CLICK TO START BIOMETRIC SCAN');

  // Start real webcam stream or fallback to simulation
  const startCamera = async () => {
    setCameraError(null);
    setScanProgress(0);
    setIsAuthenticated(false);
    setScanStatus('INITIALIZING OPTICAL SENSORS...');

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
        runScanProcess();
      } else {
        throw new Error('Webcam API unavailable in browser environment.');
      }
    } catch (err: any) {
      console.warn('Camera access fallback to procedural cyber face simulation:', err);
      setCameraError('Live camera restricted. Running procedural cyber face simulation.');
      setCameraActive(true);
      runScanProcess();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanProgress(0);
    setIsAuthenticated(false);
    setScanStatus('STANDBY — CLICK TO START BIOMETRIC SCAN');
  };

  const runScanProcess = () => {
    setScanStatus('EXTRACTING BIOMETRIC FACIAL KEYPOINTS...');
    const obj = { val: 0 };
    gsap.to(obj, {
      val: 100,
      duration: 3.5,
      ease: 'power1.inOut',
      onUpdate: () => {
        setScanProgress(Math.floor(obj.val));
      },
      onComplete: () => {
        setIsAuthenticated(true);
        setScanStatus('CLEARANCE GRANTED — SARAH CONNOR (LEVEL 5 ORG_ADMIN)');
      },
    });
  };

  // Render overlay scanning mesh on canvas
  useEffect(() => {
    if (!cameraActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 480);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 320);

    let scanY = 0;
    let scanDirection = 1;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint cyber reticle grid
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)';
      ctx.lineWidth = 1;

      const cx = width / 2;
      const cy = height / 2;
      const boxW = 200;
      const boxH = 240;

      // Draw Face Bounding Box Reticle
      ctx.strokeStyle = isAuthenticated ? '#34d399' : '#22d3ee';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

      // L-shaped Corner Brackets on Bounding Box
      const cornerLen = 16;
      ctx.strokeStyle = isAuthenticated ? '#34d399' : '#06b6d4';
      ctx.lineWidth = 3;

      // Top-Left
      ctx.beginPath();
      ctx.moveTo(cx - boxW / 2, cy - boxH / 2 + cornerLen);
      ctx.lineTo(cx - boxW / 2, cy - boxH / 2);
      ctx.lineTo(cx - boxW / 2 + cornerLen, cy - boxH / 2);
      ctx.stroke();

      // Top-Right
      ctx.beginPath();
      ctx.moveTo(cx + boxW / 2 - cornerLen, cy - boxH / 2);
      ctx.lineTo(cx + boxW / 2, cy - boxH / 2);
      ctx.lineTo(cx + boxW / 2, cy - boxH / 2 + cornerLen);
      ctx.stroke();

      // Bottom-Left
      ctx.beginPath();
      ctx.moveTo(cx - boxW / 2, cy + boxH / 2 - cornerLen);
      ctx.lineTo(cx - boxW / 2, cy + boxH / 2);
      ctx.lineTo(cx - boxW / 2 + cornerLen, cy + boxH / 2);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(cx + boxW / 2 - cornerLen, cy + boxH / 2);
      ctx.lineTo(cx + boxW / 2, cy + boxH / 2);
      ctx.lineTo(cx + boxW / 2, cy + boxH / 2 - cornerLen);
      ctx.stroke();

      // Laser Scanner Sweep Beam
      scanY += 2 * scanDirection;
      if (scanY > boxH) scanDirection = -1;
      if (scanY < 0) scanDirection = 1;

      const beamY = cy - boxH / 2 + scanY;
      const scanGrad = ctx.createLinearGradient(0, beamY - 15, 0, beamY + 15);
      scanGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
      scanGrad.addColorStop(0.5, isAuthenticated ? 'rgba(52, 211, 153, 0.7)' : 'rgba(34, 211, 238, 0.7)');
      scanGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');

      ctx.fillStyle = scanGrad;
      ctx.fillRect(cx - boxW / 2, beamY - 15, boxW, 30);

      // Draw Procedural Face Mesh Dots if camera fallback or active
      ctx.fillStyle = isAuthenticated ? '#34d399' : '#22d3ee';
      const keypoints = [
        { x: cx - 40, y: cy - 30 }, // Left eye
        { x: cx + 40, y: cy - 30 }, // Right eye
        { x: cx, y: cy + 10 },     // Nose
        { x: cx - 30, y: cy + 50 }, // Mouth left
        { x: cx + 30, y: cy + 50 }, // Mouth right
        { x: cx, y: cy + 65 },     // Chin
      ];

      keypoints.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Connect keypoint mesh lines
      ctx.strokeStyle = isAuthenticated ? 'rgba(52, 211, 153, 0.4)' : 'rgba(34, 211, 238, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(keypoints[0].x, keypoints[0].y);
      ctx.lineTo(keypoints[2].x, keypoints[2].y);
      ctx.lineTo(keypoints[1].x, keypoints[1].y);
      ctx.lineTo(keypoints[2].x, keypoints[2].y);
      ctx.lineTo(keypoints[3].x, keypoints[3].y);
      ctx.lineTo(keypoints[5].x, keypoints[5].y);
      ctx.lineTo(keypoints[4].x, keypoints[4].y);
      ctx.lineTo(keypoints[2].x, keypoints[2].y);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cameraActive, isAuthenticated]);

  return (
    <GlowCard glowColor={isAuthenticated ? 'emerald' : 'cyan'} className="p-6 my-12">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6 font-mono">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Camera className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white tracking-wider flex items-center gap-2">
              INNOVATIVE BIOMETRIC CAMERA SCANNER <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">FACIAL AI</span>
            </h3>
            <p className="text-xs text-slate-400">Live Optical & Facial Keypoint Verification Engine</p>
          </div>
        </div>

        <div>
          {!cameraActive ? (
            <button
              onClick={startCamera}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase font-mono tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/30 hover:scale-105"
            >
              <Camera className="h-4 w-4" /> Start Biometric Camera Scan
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs uppercase font-mono transition-all flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset Scanner
            </button>
          )}
        </div>
      </div>

      {/* Video Stream & Canvas Container */}
      <div className="relative w-full aspect-video min-h-[300px] max-h-[420px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
        {/* Hidden video element for webcam */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover filter contrast-125 brightness-90 ${cameraActive ? 'block' : 'hidden'}`}
        />

        {/* Overlay HUD Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

        {/* Standby Message if camera is not active */}
        {!cameraActive && (
          <div className="text-center p-8 z-20 font-mono">
            <div className="h-16 w-16 rounded-full bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto mb-4 animate-pulse">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h4 className="text-base font-extrabold text-white mb-1">BIOMETRIC OPTICAL SCANNER STANDBY</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
              Click the button above to launch live webcam facial scanning and authenticate security analyst credentials.
            </p>
            <button
              onClick={startCamera}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider transition-all inline-flex items-center gap-2 shadow-xl shadow-cyan-500/20"
            >
              <Zap className="h-4 w-4" /> Initialize Sensor Array
            </button>
          </div>
        )}
      </div>

      {/* Live Scan Status & Progress Bar */}
      {cameraActive && (
        <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-300 font-bold flex items-center gap-2">
              {isAuthenticated ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <Zap className="h-4 w-4 text-cyan-400 animate-spin" />
              )}
              {scanStatus}
            </span>
            <span className={`font-bold ${isAuthenticated ? 'text-emerald-400' : 'text-cyan-400'}`}>
              {scanProgress}% MATCH
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                isAuthenticated ? 'bg-emerald-400' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'
              }`}
              style={{ width: `${scanProgress}%` }}
            />
          </div>

          {cameraError && (
            <div className="mt-3 text-[11px] text-amber-400 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" /> {cameraError}
            </div>
          )}
        </div>
      )}
    </GlowCard>
  );
}
