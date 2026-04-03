#!/usr/bin/env python3
"""
MedikTest AX Scraper v2 — reads questions via Accessibility API.
- Single scroll step (2 key presses = ~1-2 questions shift)
- Tracks last seen question number to ensure no gaps
- Robust AX tree search (works regardless of window PID changes)
- Uses screenshots only for green-color (correct answer) detection

Usage:
  python3 scripts/ax_scraper.py урология
  python3 scripts/ax_scraper.py урология 2    # start from block index 2 (0-based)
"""

import subprocess
import json
import time
import re
import os
import sys
import Quartz
import CoreFoundation as CF
from ApplicationServices import (
    AXUIElementCreateApplication,
    AXUIElementCopyAttributeValue,
    AXUIElementCopyActionNames,
    AXUIElementPerformAction,
    AXUIElementSetAttributeValue,
)

PROJECT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
TESTS_DIR = os.path.join(PROJECT_DIR, "тесты")
os.makedirs(TESTS_DIR, exist_ok=True)

# Global runner info (refreshed on each call)
_window_pid = None
_window_id = None
_window_bounds = None  # (x, y, w, h)


# ── Runner detection ──────────────────────────────────────────────────────────

def refresh_runner():
    global _window_pid, _window_id, _window_bounds
    r = subprocess.run(["pgrep", "-x", "Runner"], capture_output=True, text=True)
    if not r.stdout.strip():
        return False
    all_pids = set(int(p) for p in r.stdout.split())
    wlist = Quartz.CGWindowListCopyWindowInfo(0, Quartz.kCGNullWindowID)
    best = None
    for w in wlist or []:
        if int(w.get("kCGWindowOwnerPID", 0)) in all_pids:
            b = w.get("kCGWindowBounds", {})
            ww, wh = int(b.get("Width", 0)), int(b.get("Height", 0))
            if ww > 500 and wh > 300:
                if best is None or ww * wh > int(best["kCGWindowBounds"]["Width"]) * int(best["kCGWindowBounds"]["Height"]):
                    best = w
    if best:
        b = best["kCGWindowBounds"]
        _window_pid = int(best["kCGWindowOwnerPID"])
        _window_id = int(best["kCGWindowNumber"])
        _window_bounds = (int(b["X"]), int(b["Y"]), int(b["Width"]), int(b["Height"]))
        return True
    return False


# ── AX: robust recursive search for main content group ───────────────────────

_QUESTION_ROLES = {"AXStaticText", "AXGenericElement"}

def _is_question_elem(elem):
    """Return True if this AX element looks like a question."""
    _, role = AXUIElementCopyAttributeValue(elem, "AXRole", None)
    if str(role) not in _QUESTION_ROLES:
        return False
    _, desc = AXUIElementCopyAttributeValue(elem, "AXDescription", None)
    return bool(desc and re.match(r'^\d+\s+\S', str(desc)))


def _ax_find_content(elem, depth=0, max_depth=8):
    """Recursively find the element whose direct children include questions or block items."""
    if depth > max_depth:
        return None
    _, kids = AXUIElementCopyAttributeValue(elem, "AXChildren", None)
    if not kids:
        return None
    # Check if this level has question elements (any role with question desc)
    for k in kids:
        if _is_question_elem(k):
            return elem  # this elem's children contain questions
    # Also check for block-list indicators
    for k in kids:
        _, label = AXUIElementCopyAttributeValue(k, "AXUserInputLabels", None)
        if label and len(label) > 0 and re.match(r'^\d+\n', str(label[0])):
            return elem  # this elem's children are block list items
    # Recurse
    for k in kids:
        result = _ax_find_content(k, depth + 1, max_depth)
        if result:
            return result
    return None


def get_content_elems():
    """Return list of direct content elements (questions or block list items).
    Refreshes Runner info each call."""
    if not _window_pid:
        refresh_runner()
    if not _window_pid:
        return []
    app = AXUIElementCreateApplication(_window_pid)
    win = None
    for attr in ("AXMainWindow", "AXFocusedWindow"):
        _, w = AXUIElementCopyAttributeValue(app, attr, None)
        if w:
            win = w
            break
    if not win:
        # Fallback: use first entry from AXWindows list
        _, wins = AXUIElementCopyAttributeValue(app, "AXWindows", None)
        if wins and len(wins) > 0:
            win = wins[0]
    if not win:
        return []
    parent = _ax_find_content(win)
    if not parent:
        return []
    _, kids = AXUIElementCopyAttributeValue(parent, "AXChildren", None)
    return kids or []


# ── AX helpers ────────────────────────────────────────────────────────────────

def ax_role(elem):
    _, r = AXUIElementCopyAttributeValue(elem, "AXRole", None)
    return str(r) if r else ""


