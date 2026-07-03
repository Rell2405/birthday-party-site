import { useEffect, useRef } from "react";

/**
 * Site-wide fireworks. A single fixed <canvas> sits *behind* all page content
 * (pointer-events: none, negative z-index) and paints a translucent navy sky
 * with periodic patriotic bursts, so the motion is visible but stays subtle and
 * never blocks interaction or hurts text contrast.
 *
 * Honours `prefers-reduced-motion`: instead of animating, it draws a calm,
 * static field of faint stars once.
 */
export default function Fireworks() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
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

    const COLORS = ["#dc2626", "#f87171", "#ffffff", "#e2e8f0", "#8faed9", "#5f83c0"];

    // Reduced motion: a quiet, static starfield and nothing else.
    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < 90; i++) {
        ctx.globalAlpha = 0.15 + Math.random() * 0.35;
        ctx.fillStyle = Math.random() > 0.3 ? "#e2e8f0" : "#8faed9";
        const s = Math.random() * 1.6 + 0.4;
        ctx.fillRect(Math.random() * width, Math.random() * height, s, s);
      }
      ctx.globalAlpha = 1;
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      max: number;
      color: string;
    };
    type Rocket = { x: number; y: number; vy: number; targetY: number; color: string };

    let particles: Particle[] = [];
    let rockets: Rocket[] = [];
    let spawnIn = 20;

    function launch() {
      const color = COLORS[(Math.random() * COLORS.length) | 0];
      rockets.push({
        x: width * (0.12 + Math.random() * 0.76),
        y: height + 8,
        vy: -(7.5 + Math.random() * 3),
        targetY: height * (0.12 + Math.random() * 0.34),
        color,
      });
    }

    function burst(x: number, y: number, color: string) {
      const count = 46 + ((Math.random() * 28) | 0);
      const power = 2 + Math.random() * 2.5;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = power * (0.35 + Math.random() * 0.9);
        const max = 55 + ((Math.random() * 45) | 0);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: max,
          max,
          color: Math.random() > 0.8 ? "#ffffff" : color,
        });
      }
    }

    let raf = 0;
    let prev = performance.now();

    function frame(now: number) {
      const dt = Math.min(2.5, (now - prev) / 16.667);
      prev = now;

      // Translucent navy wash → fading trails + the animated "sky".
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(10, 20, 48, 0.22)";
      ctx.fillRect(0, 0, width, height);

      ctx.globalCompositeOperation = "lighter";

      spawnIn -= dt;
      if (spawnIn <= 0) {
        launch();
        if (Math.random() > 0.6) launch();
        spawnIn = 55 + Math.random() * 70;
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y += r.vy * dt;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2, 0, Math.PI * 2);
        ctx.fill();
        if (r.y <= r.targetY) {
          burst(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= 0.986;
        p.vy = p.vy * 0.986 + 0.045 * dt; // gravity
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{ opacity: 0.5 }}
    />
  );
}
