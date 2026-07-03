import { test, expect, type APIRequestContext } from "@playwright/test";

const ORIGIN = "https://rell2405.github.io";
const SITE = `${ORIGIN}/birthday-party-site/`;
const WORKER = "https://birthday-party-api.rell.workers.dev";

// Patterns that must never appear in client-shipped code.
const SECRET_PATTERNS = [
  /github_pat_[A-Za-z0-9_]{20,}/, // fine-grained PAT
  /ghp_[A-Za-z0-9]{20,}/, // classic PAT
  /AIza[0-9A-Za-z_\-]{20,}/, // Google/YouTube API key
];

test.describe("XSS / output encoding (client)", () => {
  test("RSVP name is rendered as text, not executed as HTML", async ({ page }) => {
    const payload = `<img src=x onerror="window.__xssRsvp=true">`;

    // Fail loudly if any script manages to open a dialog.
    page.on("dialog", async (d) => {
      await d.dismiss();
      throw new Error("Unexpected dialog — possible XSS execution");
    });

    await page.goto("/#rsvp");
    await expect(page.getByText(/No responses yet/i)).toBeVisible();
    await page.locator("#rsvp").getByLabel("Your name").fill(payload);
    await page.getByRole("button", { name: /Send my RSVP/i }).click();

    await expect(page.getByRole("status")).toBeVisible();

    // The onerror handler never ran…
    expect(await page.evaluate(() => (window as any).__xssRsvp)).toBeUndefined();
    // …and no real <img> element was injected from the payload.
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    // The literal text is shown in the guest list.
    await expect(page.getByText(payload)).toBeVisible();
  });

  test("Playlist song title is rendered as text, not executed", async ({ page }) => {
    const payload = `<img src=y onerror="window.__xssSong=true">`;

    page.on("dialog", async (d) => {
      await d.dismiss();
      throw new Error("Unexpected dialog — possible XSS execution");
    });

    await page.goto("/#playlist");
    await expect(page.getByText(/2 tracks queued/i)).toBeVisible();
    await page.getByLabel("Song title").fill(payload);
    await page.getByRole("button", { name: /Add to playlist/i }).click();

    await expect(page.getByText(/3 tracks queued/i)).toBeVisible();
    expect(await page.evaluate(() => (window as any).__xssSong)).toBeUndefined();
    await expect(page.locator('img[src="y"]')).toHaveCount(0);
  });
});

test.describe("No secrets in the shipped bundle (deployed site)", () => {
  async function collectClientJs(request: APIRequestContext) {
    const seen = new Set<string>();
    const queue: string[] = [];
    const html = await (await request.get(SITE)).text();
    for (const m of html.matchAll(/\/birthday-party-site\/_astro\/[A-Za-z0-9._\-]+\.js/g)) {
      queue.push(m[0]);
    }
    const bodies: { url: string; body: string }[] = [];
    while (queue.length) {
      const path = queue.shift()!;
      if (seen.has(path)) continue;
      seen.add(path);
      const res = await request.get(ORIGIN + path);
      if (!res.ok()) continue;
      const body = await res.text();
      bodies.push({ url: path, body });
      // Follow relative chunk imports (e.g. ./apiClient.HASH.js)
      for (const m of body.matchAll(/["'`](\.\/[A-Za-z0-9._\-]+\.js)["'`]/g)) {
        queue.push(m[1].replace("./", "/birthday-party-site/_astro/"));
      }
    }
    return bodies;
  }

  test("client JS contains no tokens or API keys", async ({ request }) => {
    const bodies = await collectClientJs(request);
    expect(bodies.length).toBeGreaterThan(0);

    // Sanity: we actually pulled the app code (it references the Worker base).
    expect(bodies.some((b) => b.body.includes("birthday-party-api"))).toBe(true);

    for (const { url, body } of bodies) {
      for (const pattern of SECRET_PATTERNS) {
        expect(pattern.test(body), `secret-like value found in ${url}`).toBe(false);
      }
    }
  });
});

test.describe("Worker API hardening (deployed)", () => {
  test("health endpoint is up", async ({ request }) => {
    const res = await request.get(`${WORKER}/api/health`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test("CORS only reflects allow-listed origins", async ({ request }) => {
    const evil = await request.fetch(`${WORKER}/api/rsvps`, {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil.example",
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(evil.headers()["access-control-allow-origin"]).not.toBe(
      "https://evil.example",
    );

    const good = await request.fetch(`${WORKER}/api/rsvps`, {
      method: "OPTIONS",
      headers: {
        Origin: ORIGIN,
        "Access-Control-Request-Method": "POST",
      },
    });
    expect(good.headers()["access-control-allow-origin"]).toBe(ORIGIN);
  });

  test("rejects an RSVP with no name (no write)", async ({ request }) => {
    const res = await request.post(`${WORKER}/api/rsvps`, {
      data: { attending: "yes", guests: 2 },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects a song with neither title nor artist (no write)", async ({ request }) => {
    const res = await request.post(`${WORKER}/api/songs`, {
      data: { title: "", artist: "" },
    });
    expect(res.status()).toBe(400);
  });
});