def ax_desc(elem):
    _, d = AXUIElementCopyAttributeValue(elem, "AXDescription", None)
    return str(d) if d else ""


def ax_label(elem):
    _, l = AXUIElementCopyAttributeValue(elem, "AXUserInputLabels", None)
    return str(l[0]) if l and len(l) > 0 else ""


def ax_frame(elem):
    _, f = AXUIElementCopyAttributeValue(elem, "AXFrame", None)
    if not f:
        return None
    m = re.search(r'x:([\d.]+).*?y:([\d.]+).*?w:([\d.]+).*?h:([\d.]+)', str(f))
    return (float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4))) if m else None


def ax_press(elem):
    return AXUIElementPerformAction(elem, "AXPress") == 0


# ── Screen state detection ────────────────────────────────────────────────────

def get_screen_state():
    """Returns ('block_list', elems), ('in_block', elems), or ('unknown', elems)."""
    elems = get_content_elems()
    for e in elems:
        d = ax_desc(e)
        l = ax_label(e)
        combined = d + l
        if "блоков" in combined.lower() or ("Tab " in combined and "блок" in combined.lower()):
            return "block_list", elems
        if "Блок:" in combined:
            return "in_block", elems
        if re.match(r'^\d+\n', l):  # block list item like "1\n—\n100"
            return "block_list", elems
    return "unknown", elems


# ── Activation ────────────────────────────────────────────────────────────────

def activate():
    subprocess.run(["osascript", "-e", 'tell application "МедикТест" to activate'],
                   capture_output=True, timeout=8)
    time.sleep(0.25)


# ── Screenshot ────────────────────────────────────────────────────────────────

def take_screenshot(path):
    if not _window_id:
        return False
    url = CF.CFURLCreateFromFileSystemRepresentation(None, path.encode(), len(path), False)
    img = Quartz.CGWindowListCreateImage(
        Quartz.CGRectNull,
        Quartz.kCGWindowListOptionIncludingWindow,
        _window_id,
        Quartz.kCGWindowImageDefault,
    )
    if not img or Quartz.CGImageGetWidth(img) == 0:
        return False
    dest = Quartz.CGImageDestinationCreateWithURL(url, "public.png", 1, None)
    Quartz.CGImageDestinationAddImage(dest, img, None)
    return bool(Quartz.CGImageDestinationFinalize(dest))


def detect_correct_via_color(q_elem, pil_img):
    """Return correct answer index (0-based) by detecting green background.
    Uses AXFrame for exact position. Returns -1 if not found."""
    if pil_img is None:
        return -1
    frame = ax_frame(q_elem)
    if not frame:
        return -1
    desc = ax_desc(q_elem)
    options = [l.strip() for l in desc.split('\n')[1:] if l.strip()]
    if not options:
        return -1

    qx, qy, qw, qh = frame
    win_x, win_y, win_w, win_h = _window_bounds
    iw, ih = pil_img.size
    n_lines = 1 + len(options)
    line_h = qh / max(n_lines, 1)

    for i in range(len(options)):
        opt_y_screen = qy + (i + 1 + 0.5) * line_h
        y_rel = (opt_y_screen - win_y) / win_h
        y_px = int(y_rel * ih)
        if not (0 <= y_px < ih):
            continue
        for dy in [0, -3, 3, -7, 7, -12, 12]:
            y2 = y_px + dy
            if 0 <= y2 < ih:
                samples = [pil_img.getpixel((sx, y2))[:3]
                           for sx in [40, 120, 250, 500, 800] if sx < iw]
                if samples:
                    ag = sum(s[1] for s in samples) / len(samples)
                    ar = sum(s[0] for s in samples) / len(samples)
                    ab = sum(s[2] for s in samples) / len(samples)
                    if ag > 32 and ag > ar + 2 and ag > ab:
                        return i
    return -1


# ── Scrolling: SINGLE STEP ────────────────────────────────────────────────────

def scroll_down_single():
    """Scroll down by 1 key press. Minimal step to avoid missing any question."""
    activate()
    script = f'''tell application "System Events"
    tell process id {_window_pid}
        key code 125
    end tell
end tell'''
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=10)
    time.sleep(0.30)  # wait for Flutter AX tree to update


# ── Block navigation ──────────────────────────────────────────────────────────

def get_block_elems(elems):
    """Return block list elements (items with label like '1\n—\n100')."""
    return [e for e in elems
            if re.match(r'^\d+\n', ax_label(e))]


def press_back():
    """Press back button from block view. Looks for small element at top-left."""
    elems = get_content_elems()
    # Back button is usually the first or second element with AXPress action
    # and small size at the top of the window
    for e in elems[:4]:
        frame = ax_frame(e)
        if frame:
            _, fy, fw, fh = frame
            # Back button: small element near top
            if fw < 50 and fh < 50 and fy < 100:
                activate()
                ax_press(e)
                time.sleep(1.5)
                return
    # Fallback: press first element
    if elems:
        activate()
        ax_press(elems[0])
        time.sleep(1.5)


