import { test, expect, type Page } from "@playwright/test";

// These run against a production build in demo mode (localStorage, no backend
// writes). Each test gets a fresh browser context, so localStorage starts clean
// and the playlist shows its 2 seed songs (September, Dancing Queen).
//
// The RSVP and Playlist islands use Astro's `client:visible`, so they only
// hydrate once scrolled into view. Interacting with an input before hydration
// silently drops the value (no React onChange), so each interactive test first
// waits for a marker that is only rendered *after* the island's data effect
// runs client-side: the playlist's "N tracks queued" count (SSR renders 0) and
// the RSVP guest panel's "No responses yet" (SSR renders a loading state).

async function openPlaylist(page: Page) {
  await page.goto("/#playlist");
  await expect(page.getByText(/2 tracks queued/i)).toBeVisible();
}

async function openRsvp(page: Page) {
  await page.goto("/#rsvp");
  await expect(page.getByText(/No responses yet/i)).toBeVisible();
}

test.describe("Content & layout", () => {
  test("homepage renders the Fourth of July theme and key details", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Fourth of July Bash/i);
    await expect(
      page.getByRole("heading", { level: 1, name: /Fourth of July Bash/i }),
    ).toBeVisible();

    // Event essentials
    await expect(page.getByText("130 Lawrence Drive").first()).toBeVisible();
    await expect(page.getByText("Villa Rica, GA 30180").first()).toBeVisible();
    await expect(page.getByText(/Saturday, July 4, 2026/).first()).toBeVisible();
    await expect(page.getByText(/Summer party vibes/i).first()).toBeVisible();

    // Schedule highlights
    await expect(page.getByText(/Spades Tournament/i).first()).toBeVisible();
    await expect(page.getByText(/Fireworks Show/i).first()).toBeVisible();
  });

  test("countdown timer is present with four units", async ({ page }) => {
    await page.goto("/");
    const timer = page.getByRole("timer");
    await expect(timer).toBeVisible();
    // days / hrs / min / sec
    await expect(timer.getByText("days")).toBeVisible();
    await expect(timer.getByText("hrs")).toBeVisible();
    await expect(timer.getByText("min")).toBeVisible();
    await expect(timer.getByText("sec")).toBeVisible();
  });

  test("primary nav jumps to the RSVP section", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Primary" })
      .getByRole("link", { name: "RSVP" })
      .first()
      .click();
    await expect(page).toHaveURL(/#rsvp$/);
    await expect(
      page.getByRole("heading", { name: /Will you be there\?/i }),
    ).toBeVisible();
  });
});

test.describe("RSVP form (demo mode)", () => {
  test("shows a validation error when name is empty", async ({ page }) => {
    await openRsvp(page);
    await page.getByRole("button", { name: /Send my RSVP/i }).click();
    await expect(page.getByText("Please tell us your name.")).toBeVisible();
    // Nothing was saved
    await expect(page.getByText(/No responses yet/i)).toBeVisible();
  });

  test("saves a valid RSVP and updates the guest list + stats", async ({ page }) => {
    await openRsvp(page);
    const rsvp = page.locator("#rsvp");
    await rsvp.getByLabel("Your name").fill("Test Guest");
    await page.getByRole("button", { name: /Send my RSVP/i }).click();

    await expect(page.getByRole("status")).toContainText(/your RSVP is saved/i);
    // Guest appears in the "Who's coming" list
    await expect(rsvp.getByText("Test Guest")).toBeVisible();
    // Demo-mode disclaimer
    await expect(page.getByText(/saved in your browser for this demo/i)).toBeVisible();
  });

  test("declining hides the guest-count field", async ({ page }) => {
    await openRsvp(page);
    await expect(page.getByLabel(/Total in your party/i)).toBeVisible();
    await page.getByText("Can't make it").click();
    await expect(page.getByLabel(/Total in your party/i)).toHaveCount(0);
  });
});

test.describe("Playlist (demo mode)", () => {
  test("seeds two tracks and can add by title only", async ({ page }) => {
    await openPlaylist(page);

    await page.getByLabel("Song title").fill("Test Song Alpha");
    await page.getByRole("button", { name: /Add to playlist/i }).click();

    await expect(page.getByText(/3 tracks queued/i)).toBeVisible();
    await expect(page.getByText("Test Song Alpha")).toBeVisible();
  });

  test("can add by artist only (title optional)", async ({ page }) => {
    await openPlaylist(page);
    await page.getByLabel("Artist").fill("Only An Artist");
    await page.getByRole("button", { name: /Add to playlist/i }).click();
    await expect(page.getByText(/3 tracks queued/i)).toBeVisible();
    await expect(page.getByText("Only An Artist")).toBeVisible();
  });

  test("rejects an empty add with a validation message", async ({ page }) => {
    await openPlaylist(page);
    await page.getByRole("button", { name: /Add to playlist/i }).click();
    await expect(page.getByText("Enter a song title or an artist.")).toBeVisible();
    await expect(page.getByText(/2 tracks queued/i)).toBeVisible();
  });

  test("upvoting a track increments its count", async ({ page }) => {
    await openPlaylist(page);
    const upvote = page.getByRole("button", { name: /Upvote September/i });
    await expect(upvote).toBeVisible();
    await upvote.click();
    // After voting, the control flips to "Remove your upvote…"
    await expect(
      page.getByRole("button", { name: /Remove your upvote from September/i }),
    ).toBeVisible();
  });

  test("removing a track decrements the queue", async ({ page }) => {
    await openPlaylist(page);
    await page
      .getByRole("button", { name: /Remove Dancing Queen from the playlist/i })
      .click();
    await expect(page.getByText(/1 track queued/i)).toBeVisible();
  });
});
