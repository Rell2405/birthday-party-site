import type { APIRoute } from "astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import satori from "satori";
import { html } from "satori-html";
import { Resvg } from "@resvg/resvg-js";
import { party } from "../data/party";

// Build-time Open Graph image (/og.png). Rendered once at build with satori
// (HTML/CSS -> SVG) and resvg (SVG -> PNG), so the social share card always
// reflects the current event details in src/data/party.ts. Fonts are vendored
// (src/assets/og-fonts) so generation works offline in CI. This route is
// prerendered, so fonts are read from the source tree at build time.

const font = (file: string) =>
  readFileSync(join(process.cwd(), "src/assets/og-fonts", file));

const inter400 = font("inter-400.woff");
const inter700 = font("inter-700.woff");
const fraunces700 = font("fraunces-700.woff");

const WIDTH = 1200;
const HEIGHT = 630;

export const GET: APIRoute = async () => {
  const displayUrl = "rell2405.github.io/birthday-party-site";

  const markup = html(`
    <div style="height:100%;width:100%;display:flex;flex-direction:column;justify-content:center;position:relative;padding:80px;background-color:#0a1430;font-family:Inter;overflow:hidden;">

      <!-- Decorative firework glows -->
      <div style="position:absolute;top:-120px;right:-80px;width:420px;height:420px;border-radius:9999px;background-color:#dc2626;opacity:0.18;display:flex;"></div>
      <div style="position:absolute;bottom:-160px;left:-100px;width:460px;height:460px;border-radius:9999px;background-color:#2b4890;opacity:0.30;display:flex;"></div>
      <div style="position:absolute;top:60px;left:520px;width:180px;height:180px;border-radius:9999px;background-color:#f87171;opacity:0.12;display:flex;"></div>

      <!-- Patriotic top stripe -->
      <div style="position:absolute;top:0;left:0;right:0;height:14px;display:flex;">
        <div style="flex:1;background-color:#dc2626;display:flex;"></div>
        <div style="flex:1;background-color:#e2e8f0;display:flex;"></div>
        <div style="flex:1;background-color:#3a5fa8;display:flex;"></div>
      </div>

      <div style="display:flex;color:#f87171;font-size:30px;font-weight:700;letter-spacing:6px;">
        YOU'RE INVITED
      </div>

      <div style="display:flex;color:#ffffff;font-family:Fraunces;font-weight:700;font-size:104px;line-height:1.02;margin-top:14px;">
        ${party.title}
      </div>

      <div style="display:flex;color:#dbe7f5;font-size:40px;font-weight:700;margin-top:30px;">
        ${party.date} · ${party.time}
      </div>

      <div style="display:flex;color:#8faed9;font-size:30px;margin-top:12px;">
        ${party.venue.name} · ${party.venue.address}, ${party.venue.city}
      </div>

      <div style="display:flex;margin-top:44px;">
        <div style="display:flex;align-items:center;background-color:#dc2626;color:#ffffff;font-size:28px;font-weight:700;padding:16px 34px;border-radius:9999px;">
          RSVP at ${displayUrl}
        </div>
      </div>
    </div>
  `);

  const svg = await satori(markup as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Inter", data: inter400, weight: 400, style: "normal" },
      { name: "Inter", data: inter700, weight: 700, style: "normal" },
      { name: "Fraunces", data: fraunces700, weight: 700, style: "normal" },
    ],
  });

  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  })
    .render()
    .asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
