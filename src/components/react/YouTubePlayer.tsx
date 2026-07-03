import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;

/** Load the YouTube IFrame Player API once and resolve when ready. */
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export interface QueueItem {
  videoId: string;
  title: string;
  artist: string;
}

interface Props {
  queue: QueueItem[];
  activeVideoId: string | null;
  onActiveChange: (videoId: string | null) => void;
}

export default function YouTubePlayer({
  queue,
  activeVideoId,
  onActiveChange,
}: Props) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Keep the latest queue accessible inside YT event callbacks.
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Create the player once.
  useEffect(() => {
    let cancelled = false;
    loadYouTubeApi().then(() => {
      if (cancelled || !holderRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(holderRef.current, {
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => {
            const YT = window.YT;
            if (e.data === YT.PlayerState.ENDED) {
              // auto-advance to the next track in the queue
              const q = queueRef.current;
              const current = playerRef.current?.getVideoData()?.video_id;
              const idx = q.findIndex((s) => s.videoId === current);
              const next = idx >= 0 ? q[idx + 1] : undefined;
              onActiveChange(next ? next.videoId : null);
            }
            setPlaying(e.data === YT.PlayerState.PLAYING);
          },
        },
      });
    });
    return () => {
      cancelled = true;
    };
  }, [onActiveChange]);

  // Load / switch the active video.
  useEffect(() => {
    if (!ready || !playerRef.current) return;
    if (!activeVideoId) {
      playerRef.current.stopVideo?.();
      return;
    }
    const currentId = playerRef.current.getVideoData?.()?.video_id;
    if (currentId !== activeVideoId) {
      playerRef.current.loadVideoById(activeVideoId);
    }
  }, [activeVideoId, ready]);

  const activeItem = queue.find((s) => s.videoId === activeVideoId) ?? null;
  const activeIndex = queue.findIndex((s) => s.videoId === activeVideoId);

  function playPause() {
    const p = playerRef.current;
    if (!p) return;
    if (!activeVideoId && queue[0]) {
      onActiveChange(queue[0].videoId);
      return;
    }
    if (playing) p.pauseVideo();
    else p.playVideo();
  }

  function step(dir: 1 | -1) {
    if (queue.length === 0) return;
    const base = activeIndex >= 0 ? activeIndex : 0;
    const nextIndex = (base + dir + queue.length) % queue.length;
    onActiveChange(queue[nextIndex].videoId);
  }

  const disabled = queue.length === 0;

  return (
    <div className="mb-6 overflow-hidden rounded-4xl border border-plum-700/60 bg-plum-900/60 shadow-xl">
      <div className="grid gap-0 sm:grid-cols-[16rem_1fr]">
        {/* Video */}
        <div className="aspect-video bg-black sm:aspect-auto">
          <div ref={holderRef} className="h-full w-full" />
        </div>

        {/* Controls */}
        <div className="flex flex-col justify-center gap-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gold-400">
              {playing ? "Now playing" : "Party player"}
            </p>
            <p className="mt-1 truncate font-display text-lg font-semibold text-white">
              {activeItem ? activeItem.title : "Press play to start the queue"}
            </p>
            <p className="truncate text-sm text-plum-300">
              {activeItem
                ? activeItem.artist
                : `${queue.length} ${queue.length === 1 ? "track" : "tracks"} ready`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ControlButton onClick={() => step(-1)} disabled={disabled} label="Previous track">
              ⏮
            </ControlButton>
            <button
              type="button"
              onClick={playPause}
              disabled={disabled}
              aria-label={playing ? "Pause" : "Play"}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-400 text-xl text-plum-950 shadow-lg transition hover:bg-gold-300 active:scale-95 disabled:opacity-50"
            >
              {playing ? "⏸" : "▶"}
            </button>
            <ControlButton onClick={() => step(1)} disabled={disabled} label="Next track">
              ⏭
            </ControlButton>
            {activeVideoId && (
              <button
                type="button"
                onClick={() => onActiveChange(null)}
                className="ml-auto rounded-full px-3 py-1.5 text-sm text-plum-300 transition hover:text-white"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-plum-700 text-plum-100 transition hover:border-gold-400 hover:text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}
