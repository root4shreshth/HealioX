"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, Aperture, FlipHorizontal, Loader2, AlertCircle } from "lucide-react";

type CameraCaptureProps = {
  onCapture: (imageBase64: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

export function CameraCapture({ onCapture, isOpen, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "starting" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const startCamera = useCallback(async () => {
    setCameraState("starting");
    setErrorMessage("");

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      // Some browsers only expose getUserMedia over HTTPS
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera requires HTTPS. Please use https://");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;

      // Retry attach if videoRef is not mounted yet (e.g. animated panel not fully open)
      let attempts = 0;
      const attach = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => { /* autoplay can fail silently */ });
            setCameraState("ready");
          };
        } else if (attempts < 10) {
          attempts++;
          setTimeout(attach, 100);
        } else {
          throw new Error("Video element not ready");
        }
      };
      attach();
    } catch (err: unknown) {
      console.error("Camera error:", err);
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setErrorMessage("Camera permission denied. Please allow camera access in your browser.");
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setErrorMessage("No camera found on this device.");
      } else if (msg.includes("HTTPS")) {
        setErrorMessage("Camera requires HTTPS. Please use the secure URL.");
      } else {
        setErrorMessage(msg || "Could not start camera");
      }
      setCameraState("error");
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
      setCameraState("idle");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facingMode]);

  function captureImage() {
    if (!videoRef.current || !canvasRef.current || cameraState !== "ready") return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compress to keep under the 5MB vision API limit
    const base64 = canvas.toDataURL("image/jpeg", 0.75);
    onCapture(base64);
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }

  if (!isOpen) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-border">
      {cameraState === "error" ? (
        <div className="h-48 flex flex-col items-center justify-center text-white/80 text-sm p-4 text-center">
          <AlertCircle className="w-8 h-8 mb-2 text-amber-400" />
          <p className="font-semibold mb-1">Camera unavailable</p>
          <p className="text-xs text-white/60 mb-3">{errorMessage}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={startCamera} className="bg-white text-black hover:bg-white/90 rounded-full text-xs">Try Again</Button>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-white hover:bg-white/20 rounded-full text-xs">Close</Button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-48 object-cover bg-black"
          />
          <canvas ref={canvasRef} className="hidden" />

          {cameraState !== "ready" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="flex items-center gap-2 text-white text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting camera...
              </div>
            </div>
          )}

          {cameraState === "ready" && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCamera}
              disabled={cameraState !== "ready"}
              className="text-white hover:bg-white/20 rounded-full"
              title="Flip camera"
            >
              <FlipHorizontal className="w-4 h-4" />
            </Button>

            <Button
              onClick={captureImage}
              disabled={cameraState !== "ready"}
              className="bg-white text-black hover:bg-white/90 rounded-full h-12 w-12 p-0 disabled:opacity-50"
              title="Take photo"
            >
              <Aperture className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full"
              title="Close camera"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
