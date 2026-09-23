# YT Transcript Copy

A tiny Chrome extension that adds a **Copy** button to YouTube's transcript panel.
One click copies the whole transcript as clean text, with **no timestamps**.

- No permissions, no background worker, no network requests.
- Chapter titles come out as `## Title`, and each chapter's lines are joined into one paragraph.
- Works in light and dark theme, and keeps working as you move between videos (YouTube is a single-page app).

## Install (load unpacked)

1. Clone or download this repo.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the **`extension/`** folder, not the repo root.

To update later, `git pull` and click the reload icon on the extension card.

## Use

1. Open any YouTube video.
2. In the description, click **Show transcript**.
3. Click **Copy** in the transcript panel header, next to the title.
4. Paste anywhere.

The button shows **Copied** for a moment when it works. If the panel has **Chapters / Transcript** tabs, the button is only enabled on the **Transcript** tab.

### Output example

```
## Intro

So today we're going to talk about how transcripts work and why you might want one.

## Main topic

The first thing to know is that ...
```

Videos without chapters give one paragraph.

## Project layout

```
extension/
  manifest.json   MV3 manifest (content script only, no permissions)
  content.js      finds the transcript panel, injects the button, copies text
  content.css     pill button styled with YouTube's own CSS variables
  icons/          16/48/128 px icons
scripts/
  make_icons.py   regenerates the icons (Python 3, no dependencies)
```

## How it works

- **Finding the panel.** YouTube has two transcript panels with the same
  `target-id="engagement-panel-searchable-transcript"`: the new "In this video" panel and the older
  "Transcript" panel. The script adds a button to whichever one has
  `visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"`.
- **Where the button goes.** It goes into the header's empty `#action-buttons` slot. If that slot
  isn't there, it goes right after `h2#title`.
- **Reading text.** It walks `ytd-transcript-section-header-renderer` (chapters) and
  `ytd-transcript-segment-renderer .segment-text` (lines) in page order, using `textContent`.
  Timestamps (`.segment-timestamp`) are skipped. YouTube loads the full transcript at once, so no
  scrolling is needed.
- **Keeping up with YouTube.** A debounced `MutationObserver` (watching `visibility` and
  `aria-selected`) plus the `yt-navigate-finish` event re-check the panel. Text is read when you
  click, never cached, because YouTube reuses panel elements across videos.
- **Trusted Types.** YouTube enforces Trusted Types, so all DOM is built with
  `createElement`/`textContent` and never `innerHTML`.
- **Clipboard.** It uses `navigator.clipboard.writeText` when you click, which needs no permission.
  If that fails, it falls back to `document.execCommand("copy")`.

## Troubleshooting

- **No button.** Make sure the transcript panel is actually open, then reload the tab once after
  installing or updating the extension.
- **Button is greyed out.** Switch to the **Transcript** tab in the panel.
- **Stopped working after a YouTube update.** YouTube changes its markup from time to time. Open
  DevTools and look for `[YT Transcript Copy]` messages. The script warns if YouTube's upcoming
  `PAmodern_transcript_view` layout is showing with no transcript lines. Selectors are at the top of
  `extension/content.js`.

## Manual test checklist

- [ ] Button appears after clicking **Show transcript**.
- [ ] Pasted text has no timestamps.
- [ ] Chapter videos produce `## Title` headings.
- [ ] Button is disabled on the **Chapters** tab and enabled on **Transcript**.
- [ ] Toggling timestamps in the panel's ⋮ menu doesn't change the output.
- [ ] Going to another video without reloading still shows the button and copies the new transcript.
- [ ] Looks right in both light and dark theme.

## License

MIT
