// YT Transcript Copy: adds a "Copy" button to YouTube's transcript panel header.
// Copies the transcript as plain text (no timestamps). Chapter titles become "## Title".
(() => {
  "use strict";

  const PANEL_SEL =
    'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-searchable-transcript"]';
  const MODERN_PANEL_SEL =
    'ytd-engagement-panel-section-list-renderer[target-id="PAmodern_transcript_view"]';
  const EXPANDED = "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED";
  const LABEL = "Copy";
  const FEEDBACK_MS = 1500;

  let modernWarned = false;
  let debounceTimer = null;

  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();

  // ---------- transcript extraction ----------

  function readTranscript(panel) {
    const nodes = panel.querySelectorAll(
      "ytd-transcript-section-header-renderer, ytd-transcript-segment-renderer"
    );
    const blocks = []; // { title?: string, lines: string[] }
    let current = { title: null, lines: [] };

    for (const node of nodes) {
      if (node.tagName === "YTD-TRANSCRIPT-SECTION-HEADER-RENDERER") {
        const title = clean(node.textContent);
        if (!title) continue;
        if (current.title || current.lines.length) blocks.push(current);
        current = { title, lines: [] };
      } else {
        const textEl = node.querySelector(".segment-text");
        const text = clean(textEl ? textEl.textContent : "");
        if (text) current.lines.push(text);
      }
    }
    if (current.title || current.lines.length) blocks.push(current);

    const parts = [];
    for (const b of blocks) {
      if (b.title) parts.push(`## ${b.title}`);
      if (b.lines.length) parts.push(b.lines.join(" "));
    }
    return parts.join("\n\n").trim();
  }

  // ---------- clipboard ----------

  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) {
      // Fall through to the legacy path (e.g. document not focused).
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (!ok) throw new Error("execCommand copy failed");
  }

  // ---------- button ----------

  function flash(btn, text, state) {
    btn.textContent = text;
    btn.dataset.state = state;
    clearTimeout(btn._ytcTimer);
    btn._ytcTimer = setTimeout(() => {
      btn.textContent = LABEL;
      delete btn.dataset.state;
    }, FEEDBACK_MS);
  }

  async function onCopyClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    const panel = btn.closest(PANEL_SEL);
    if (!panel || btn.disabled) return;

    // Always read at click time: panels are reused across videos.
    const text = readTranscript(panel);
    if (!text) {
      flash(btn, "Nothing to copy", "error");
      return;
    }
    try {
      await writeClipboard(text);
      flash(btn, "Copied", "ok");
    } catch (err) {
      console.error("[YT Transcript Copy] copy failed:", err);
      flash(btn, "Copy failed", "error");
    }
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ytc-copy-btn";
    btn.dataset.ytcCopy = "1";
    btn.textContent = LABEL;
    btn.title = "Copy transcript (text only)";
    btn.setAttribute("aria-label", "Copy transcript");
    btn.addEventListener("click", onCopyClick);
    return btn;
  }

  // In the new "In this video" panel there are Chapters/Transcript tabs.
  // The legacy panel has no tabs, so it's always enabled.
  function transcriptTabSelected(panel) {
    const tabs = panel.querySelectorAll('#subheader button[role="tab"]');
    if (!tabs.length) return true;
    const t = panel.querySelector('#subheader button[role="tab"][aria-label="Transcript"]');
    return !t || t.getAttribute("aria-selected") === "true";
  }

  function injectInto(panel) {
    const header = panel.querySelector("ytd-engagement-panel-title-header-renderer #header");
    if (!header) return null;

    let btn = header.querySelector("[data-ytc-copy]");
    if (btn) return btn;

    btn = createButton();
    const actions = header.querySelector("#action-buttons");
    if (actions) {
      actions.appendChild(btn);
      return btn;
    }
    const titleContainer = header.querySelector("#title-container");
    const h2 = titleContainer && titleContainer.querySelector("h2#title");
    if (h2) {
      h2.after(btn);
      return btn;
    }
    return null;
  }

  function ensureButton() {
    for (const panel of document.querySelectorAll(PANEL_SEL)) {
      if (panel.getAttribute("visibility") !== EXPANDED) continue;
      const btn = injectInto(panel);
      if (btn) btn.disabled = !transcriptTabSelected(panel);
    }

    // Heads-up for YouTube's in-progress transcript layout.
    const modern = document.querySelector(MODERN_PANEL_SEL);
    if (
      !modernWarned &&
      modern &&
      modern.getAttribute("visibility") === EXPANDED &&
      !modern.querySelector("ytd-transcript-segment-renderer")
    ) {
      modernWarned = true;
      console.warn(
        "[YT Transcript Copy] PAmodern_transcript_view is expanded but has no segments; " +
          "YouTube may have shipped a new transcript layout this extension doesn't support yet."
      );
    }
  }

  function schedule() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(ensureButton, 150);
  }

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["visibility", "aria-selected"],
  });
  window.addEventListener("yt-navigate-finish", schedule);

  ensureButton();
})();
