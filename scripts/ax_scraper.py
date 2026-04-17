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


def _get_main_win():
    """Return the main app window AXUIElement."""
    if not _window_pid:
        return None
    app = AXUIElementCreateApplication(_window_pid)
    for attr in ("AXMainWindow", "AXFocusedWindow"):
        _, w = AXUIElementCopyAttributeValue(app, attr, None)
        if w:
            return w
    _, wins = AXUIElementCopyAttributeValue(app, "AXWindows", None)
    if wins and len(wins) > 0:
        return wins[0]
    return None


def get_inner_elems():
    """Return ALL children of the innermost app group (works on any screen)."""
    if not _window_pid:
        refresh_runner()
    win = _get_main_win()
    if not win:
        return []
    # Navigate: AXWindow → AXGroup[0] → AXGroup[0] → children
    _, kids = AXUIElementCopyAttributeValue(win, "AXChildren", None)
    if not kids:
        return []
    _, g1kids = AXUIElementCopyAttributeValue(kids[0], "AXChildren", None)
    if not g1kids:
        return []
    _, inner = AXUIElementCopyAttributeValue(g1kids[0], "AXChildren", None)
    return inner or []


def get_content_elems():
    """Return direct content elements (questions or block list items).
    Falls back to all inner elems when structured content not found."""
    if not _window_pid:
        refresh_runner()
    win = _get_main_win()
    if not win:
        return []
    parent = _ax_find_content(win)
    if parent:
        _, kids = AXUIElementCopyAttributeValue(parent, "AXChildren", None)
        return kids or []
    # Fallback: return all inner group elements (profile/navigation screens)
    return get_inner_elems()


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


def type_text(text):
    """Type text via AppleScript keystroke."""
    escaped = text.replace('\\', '\\\\').replace('"', '\\"')
    script = f'''tell application "System Events"
    tell process id {_window_pid}
        keystroke "{escaped}"
    end tell
end tell'''
    activate()
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=10)
    time.sleep(0.5)


def clear_search():
    """Clear search field: Cmd+A then Delete."""
    script = f'''tell application "System Events"
    tell process id {_window_pid}
        key code 0 using command down
        delay 0.1
        key code 51
    end tell
end tell'''
    activate()
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=10)
    time.sleep(0.3)


def press_escape():
    """Press Escape key."""
    script = f'''tell application "System Events"
    tell process id {_window_pid}
        key code 53
    end tell
end tell'''
    activate()
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=5)
    time.sleep(0.3)


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
    try:
        subprocess.run(["osascript", "-e", 'tell application "МедикТест" to activate'],
                       capture_output=True, timeout=20)
    except subprocess.TimeoutExpired:
        pass  # app is still there, just slow to respond
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

def _click_at_screen(x, y):
    """Click at screen coordinates via AppleScript to restore focus."""
    script = f'''tell application "System Events"
    tell process id {_window_pid}
        click at {{{int(x)}, {int(y)}}}
    end tell
end tell'''
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=8)
    time.sleep(0.3)


def _refocus_question_list():
    """Click in the center of the question list to restore Flutter scroll focus."""
    if not _window_bounds:
        return
    wx, wy, ww, wh = _window_bounds
    # Click roughly in the middle of the question list area
    cx = wx + ww // 2
    cy = wy + int(wh * 0.45)
    _click_at_screen(cx, cy)


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


def scroll_list(n_up=0, n_down=0):
    """Scroll current list up (n_up) or down (n_down) by key presses."""
    if not _window_pid:
        return
    activate()
    parts = []
    if n_up:
        parts.append(f"repeat {n_up} times\n            key code 126\n            delay 0.02\n        end repeat")
    if n_down:
        parts.append(f"repeat {n_down} times\n            key code 125\n            delay 0.02\n        end repeat")
    if not parts:
        return
    script = f'''tell application "System Events"
    tell process id {_window_pid}
        {chr(10).join(parts)}
    end tell
end tell'''
    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=20)
    time.sleep(0.4)