def open_block(block_idx):
    """Open block at given 0-based index from block list. Returns (start, end) or None."""
    state, elems = get_screen_state()
    if state != "block_list":
        return None
    block_buttons = get_block_elems(elems)
    if block_idx >= len(block_buttons):
        return None
    target = block_buttons[block_idx]
    label = ax_label(target)
    nums = re.findall(r'\d+', label)
    if len(nums) < 2:
        return None
    start, end = int(nums[0]), int(nums[1])
    print(f"  Opening block {block_idx+1}: Q{start}-{end}")
    activate()
    ax_press(target)
    time.sleep(2.0)
    return (start, end)


def count_blocks():
    state, elems = get_screen_state()
    if state != "block_list":
        return 0
    return len(get_block_elems(elems))


# ── Question parsing ──────────────────────────────────────────────────────────

def parse_question_elem(elem):
    desc = ax_desc(elem)
    m = re.match(r'^(\d+)\s+(.*)', desc.split('\n')[0]) if desc else None
    if not m:
        return None
    num = int(m.group(1))
    question = m.group(2).strip()
    options = [l.strip() for l in desc.split('\n')[1:] if l.strip()]
    return {"num": num, "question": question, "options": options, "correctIndex": -1}


def get_visible_questions():
    """Return list of (elem, question_dict) for currently visible questions."""
    elems = get_content_elems()
    result = []
    for e in elems:
        if _is_question_elem(e):
            q = parse_question_elem(e)
            if q and 1 <= q["num"] <= 100000:
                result.append((e, q))
    return result


# ── Block scraper: single-step scroll ────────────────────────────────────────

