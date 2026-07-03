import { useEffect, useRef } from "react";

/**
 * Sparkler cursor. On devices with a fine pointer (mouse/trackpad) the native
 * cursor is hidden and replaced by a glowing sparkler tip that continuously
 * throws off animated sparks — extra when the pointer moves. A fixed overlay
 * canvas (pointer-events: none) sits above the page so clicks pass straight
 * through to the content underneath.
 *
 * Touch devices keep their normal behaviour. Under `prefers-reduced-motion`
 * the spark output is dialled right down to a gentle glow.
 */
export default function SparklerCursor() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    // Only take over the cursor when there's a real pointing device.
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (!finePointer) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const COLORS = ["#ffffff", "#fde68a", "#fbbf24", "#fb923c", "#f87171", "#93c5fd"];

    type Spark = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      max: number;
      color: string;
      size: number;
    };
    const sparks: Spark[] = [];

    let x = width / 2;
    let y = height / 2;
    let lastX = x;
    let lastY = y;
    let inside = false;

    function emit(count: number, speed: number) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const sp = speed * (0.3 + Math.random() * 1.1);
        const max = 14 + ((Math.random() * 22) | 0);
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * sp,
          vy: Math.sin(angle) * sp - 0.4,
          life: max,
          max,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          size: 0.8 + Math.random() * 1.4,
        });
      }
    }

    function onMove(e: MouseEvent) {
      x = e.clientX;
      y = e.clientY;
      inside = true;
      if (reduced) return;
      const dx = x - lastX;
      const dy = y - lastY;
      const moved = Math.min(10, Math.hypot(dx, dy));
      if (moved > 1) emit(Math.round(moved * 0.9), 2.2);
      lastX = x;
      lastY = y;
    }
    function onLeave() {
      inside = false;
    }

    let raf = 0;
    let prev = performance.now();
    let idleEmit = 0;
    let twinkle = 0;

    function frame(now: number) {
      const dt = Math.min(2.5, (now - prev) / 16.667);
      prev = now;
      twinkle += dt;

      ctx.clearRect(0, 0, width, height);

      if (inside) {
        // A constantly-burning sparkler still throws sparks when held still.
        idleEmit -= dt;
        if (idleEmit <= 0) {
          emit(reduced ? 1 : 3, reduced ? 1.1 : 1.8);
          idleEmit = reduced ? 6 : 2;
        }
      }

      ctx.globalCompositeOperation = "lighter";

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.vx *= 0.9;
        s.vy = s.vy * 0.9 + 0.16 * dt; // gravity
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const a = s.life / s.max;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // The glowing sparkler tip that marks the exact pointer position.
      if (inside) {
        const flicker = 0.75 + Math.sin(twinkle * 0.9) * 0.15 + Math.random() * 0.2;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
        glow.addColorStop(0, "rgba(255,255,255,0.95)");
        glow.addColorStop(0.35, "rgba(251,191,36,0.55)");
        glow.addColorStop(1, "rgba(251,146,60,0)");
        ctx.globalAlpha = flicker;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });
    window.addEventListener("resize", resize);
    const root = document.documentElement;
    const prevCursor = root.style.cursor;
    root.style.cursor = "none";

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
      window.removeEventListener("resize", resize);
      root.style.cursor = prevCursor;
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] h-full w-full"
    />
  );
}