def collect_all_block_ranges():
    """Scroll block list top→bottom, return sorted list of (start, end) tuples."""
    scroll_list(n_up=40)
    seen = {}
    stale = 0
    prev_count = -1
    for _ in range(120):
        state, elems = get_screen_state()
        if state != "block_list":
            break
        for btn in get_block_elems(elems):
            label = ax_label(btn)
            nums = re.findall(r'\d+', label)
            if len(nums) >= 2:
                key = (int(nums[0]), int(nums[1]))
                seen[key] = btn
        n = len(seen)
        if n == prev_count:
            stale += 1
            if stale >= 5:
                break
        else:
            stale = 0
            prev_count = n
        scroll_list(n_down=2)
    scroll_list(n_up=40)
    return sorted(seen.keys())


def open_block_by_range(b_start, b_end, scroll_from_top=True):
    """Scroll block list to find (b_start, b_end) and open it. Returns True on success."""
    if scroll_from_top:
        scroll_list(n_up=40)
    for attempt in range(80):
        state, elems = get_screen_state()
        if state != "block_list":
            return False
        for btn in get_block_elems(elems):
            label = ax_label(btn)
            nums = re.findall(r'\d+', label)
            if len(nums) >= 2 and int(nums[0]) == b_start and int(nums[1]) == b_end:
                print(f"  Opening block Q{b_start}-{b_end}")
                activate()
                ax_press(btn)
                time.sleep(2.0)
                return True
        scroll_list(n_down=2)
    return False


def press_back():
    """Press back button from block view. Looks for small element at top-left."""
    elems = get_content_elems()
    for e in elems[:4]:
        frame = ax_frame(e)
        if frame:
            _, fy, fw, fh = frame
            if fw < 50 and fh < 50 and fy < 100:
                activate()
                ax_press(e)
                time.sleep(1.5)
                return
    if elems:
        activate()
        ax_press(elems[0])
        time.sleep(1.5)


# ── Specialty / tab navigation ─────────────────────────────────────────────────

def navigate_tab(tab_name):
    """Press a bottom nav tab by its AXDescription (Тесты/Режимы/Задачи/Профиль).
    Tries AXPress first; falls back to Tab-key cycling."""
    elems = get_content_elems()
    for e in elems:
        if ax_role(e) == "AXImage" and ax_desc(e) == tab_name:
            activate()
            ax_press(e)
            time.sleep(1.2)
            # Verify
            elems2 = get_content_elems()
            for e2 in elems2[:3]:
                d = ax_desc(e2)
                if tab_name in d or (tab_name == "Тесты" and "блок" in d.lower()):
                    return True
    # Fallback: Tab-key cycling
    activate()
    for _ in range(8):
        script = f'''tell application "System Events"
    tell process id {_window_pid}
        key code 48
        delay 0.2
    end tell
end tell'''
        subprocess.run(["osascript", "-e", script], capture_output=True, timeout=8)
        time.sleep(0.3)
        elems = get_content_elems()
        for e in elems[:4]:
            d = ax_desc(e)
            if tab_name in d and "Tab" not in d:
                return True
    return False


def _press_elem_containing(text, max_scrolls=30):
    """Find the first content element whose description contains `text` and press it.
    Scrolls down if not immediately visible."""
    scroll_list(n_up=20)
    for _ in range(max_scrolls):
        elems = get_content_elems()
        for e in elems:
            d = ax_desc(e)
            if text in d:
                activate()
                ax_press(e)
                time.sleep(1.5)
                return True
        scroll_list(n_down=3)
    return False


def _wait_download():
    """Wait until 'Загружаем' disappears from content (download finished)."""
    for _ in range(60):
        elems = get_content_elems()
        if not any("Загружаем" in ax_desc(e) for e in elems):
            return True
        time.sleep(2.0)
    return False


