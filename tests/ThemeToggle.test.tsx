import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";

import { applyMode, isDarkFor, readStored, ThemeToggle } from "@/components/ThemeToggle";
import { ThemeSync } from "@/components/ThemeSync";

// jsdom has no matchMedia — stub it. `dark` = does the OS prefer dark.
function mockMatchMedia(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark && query.includes("dark"),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const hasDark = () => document.documentElement.classList.contains("dark");
// SunIcon renders a <circle>; MoonIcon does not — so a circle means "sun shown".
const showsSun = (root: HTMLElement) => root.querySelector("svg circle") !== null;

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  mockMatchMedia(false); // default: OS light
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("theme logic", () => {
  it("isDarkFor honors explicit modes and falls back to the OS for system", () => {
    expect(isDarkFor("dark")).toBe(true);
    expect(isDarkFor("light")).toBe(false);
    mockMatchMedia(true);
    expect(isDarkFor("system")).toBe(true);
    mockMatchMedia(false);
    expect(isDarkFor("system")).toBe(false);
  });

  it("readStored reads the raw key; unknown/absent => system", () => {
    expect(readStored()).toBe("system");
    localStorage.setItem("promptlib:theme", "dark");
    expect(readStored()).toBe("dark");
    localStorage.setItem("promptlib:theme", "nonsense");
    expect(readStored()).toBe("system");
  });

  it("applyMode toggles the .dark class on <html>", () => {
    applyMode("dark");
    expect(hasDark()).toBe(true);
    applyMode("light");
    expect(hasDark()).toBe(false);
    mockMatchMedia(true);
    applyMode("system");
    expect(hasDark()).toBe(true);
  });
});

describe("ThemeSync re-assert (the hydration-strip fix)", () => {
  it("applies dark for a stored 'dark' preference", () => {
    localStorage.setItem("promptlib:theme", "dark");
    render(<ThemeSync />);
    expect(hasDark()).toBe(true);
  });

  it("applies dark for a no-key visitor whose OS prefers dark", () => {
    mockMatchMedia(true); // no stored key + OS dark = system-dark first visit
    render(<ThemeSync />);
    expect(hasDark()).toBe(true);
  });

  it("leaves a stored 'light' preference undarkened", () => {
    localStorage.setItem("promptlib:theme", "light");
    render(<ThemeSync />);
    expect(hasDark()).toBe(false);
  });
});

describe("ThemeToggle glyph agrees with the applied theme", () => {
  it("stored dark => sun", () => {
    localStorage.setItem("promptlib:theme", "dark");
    const { container } = render(<ThemeToggle />);
    expect(showsSun(container)).toBe(true);
  });

  it("stored light => moon", () => {
    localStorage.setItem("promptlib:theme", "light");
    const { container } = render(<ThemeToggle />);
    expect(showsSun(container)).toBe(false);
  });

  it("system + OS dark => sun (never a sun over a light page — page is dark here)", () => {
    mockMatchMedia(true);
    const { container } = render(<ThemeToggle />);
    expect(showsSun(container)).toBe(true);
  });
});

describe("ThemeToggle cycle: light -> dark -> system, persisting correctly", () => {
  it("cycles mode, persists the key, and applies the class", () => {
    localStorage.setItem("promptlib:theme", "light");
    const { getByRole } = render(<ThemeToggle />);
    const btn = getByRole("button");
    expect(btn).toHaveAttribute("aria-label", "Light mode (click for dark)");

    fireEvent.click(btn); // -> dark
    expect(localStorage.getItem("promptlib:theme")).toBe("dark");
    expect(hasDark()).toBe(true);
    expect(btn).toHaveAttribute("aria-label", "Dark mode (click for system)");

    fireEvent.click(btn); // -> system (key removed; OS is light here)
    expect(localStorage.getItem("promptlib:theme")).toBeNull();
    expect(hasDark()).toBe(false);
    expect(btn).toHaveAttribute("aria-label", "Following system (click for light)");
  });
});