def scrape_block(b_start, b_end):
    """Scrape current block with single-key scroll steps.
    Accepts global question range (b_start..b_end).
    Questions may be numbered either locally (1..N) or globally (b_start..b_end);
    we detect and normalise to global numbering automatically."""
    expected_q = b_end - b_start + 1
    all_questions = {}   # key = global question number
    last_seen_max = -1
    stale_count = 0
    MAX_STALE = 5
    MAX_ITERS = 600

    try:
        from PIL import Image
        pil_ok = True
    except ImportError:
        pil_ok = False

    refresh_runner()
    time.sleep(0.5)

    for iteration in range(MAX_ITERS):
        visible = get_visible_questions()

        # Take screenshot for correct-answer detection
        snap = f"/tmp/axs_{iteration:04d}.png"
        pil_img = None
        if pil_ok and visible:
            if take_screenshot(snap):
                try:
                    from PIL import Image
                    pil_img = Image.open(snap)
                except Exception:
                    pass

        for e, q in visible:
            raw = q["num"]
            # Determine global number — handle both local (1..N) and global (b_start..b_end)
            if 1 <= raw <= expected_q:
                gnum = raw + b_start - 1   # local → global
            elif b_start <= raw <= b_end:
                gnum = raw                  # already global
            else:
                continue  # out-of-range, skip

            # Detect correct answer via green color
            if pil_img and q["options"]:
                ci = detect_correct_via_color(e, pil_img)
                if ci >= 0:
                    q["correctIndex"] = ci

            q["num"] = gnum
            # Merge: prefer entry with correct answer
            if gnum not in all_questions:
                all_questions[gnum] = q
            else:
                old = all_questions[gnum]
                if q["correctIndex"] >= 0 and old["correctIndex"] < 0:
                    all_questions[gnum] = q

        # Cleanup screenshot
        try:
            if os.path.exists(snap):
                os.remove(snap)
        except OSError:
            pass

        # Compute stats from in-range visible questions
        in_range = [(e, q) for e, q in visible
                    if (1 <= q["num"] <= expected_q) or (b_start <= q["num"] <= b_end)]
        # Re-derive from stored (global) questions
        vis_globals = []
        for e, q in visible:
            raw = q["num"]
            if 1 <= raw <= expected_q:
                vis_globals.append(raw + b_start - 1)
            elif b_start <= raw <= b_end:
                vis_globals.append(raw)

        if vis_globals:
            cur_max = max(vis_globals)
            cur_min = min(vis_globals)
            valid = sum(1 for q in all_questions.values() if q["correctIndex"] >= 0)

            if iteration % 10 == 0 or cur_max != last_seen_max:
                print(f"    iter {iteration:3d}: Q{cur_min}-{cur_max} | {len(all_questions)}q {valid}✓")

            if cur_max == last_seen_max:
                stale_count += 1
                # When stale but last question not yet seen — try harder (extra scroll)
                if stale_count % 3 == 0 and b_end not in all_questions:
                    # Two extra key presses to try to push past end
                    activate()
                    script = f'''tell application "System Events"
    tell process id {_window_pid}
        key code 125
        delay 0.05
        key code 125
        delay 0.05
        key code 125
    end tell
end tell'''
                    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=10)
                    time.sleep(0.4)
            else:
                stale_count = 0
                last_seen_max = cur_max

            seen_last = b_end in all_questions
            if stale_count >= MAX_STALE and seen_last:
                print(f"    Stale at Q{cur_max}, last question seen — done")
                break
            elif stale_count >= MAX_STALE * 5:
                print(f"    Hard stale at Q{cur_max} — stopping")
                break

            if cur_max >= b_end and len(all_questions) >= expected_q:
                print(f"    All {expected_q} questions reached")
                break
        else:
            stale_count += 1
            if stale_count >= MAX_STALE * 2:
                break

        scroll_down_single()

    result = sorted(all_questions.values(), key=lambda q: q["num"])
    valid = sum(1 for q in result if q["correctIndex"] >= 0)
    total = len(result)

    # Report missing
    found_nums = {q["num"] for q in result}
    missing = sorted(set(range(b_start, b_end + 1)) - found_nums)
    if missing:
        print(f"    ⚠ Missing: {missing}")
    print(f"    → {total}/{expected_q} questions, {valid} with correct answer")
    return result


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    specialty = sys.argv[1] if len(sys.argv) > 1 else "current"
    start_idx = int(sys.argv[2]) if len(sys.argv) > 2 else 0

    print(f"=== MedikTest AX Scraper v2 — {specialty} ===")

    if not refresh_runner():
        print("ERROR: MedikTest not found. Open the app first.")
        sys.exit(1)
    print(f"  Runner PID={_window_pid}, WID={_window_id}, bounds={_window_bounds}")

    spec_dir = os.path.join(TESTS_DIR, specialty)
    os.makedirs(spec_dir, exist_ok=True)

    # Ensure on block list
    state, elems = get_screen_state()
    print(f"  Screen state: {state}")
    if state == "in_block":
        print("  → Going back to block list...")
        press_back()
        time.sleep(1)
        state, elems = get_screen_state()
        print(f"  → New state: {state}")

    if state != "block_list":
        print(f"  ERROR: Expected block_list, got '{state}'.")
        print("  Please navigate to the specialty block list in MedikTest, then re-run.")
        sys.exit(1)

    num_blocks = count_blocks()
    print(f"  Detected {num_blocks} blocks")

    for block_idx in range(start_idx, num_blocks):
        # Navigate to block list if needed
        state, _ = get_screen_state()
        if state != "block_list":
            press_back()
            time.sleep(1)
            state, _ = get_screen_state()

        # Determine expected range (from block list)
        state2, elems2 = get_screen_state()
        block_buttons = get_block_elems(elems2)
        if block_idx >= len(block_buttons):
            print(f"  Block {block_idx} out of range")
            break
        label = ax_label(block_buttons[block_idx])
        nums = re.findall(r'\d+', label)
        if len(nums) < 2:
            continue
        b_start, b_end = int(nums[0]), int(nums[1])
        expected_q = b_end - b_start + 1

        block_file = os.path.join(spec_dir, f"block_{b_start}-{b_end}.json")

        # Skip if already good quality
        if os.path.exists(block_file):
            existing = json.load(open(block_file))
            valid = sum(1 for q in existing if q.get("correctIndex", -1) >= 0)
            if len(existing) >= expected_q and valid >= expected_q * 0.9:
                print(f"\n--- Block {block_idx+1}/{num_blocks}: {b_start}-{b_end}: SKIP ({len(existing)}q {valid}✓) ---")
                continue

        print(f"\n--- Block {block_idx+1}/{num_blocks}: {b_start}–{b_end} ({expected_q}q) ---")

        result = open_block(block_idx)
        if not result:
            print(f"  FAIL opening block {block_idx}")
            continue

        questions = scrape_block(b_start, b_end)

        # Go back
        press_back()
        time.sleep(1)

        # Save
        with open(block_file, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
        valid = sum(1 for q in questions if q["correctIndex"] >= 0)
        pct = valid * 100 // max(len(questions), 1)
        print(f"  ✓ Saved {block_file}: {len(questions)}q, {valid}✓ ({pct}%)")

    # Final summary
    total_q = total_v = 0
    for fn in sorted(os.listdir(spec_dir)):
        if fn.endswith(".json"):
            data = json.load(open(os.path.join(spec_dir, fn)))
            v = sum(1 for q in data if q.get("correctIndex", -1) >= 0)
            total_q += len(data)
            total_v += v
    print(f"\n=== DONE: {specialty} — {total_q}q total, {total_v}✓ ===")


if __name__ == "__main__":
    main()