def _detect_screen():
    """Detect current screen by inspecting inner elements.
    Returns one of: 'tests', 'profile', 'направления', 'spec_list', 'in_block', 'unknown'"""
    elems = get_inner_elems()
    descs = [ax_desc(e) for e in elems]
    joined = "\n".join(descs)
    if "Направления" in joined and any("аккредитация" in d for d in descs):
        return "направления"
    if "Переключить специальность" in joined:
        return "profile"
    if "Загружаем" in joined:
        return "downloading"
    # Specialty list: has many specialties but no Tests/Profile tabs
    if any(d for d in descs if len(d) > 3 and "аккредитация" not in d and
           not any(t in d for t in ["Тесты", "Режимы", "Задачи", "Профиль", "Блок", "Tab"])):
        # Could be specialty list or tests
        pass
    if any("Профиль" == d for d in descs) and any("Тесты" == d for d in descs):
        # Navigation tabs present → top-level screen
        if "Переключить специальность" in joined:
            return "profile"
        return "tests"
    state, _ = get_screen_state()
    if state == "block_list":
        return "tests"
    if state == "in_block":
        return "in_block"
    # Sub-screen: has back-navigation, no tab bar
    if elems and ax_role(elems[0]) in ("AXGenericElement", "AXButton"):
        return "spec_list"
    return "unknown"


def _find_and_press_specialty_in_list(specialty_name):
    """In the current specialty list, scroll up and find + press the specialty."""
    scroll_list(n_up=40)
    for _ in range(100):
        elems = get_inner_elems()
        for e in elems:
            d = ax_desc(e)
            if d.strip() == specialty_name or d.startswith(specialty_name + "\n"):
                activate()
                ax_press(e)
                time.sleep(1.0)
                _wait_download()
                return True
        # Stop if we see tab bar (navigated away)
        if any("Профиль" == ax_desc(e) for e in elems):
            return False
        scroll_list(n_down=3)
    return False


def open_section_in_vse_razdely(section_name):
    """From Направления: scroll down to Все разделы and press section_name."""
    print(f"  [section] Looking for '{section_name}' in Все разделы...", flush=True)
    _focus_and_scroll_specialty_list(n_pages=40)
    time.sleep(1.0)
    for attempt in range(25):
        refresh_runner()
        elems = get_inner_elems()
        for e in elems:
            d = ax_desc(e)
            if section_name in d:
                print(f"  [section] Found, pressing...", flush=True)
                activate(); ax_press(e); time.sleep(2.0)
                return True
        _focus_and_scroll_specialty_list(n_pages=5)
    print(f"  [section] FAIL: not found", flush=True)
    return False


