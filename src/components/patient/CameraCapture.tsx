"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Aperture, FlipHorizontal } from "lucide-react";

type CameraCaptureProps = {
  onCapture: (imageBase64: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function CameraCapture({ onCapture, isOpen, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCamera(true);
    } catch (err) {
      console.error("Camera error:", err);
      setHasCamera(false);
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, startCamera]);

  function captureImage() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    const base64 = canvas.toDataURL("image/jpeg", 0.8);
    onCapture(base64);
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }

  if (!isOpen) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-border">
      {hasCamera ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-48 object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Controls overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCamera}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <FlipHorizontal className="w-4 h-4" />
            </Button>

            <Button
              onClick={captureImage}
              className="bg-white text-black hover:bg-white/90 rounded-full h-12 w-12 p-0"
            >
              <Aperture className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Live indicator */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        </>
      ) : (
        <div className="h-48 flex items-center justify-center text-white/60 text-sm">
          <Camera className="w-5 h-5 mr-2" />
          Camera not available
        </div>
      )}
    </div>
  );
}