def discover_specialties_in_section():
    """Read all specialty names visible after opening a section."""
    if _window_bounds:
        wx, wy, ww, wh = _window_bounds
        _click_at_screen(wx + ww // 2, wy + int(wh * 0.5))
        activate()
        script = f'''tell application "System Events"
    tell process id {_window_pid}
        repeat 20 times
            key code 116
            delay 0.05
        end repeat
    end tell
end tell'''
        subprocess.run(["osascript", "-e", script], capture_output=True, timeout=10)
        time.sleep(0.5)

    specialties = []
    seen = set()
    no_new = 0
    for _ in range(60):
        refresh_runner()
        elems = get_inner_elems()
        found_new = False
        for e in elems:
            d = ax_desc(e).strip()
            if not d or len(d) < 4 or d in seen:
                continue
            if d in ("Тесты", "Профиль", "Режимы", "Задачи"):
                continue
            seen.add(d)
            first_line = d.split("\n")[0].strip()
            if first_line and len(first_line) > 3 and first_line not in specialties:
                specialties.append(first_line)
                found_new = True
        if found_new: no_new = 0
        else:
            no_new += 1
            if no_new >= 5: break
        _focus_and_scroll_specialty_list(n_pages=3)
    print(f"  [discover] Found {len(specialties)} specialties", flush=True)
    return specialties


def switch_to_section_specialty(section_name, specialty_name):
    """Full flow: Profile → Переключить → section in Все разделы → specialty → Tests."""
    print(f"  [sect-sw] {section_name} → {specialty_name}", flush=True)
    unknown_count = 0
    for attempt in range(20):
        refresh_runner()
        screen = _detect_screen()
        if attempt < 5 or attempt % 5 == 0:
            print(f"  [sect-sw] screen={screen}", flush=True)
        if screen == "profile":
            break
        if screen == "tests":
            navigate_tab("Профиль"); time.sleep(1.5)
        elif screen in ("spec_list", "направления", "in_block", "downloading"):
            press_back(); time.sleep(1.2); unknown_count = 0
        elif screen == "unknown":
            unknown_count += 1
            press_back(); time.sleep(1.0)
            if unknown_count >= 3:
                navigate_tab("Профиль"); time.sleep(1.5); unknown_count = 0
    else:
        print("  [sect-sw] FAIL: Профиль не достигнут", flush=True)
        return False
    time.sleep(1.0)
    if not _press_elem_containing("Переключить специальность"):
        found = False
        for e in get_inner_elems():
            if "Переключить специальность" in ax_desc(e):
                activate(); ax_press(e); time.sleep(1.5); found = True; break
        if not found:
            print("  [sect-sw] FAIL: Переключить не найден", flush=True)
            return False
    else:
        time.sleep(1.0)
    if not open_section_in_vse_razdely(section_name):
        return False
    time.sleep(1.0)
    if not _find_and_press_specialty_in_list(specialty_name):
        print(f"  [sect-sw] FAIL: '{specialty_name}' не найден в разделе", flush=True)
        return False
    print(f"  [sect-sw] found, → Тесты", flush=True)
    navigate_tab("Тесты"); time.sleep(1.0)
    return True


def switch_specialty(specialty_name):
    """Full specialty switch flow — handles any starting screen.
    Returns True if successfully switched and back on Tests."""
    print(f"  [switch] → {specialty_name}")

    # Step 1: get to Profile, handling any starting screen
    unknown_count = 0
    for _ in range(20):
        screen = _detect_screen()
        print(f"  [switch] screen={screen}")
        if screen == "profile":
            break
        if screen == "tests":
            navigate_tab("Профиль")
            time.sleep(1.5)
        elif screen in ("spec_list", "направления", "in_block", "downloading"):
            press_back()
            time.sleep(1.2)
            unknown_count = 0
        elif screen == "unknown":
            unknown_count += 1
            if unknown_count % 2 == 1:
                # Odd: try press_back to escape sub-screens
                press_back()
                time.sleep(1.2)
            else:
                # Even: try tab navigation
                navigate_tab("Профиль")
                time.sleep(1.5)
    else:
        print("  [switch] FAIL: could not reach Profile")
        return False

    # Step 2: open "Переключить специальность"
    # Give profile screen extra time to fully render
    time.sleep(1.0)
    if not _press_elem_containing("Переключить специальность"):
        # Try via get_inner_elems directly
        found = False
        for e in get_inner_elems():
            if "Переключить специальность" in ax_desc(e):
                activate()
                ax_press(e)
                time.sleep(1.5)
                found = True
                break
        if not found:
            print("  [switch] FAIL: Переключить специальность not found")
            return False
    else:
        time.sleep(1.0)

    # Step 3: Use search on Направления screen to find specialty
    time.sleep(1.0)

    # 3a: Find and press the search icon (🔍) in top-right corner
    search_pressed = False
    elems = get_inner_elems()
    for e in elems:
        frame = ax_frame(e)
        if frame:
            fx, fy, fw, fh = frame
            # Search icon: small element in top-right area
            if fw < 60 and fh < 60 and fy < 120 and fx > 300:
                print(f"  [switch] pressing search icon at ({fx:.0f},{fy:.0f})")
                activate()
                ax_press(e)
                time.sleep(1.0)
                search_pressed = True
                break
    if not search_pressed:
        print("  [switch] search icon not found, trying fallback scroll")
        return _switch_specialty_scroll(specialty_name)

    # 3b: Type specialty name
    print(f"  [switch] typing '{specialty_name}'")
    type_text(specialty_name)
    time.sleep(1.5)

    # 3c: Find and press matching result
    for attempt in range(10):
        elems = get_inner_elems()
        for e in elems:
            d = ax_desc(e)
            if specialty_name in d and len(d) > len(specialty_name):
                print(f"  [switch] found '{specialty_name}', pressing")
                activate()
                ax_press(e)
                time.sleep(1.5)
                _wait_download()
                navigate_tab("Тесты")
                time.sleep(1.0)
                return True
        time.sleep(0.5)

    # If search showed no results, clear and escape
    print(f"  [switch] search found nothing, clearing")
    clear_search()
    press_escape()
    time.sleep(0.5)

    # Fallback to scroll method
    return _switch_specialty_scroll(specialty_name)


def _switch_specialty_scroll(specialty_name):
    """Fallback: scroll the Направления list to find specialty."""
    scroll_list(n_up=120)
    for _ in range(120):
        elems = get_inner_elems()
        for e in elems:
            d = ax_desc(e)
            if specialty_name in d and ("аккредитация" in d or "образование" in d.lower()):
                print(f"  [switch-scroll] found '{specialty_name}', pressing")
                activate()
                ax_press(e)
                time.sleep(1.5)
                _wait_download()
                navigate_tab("Тесты")
                time.sleep(1.0)
                return True
        scroll_list(n_down=3)
    print(f"  [switch] FAIL: '{specialty_name}' not found")
    return False


ORDINATOR_SPECIALTIES = [
    "Акушерство и гинекология",
    "Аллергология и иммунология",
    "Анестезиология-реаниматология",
    "Бактериология",
    "Вирусология",
    "Водолазная медицина",
    "Гастроэнтерология",
    "Гематология",
    "Генетика",
    "Гериатрия",
    "Гигиена питания",
    "Гигиена труда",
    "Гигиеническое воспитание",
    "Дезинфектология",
    "Дерматовенерология",
    "Детская кардиология",
    "Детская онкология",
    "Детская онкология-гематология",
    "Детская урология-андрология",
    "Детская хирургия",
    "Детская эндокринология",
    "Диетология",
    "Инфекционные болезни",
    "Кардиология",
    "Клиническая лабораторная диагностика",
    "Клиническая фармакология",
    "Колопроктология",
    "Косметология",
    "Лабораторная генетика",
    "Лечебная физкультура и спортивная медицина",
    "Мануальная терапия",
    "Медико-профилактическое дело",
    "Медико-социальная экспертиза",
    "Медицинская биофизика",
    "Медицинская биохимия",
    "Медицинская кибернетика",
    "Медицинская микробиология",
    "Неврология",
    "Нейрохирургия",
    "Неонатология",
    "Нефрология",
    "Общая гигиена",
    "Онкология",
    "Организация здравоохранения и общественное здоровье",
    "Ортодонтия",
    "Остеопатия",
    "Оториноларингология",
    "Офтальмология",
    "Паразитология",
    "Патологическая анатомия",
    "Педиатрия",
    "Пластическая хирургия",
    "Профпатология",
    "Психиатрия",
    "Психиатрия-наркология",
    "Психотерапия",
    "Пульмонология",
    "Радиационная гигиена",
    "Радиология",
    "Радиотерапия",
    "Ревматология",
    "Рентгенология",
    "Рентгенэндоваскулярные диагностика и лечение",
    "Рефлексотерапия",
    "Санитарно-гигиенические лабораторные исследования",
    "Сексология",
    "Семейная медицина",
    "Сердечно-сосудистая хирургия",
    "Скорая медицинская помощь",
    "Социальная гигиена и организация госсанэпидслужбы",
    "Стоматология",
    "Стоматология детская",
    "Стоматология общей практики",
    "Стоматология ортопедическая",
    "Стоматология терапевтическая",
    "Стоматология хирургическая",
    "Судебно-медицинская экспертиза",
    "Судебно-психиатрическая экспертиза",
    "Сурдология-оториноларингология",
    "Терапия",
    "Токсикология",
    "Торакальная хирургия",
    "Травматология и ортопедия",
    "Трансфузиология",
    "Ультразвуковая диагностика",
    "Управление сестринской деятельностью",
    "Урология",
    "Фармацевтическая технология",
    "Фармацевтическая химия и фармакогнозия",
    "Фармация",
    "Физиотерапия",
    "Физическая и реабилитационная медицина",
    "Фтизиатрия",
    "Функциональная диагностика",
    "Хирургия",
    "Челюстно-лицевая хирургия",
    "Эндокринология",
    "Эндоскопия",
    "Эпидемиология",
]


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
                # When stale but last question not yet seen — restore focus + bigger scroll
                if stale_count % 3 == 0 and b_end not in all_questions:
                    # Re-focus the Flutter scroll view by clicking in the question area
                    _refocus_question_list()
                    # Then try Page Down for a bigger jump to trigger Flutter lazy load
                    activate()
                    script = f'''tell application "System Events"
    tell process id {_window_pid}
        key code 121
        delay 0.15
        key code 125
        delay 0.05
        key code 125
    end tell
end tell'''
                    subprocess.run(["osascript", "-e", script], capture_output=True, timeout=10)
                    time.sleep(0.5)
            else:
                stale_count = 0
                last_seen_max = cur_max

            seen_last = b_end in all_questions
            have_enough = len(all_questions) >= expected_q * 0.95
            if stale_count >= MAX_STALE and seen_last and have_enough:
                print(f"    Stale at Q{cur_max}, {len(all_questions)}/{expected_q}q — done")
                break
            elif stale_count >= MAX_STALE * 5:
                print(f"    Hard stale at Q{cur_max}, {len(all_questions)}/{expected_q}q — stopping")
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


# ── Single-specialty scraper ───────────────────────────────────────────────────

def scrape_current_specialty(spec_name, start_block=0):
    """Scrape all blocks of the currently loaded specialty. Returns (total_q, total_valid)."""
    spec_dir = os.path.join(TESTS_DIR, spec_name)
    os.makedirs(spec_dir, exist_ok=True)

    # Ensure we're on block list
    state, _ = get_screen_state()
    if state == "in_block":
        press_back()
        time.sleep(1.5)
        state, _ = get_screen_state()
    if state != "block_list":
        print(f"  ERROR: expected block_list, got '{state}'")
        return 0, 0

    # Enumerate all blocks by scrolling
    all_ranges = collect_all_block_ranges()
    print(f"  Blocks: {len(all_ranges)} — {all_ranges}")

    for idx, (b_start, b_end) in enumerate(all_ranges):
        if idx < start_block:
            continue
        expected_q = b_end - b_start + 1
        block_file = os.path.join(spec_dir, f"block_{b_start}-{b_end}.json")

        # Skip if already scraped well
        if os.path.exists(block_file):
            try:
                existing = json.load(open(block_file))
                valid = sum(1 for q in existing if q.get("correctIndex", -1) >= 0)
                if len(existing) >= expected_q and valid >= expected_q * 0.9:
                    print(f"\n--- [{idx+1}/{len(all_ranges)}] {b_start}-{b_end}: SKIP ({len(existing)}q {valid}✓) ---")
                    continue
            except Exception:
                pass

        print(f"\n--- [{idx+1}/{len(all_ranges)}] {b_start}–{b_end} ({expected_q}q) ---")

        # Ensure on block list before opening
        state, _ = get_screen_state()
        if state != "block_list":
            press_back()
            time.sleep(1.5)

        if not open_block_by_range(b_start, b_end):
            print(f"  FAIL: could not open block {b_start}-{b_end}")
            continue

        questions = scrape_block(b_start, b_end)

        press_back()
        time.sleep(1.5)

        with open(block_file, "w", encoding="utf-8") as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
        valid = sum(1 for q in questions if q["correctIndex"] >= 0)
        pct = valid * 100 // max(len(questions), 1)
        print(f"  ✓ Saved: {len(questions)}q, {valid}✓ ({pct}%)")

    # Summary for this specialty
    total_q = total_v = 0
    for fn in sorted(os.listdir(spec_dir)):
        if fn.endswith(".json"):
            data = json.load(open(os.path.join(spec_dir, fn)))
            v = sum(1 for q in data if q.get("correctIndex", -1) >= 0)
            total_q += len(data)
            total_v += v
    return total_q, total_v


# ── Targeted retry ────────────────────────────────────────────────────────────

def scrape_specific_blocks(spec_name, block_ranges):
    """Scrape only specific blocks without enumerating all.

    Merges new data with existing JSON: questions with correctIndex >= 0
    take priority over those without.

    Args:
        spec_name: specialty name (must already be loaded in app)
        block_ranges: list of (b_start, b_end) tuples to scrape

    Returns:
        (total_questions, total_valid_answers) across all merged blocks
    """
    spec_dir = os.path.join(TESTS_DIR, spec_name)
    os.makedirs(spec_dir, exist_ok=True)

    # Ensure we're on block list
    state, _ = get_screen_state()
    if state == "in_block":
        press_back()
        time.sleep(1.5)

    total_q = total_v = 0

    for i, (b_start, b_end) in enumerate(block_ranges):
        expected_q = b_end - b_start + 1
        block_file = os.path.join(spec_dir, f"block_{b_start}-{b_end}.json")

        print(f"\n--- [{i+1}/{len(block_ranges)}] {b_start}-{b_end} ({expected_q}q) ---")

        # Load existing data for merge
        existing = {}
        if os.path.exists(block_file):
            try:
                for q in json.load(open(block_file)):
                    existing[q["num"]] = q
            except Exception:
                pass

        # Open block (scroll from top only for the first one)
        if not open_block_by_range(b_start, b_end, scroll_from_top=(i == 0)):
            # Fallback: scroll from top
            if not open_block_by_range(b_start, b_end, scroll_from_top=True):
                print(f"  FAIL: block {b_start}-{b_end} not found")
                continue

        questions = scrape_block(b_start, b_end)

        press_back()
        time.sleep(1.5)

        # Merge: new questions supplement old; prefer correctIndex >= 0
        for q in questions:
            num = q["num"]
            old = existing.get(num)
            if old is None:
                existing[num] = q
            elif q.get("correctIndex", -1) >= 0:
                existing[num] = q
            # else keep old

        merged = sorted(existing.values(), key=lambda x: x["num"])
        with open(block_file, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)

        valid = sum(1 for q in merged if q.get("correctIndex", -1) >= 0)
        total_q += len(merged)
        total_v += valid
        print(f"  Saved: {len(merged)}q, {valid} correct")

    return total_q, total_v


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    """Usage:
      python3 ax_scraper.py current           — scrape current specialty (app on block list)
      python3 ax_scraper.py урология          — scrape specific name (must be on its block list)
      python3 ax_scraper.py --all             — scrape all ORDINATOR_SPECIALTIES in order
      python3 ax_scraper.py --all Акушерство  — resume from matching specialty name
    """
    if not refresh_runner():
        print("ERROR: MedikTest not found. Open the app first.")
        sys.exit(1)
    print(f"Runner PID={_window_pid}, WID={_window_id}, bounds={_window_bounds}")

    mode = sys.argv[1] if len(sys.argv) > 1 else "current"

    if mode == "--all":
        # Multi-specialty mode
        resume_from = sys.argv[2].lower() if len(sys.argv) > 2 else ""
        started = not resume_from
        grand_total = grand_valid = 0

        for spec_name in ORDINATOR_SPECIALTIES:
            if not started:
                if resume_from in spec_name.lower():
                    started = True
                else:
                    print(f"  skip {spec_name}")
                    continue

            print(f"\n{'='*60}")
            print(f"=== SPECIALTY: {spec_name} ===")
            print(f"{'='*60}")

            # Switch to this specialty
            if not switch_specialty(spec_name):
                print(f"  SKIP (could not switch to '{spec_name}')")
                continue

            refresh_runner()
            time.sleep(1.0)

            tq, tv = scrape_current_specialty(spec_name)
            grand_total += tq
            grand_valid += tv
            print(f"  [{spec_name}] {tq}q, {tv}✓")

        print(f"\n{'='*60}")
        print(f"=== ALL DONE: {grand_total}q total, {grand_valid}✓ ===")

    else:
        # Single specialty mode — app must already be on block list
        spec_name = mode
        print(f"=== Scraping: {spec_name} ===")

        start_block = int(sys.argv[2]) if len(sys.argv) > 2 else 0
        tq, tv = scrape_current_specialty(spec_name, start_block)
        print(f"\n=== DONE: {spec_name} — {tq}q total, {tv}✓ ===")


if __name__ == "__main__":
    main()
