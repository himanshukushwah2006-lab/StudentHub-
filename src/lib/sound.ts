import { useEffect, useState } from "react";

export type SoundProfile = "tactile" | "glass" | "marimba" | "mechanical";
export type SoundKind = "click" | "nav" | "success" | "delete" | "toggle" | "soft" | "hover" | "key";

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0 to 1
  profile: SoundProfile;
  clickAnywhere: boolean;
  hoverEnabled: boolean;
  typingEnabled: boolean;
}

export const SOUND_PROFILES: { id: SoundProfile; label: string; description: string }[] = [
  { id: "tactile", label: "Studio Tactile", description: "Crisp acoustic pop with gentle harmonic warmth" },
  { id: "glass", label: "Crystal Glass", description: "Clean high-clarity chime tap" },
  { id: "marimba", label: "Soft Marimba", description: "Warm wooden resonance on each interaction" },
  { id: "mechanical", label: "Mechanical Key", description: "Precise damped switch click" },
];

const STORAGE_KEY = "mits_studenthub_sound_v1";

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.65,
  profile: "tactile",
  clickAnywhere: true,
  hoverEnabled: true,
  typingEnabled: true,
};

let currentSettings: SoundSettings = loadSettings();
const settingsListeners = new Set<() => void>();
const playListeners = new Set<(kind: SoundKind) => void>();

let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let lastClickTime = 0;

function loadSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_SETTINGS.enabled,
      volume: typeof parsed.volume === "number" ? Math.min(1, Math.max(0, parsed.volume)) : DEFAULT_SETTINGS.volume,
      profile:
        parsed.profile === "tactile" ||
        parsed.profile === "glass" ||
        parsed.profile === "marimba" ||
        parsed.profile === "mechanical"
          ? parsed.profile
          : DEFAULT_SETTINGS.profile,
      clickAnywhere:
        typeof parsed.clickAnywhere === "boolean" ? parsed.clickAnywhere : DEFAULT_SETTINGS.clickAnywhere,
      hoverEnabled:
        typeof parsed.hoverEnabled === "boolean" ? parsed.hoverEnabled : DEFAULT_SETTINGS.hoverEnabled,
      typingEnabled:
        typeof parsed.typingEnabled === "boolean" ? parsed.typingEnabled : DEFAULT_SETTINGS.typingEnabled,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(next: SoundSettings) {
  currentSettings = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
  settingsListeners.forEach((cb) => cb());
}

export function getSoundSettings(): SoundSettings {
  return currentSettings;
}

export function updateSoundSettings(patch: Partial<SoundSettings>) {
  saveSettings({ ...currentSettings, ...patch });
}

export function onSoundPlayed(listener: (kind: SoundKind) => void): () => void {
  playListeners.add(listener);
  return () => {
    playListeners.delete(listener);
  };
}

export function useSoundSettings() {
  const [settings, setSettings] = useState<SoundSettings>(currentSettings);

  useEffect(() => {
    const handle = () => setSettings(currentSettings);
    settingsListeners.add(handle);
    return () => {
      settingsListeners.delete(handle);
    };
  }, []);

  return {
    settings,
    setEnabled: (enabled: boolean) => {
      updateSoundSettings({ enabled });
      if (enabled) playSound("toggle");
    },
    setVolume: (volume: number) => updateSoundSettings({ volume }),
    setProfile: (profile: SoundProfile) => {
      updateSoundSettings({ profile });
      playSound("click");
    },
    setClickAnywhere: (clickAnywhere: boolean) => {
      updateSoundSettings({ clickAnywhere });
      playSound("toggle");
    },
    setHoverEnabled: (hoverEnabled: boolean) => {
      updateSoundSettings({ hoverEnabled });
      if (hoverEnabled) playHoverSound("nav", true);
    },
    setTypingEnabled: (typingEnabled: boolean) => {
      updateSoundSettings({ typingEnabled });
      if (typingEnabled) playMechanicalKey("a", true);
    },
  };
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;

  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) return noiseBuffer;
  const length = Math.floor(ctx.sampleRate * 0.04);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    // Exponentially decaying white noise for crisp mechanical transient
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.25));
  }
  noiseBuffer = buffer;
  return buffer;
}

function playTone(
  ctx: AudioContext,
  options: {
    type: OscillatorType;
    startFreq: number;
    endFreq: number;
    duration: number;
    gain: number;
    delay?: number;
  }
) {
  const now = ctx.currentTime + (options.delay ?? 0);
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = options.type;
  osc.frequency.setValueAtTime(options.startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFreq), now + options.duration);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.linearRampToValueAtTime(options.gain, now + 0.004);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + options.duration + 0.01);
}

function playTransientClick(ctx: AudioContext, filterFreq: number, gain: number, duration = 0.024) {
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(filterFreq, now);
  filter.Q.setValueAtTime(1.8, now);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(gain, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  src.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  src.start(now);
  src.stop(now + duration + 0.005);
}

export function getLastSoundTime(): number {
  return lastClickTime;
}

export function playSound(kind: SoundKind = "click", force = false) {
  if (!force && !currentSettings.enabled) return;
  const vol = Math.max(0.05, currentSettings.volume);
  if (vol <= 0) return;

  // Prevent double-triggering within 35ms from nested event handlers
  const nowMs = performance.now();
  if (!force && kind === "click" && nowMs - lastClickTime < 35) return;
  lastClickTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  const profile = currentSettings.profile;
  playListeners.forEach((cb) => cb(kind));

  if (kind === "success") {
    playTone(ctx, { type: "sine", startFreq: 523.25, endFreq: 523.25, duration: 0.14, gain: 0.14 * vol, delay: 0 });
    playTone(ctx, { type: "triangle", startFreq: 659.25, endFreq: 659.25, duration: 0.16, gain: 0.12 * vol, delay: 0.065 });
    playTone(ctx, { type: "sine", startFreq: 783.99, endFreq: 783.99, duration: 0.24, gain: 0.13 * vol, delay: 0.13 });
    return;
  }

  if (kind === "delete") {
    playTone(ctx, { type: "triangle", startFreq: 310, endFreq: 135, duration: 0.14, gain: 0.14 * vol });
    playTransientClick(ctx, 900, 0.08 * vol, 0.02);
    return;
  }

  if (kind === "toggle") {
    playTransientClick(ctx, 2600, 0.12 * vol, 0.018);
    playTone(ctx, { type: "sine", startFreq: 680, endFreq: 960, duration: 0.055, gain: 0.11 * vol });
    return;
  }

  if (kind === "nav") {
    if (profile === "glass") {
      playTone(ctx, { type: "sine", startFreq: 980, endFreq: 1240, duration: 0.09, gain: 0.1 * vol });
      playTone(ctx, { type: "sine", startFreq: 1480, endFreq: 1480, duration: 0.07, gain: 0.05 * vol, delay: 0.025 });
    } else if (profile === "marimba") {
      playTone(ctx, { type: "sine", startFreq: 440, endFreq: 587.33, duration: 0.1, gain: 0.15 * vol });
    } else if (profile === "mechanical") {
      playTransientClick(ctx, 3200, 0.18 * vol, 0.022);
      playTone(ctx, { type: "triangle", startFreq: 420, endFreq: 210, duration: 0.04, gain: 0.1 * vol });
    } else {
      playTransientClick(ctx, 2200, 0.09 * vol, 0.016);
      playTone(ctx, { type: "sine", startFreq: 540, endFreq: 760, duration: 0.075, gain: 0.12 * vol });
    }
    return;
  }

  if (kind === "soft") {
    if (profile === "mechanical") {
      playTransientClick(ctx, 1800, 0.09 * vol, 0.015);
      playTone(ctx, { type: "sine", startFreq: 260, endFreq: 160, duration: 0.035, gain: 0.05 * vol });
    } else if (profile === "glass") {
      playTone(ctx, { type: "sine", startFreq: 1120, endFreq: 880, duration: 0.055, gain: 0.06 * vol });
    } else if (profile === "marimba") {
      playTone(ctx, { type: "sine", startFreq: 350, endFreq: 280, duration: 0.065, gain: 0.08 * vol });
    } else {
      playTone(ctx, { type: "sine", startFreq: 420, endFreq: 280, duration: 0.045, gain: 0.07 * vol });
    }
    return;
  }

  // Default "click"
  switch (profile) {
    case "glass":
      playTone(ctx, { type: "sine", startFreq: 1280, endFreq: 1020, duration: 0.075, gain: 0.11 * vol });
      playTone(ctx, { type: "triangle", startFreq: 2400, endFreq: 1800, duration: 0.04, gain: 0.04 * vol });
      break;
    case "marimba":
      playTone(ctx, { type: "sine", startFreq: 520, endFreq: 390, duration: 0.09, gain: 0.16 * vol });
      playTone(ctx, { type: "triangle", startFreq: 1040, endFreq: 780, duration: 0.035, gain: 0.05 * vol });
      break;
    case "mechanical":
      playTransientClick(ctx, 3600, 0.22 * vol, 0.02);
      playTone(ctx, { type: "triangle", startFreq: 340, endFreq: 120, duration: 0.038, gain: 0.12 * vol });
      break;
    case "tactile":
    default:
      playTransientClick(ctx, 2500, 0.14 * vol, 0.018);
      playTone(ctx, { type: "sine", startFreq: 660, endFreq: 360, duration: 0.055, gain: 0.13 * vol });
      break;
  }
}

const BRANCH_SPEECH_MAP: Record<string, string> = {
  CSE: "C. S. E.",
  IT: "I. T.",
  "AI & DS": "A. I. and D. S.",
  ECE: "E. C. E.",
  EE: "E. E.",
  ME: "M. E.",
  CE: "C. E.",
  IoT: "I. O. T.",
  ALL: "All Departments",
};

export function speakBranch(branch: string, force = false) {
  if (!force && !currentSettings.enabled) return;
  const vol = Math.max(0.05, currentSettings.volume);
  if (vol <= 0) return;

  // Trigger a crisp tactile click transient alongside the spoken branch name
  playSound("click", force);

  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const text = BRANCH_SPEECH_MAP[branch] ?? branch;

  try {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1.05;
    utterance.pitch = 1.02;
    utterance.volume = Math.min(1, vol);

    const voices = synth.getVoices();
    const preferred =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find((v) => v.lang.startsWith("en-")) ||
      null;
    if (preferred) {
      utterance.voice = preferred;
    }

    synth.speak(utterance);
  } catch {
    // Ignore speech synthesis errors on restricted platforms
  }
}

// Smooth pentatonic scale notes (Hz) for silky, musical cursor hover & glide feedback
const HOVER_NOTES_NAV = [523.25, 587.33, 659.25, 783.99, 880.0];
const HOVER_NOTES_CARD = [392.0, 440.0, 523.25, 587.33];
const HOVER_NOTES_CONTROL = [659.25, 783.99, 880.0, 1046.5];

let hoverNoteIndex = 0;
let lastHoverTime = 0;
let lastGlideTime = 0;

function playSmoothEnvelopeTone(
  ctx: AudioContext,
  options: {
    startFreq: number;
    endFreq: number;
    attack: number;
    duration: number;
    peakGain: number;
    type?: OscillatorType;
  }
) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  osc.type = options.type ?? "sine";
  osc.frequency.setValueAtTime(options.startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, options.endFreq), now + options.duration);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1900, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(options.peakGain, now + options.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + options.duration + 0.015);
}

export function playHoverSound(zone: "nav" | "card" | "control" = "control", force = false) {
  if (!force && (!currentSettings.enabled || !currentSettings.hoverEnabled)) return;
  const vol = Math.max(0.05, currentSettings.volume);
  if (vol <= 0) return;

  const nowMs = performance.now();
  if (!force && nowMs - lastHoverTime < 90) return;
  lastHoverTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  hoverNoteIndex = (hoverNoteIndex + 1) % 20;

  if (zone === "nav") {
    const base = HOVER_NOTES_NAV[hoverNoteIndex % HOVER_NOTES_NAV.length];
    playSmoothEnvelopeTone(ctx, {
      startFreq: base * 0.96,
      endFreq: base * 1.06,
      attack: 0.024,
      duration: 0.16,
      peakGain: 0.048 * vol,
      type: "sine",
    });
    // Airy harmonic overtone
    playSmoothEnvelopeTone(ctx, {
      startFreq: base * 1.5,
      endFreq: base * 1.54,
      attack: 0.03,
      duration: 0.14,
      peakGain: 0.016 * vol,
      type: "sine",
    });
    return;
  }

  if (zone === "card") {
    const base = HOVER_NOTES_CARD[hoverNoteIndex % HOVER_NOTES_CARD.length];
    playSmoothEnvelopeTone(ctx, {
      startFreq: base * 0.94,
      endFreq: base * 1.02,
      attack: 0.035,
      duration: 0.19,
      peakGain: 0.032 * vol,
      type: "sine",
    });
    return;
  }

  const base = HOVER_NOTES_CONTROL[hoverNoteIndex % HOVER_NOTES_CONTROL.length];
  playSmoothEnvelopeTone(ctx, {
    startFreq: base * 0.98,
    endFreq: base * 1.04,
    attack: 0.018,
    duration: 0.11,
    peakGain: 0.036 * vol,
    type: "sine",
  });
}

export function playCursorGlide(normalizedX: number, speed: number) {
  if (!currentSettings.enabled || !currentSettings.hoverEnabled) return;
  const vol = Math.max(0.05, currentSettings.volume);
  if (vol <= 0) return;

  const nowMs = performance.now();
  if (nowMs - lastGlideTime < 420 || nowMs - lastHoverTime < 220) return;
  lastGlideTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  // Map horizontal cursor sweep softly across a calm pentatonic band (330 Hz -> 660 Hz)
  const clampedX = Math.max(0, Math.min(1, normalizedX));
  const freq = 330 + clampedX * 310;
  const intensity = Math.min(1, Math.max(0.35, speed / 45));

  playSmoothEnvelopeTone(ctx, {
    startFreq: freq * 0.97,
    endFreq: freq * 1.05,
    attack: 0.05,
    duration: 0.26,
    peakGain: 0.022 * vol * intensity,
    type: "sine",
  });
}

let lastKeySoundTime = 0;

/**
 * Synthesizes an authentic tactile/thocky mechanical keyboard switch sound
 * with distinct acoustic signatures for Spacebar, Enter, Backspace, and standard keys.
 */
export function playMechanicalKey(key = "a", force = false) {
  if (!force && (!currentSettings.enabled || !currentSettings.typingEnabled)) return;
  const vol = Math.max(0.05, currentSettings.volume);
  if (vol <= 0) return;

  const nowMs = performance.now();
  if (!force && nowMs - lastKeySoundTime < 26) return;
  lastKeySoundTime = nowMs;

  const ctx = getAudioContext();
  if (!ctx) return;

  playListeners.forEach((cb) => cb("key"));

  // Slight organic pitch variation so rapid typing feels genuinely physical
  const jitter = 0.93 + Math.random() * 0.14;

  if (key === " ") {
    // Spacebar: deeper, fuller stabilized thock
    playTransientClick(ctx, 1750 * jitter, 0.24 * vol, 0.024);
    playTone(ctx, {
      type: "triangle",
      startFreq: 145 * jitter,
      endFreq: 52,
      duration: 0.052,
      gain: 0.22 * vol,
    });
    playTone(ctx, {
      type: "sine",
      startFreq: 95 * jitter,
      endFreq: 42,
      duration: 0.06,
      gain: 0.14 * vol,
    });
    return;
  }

  if (key === "Enter") {
    // Enter: decisive crisp click + resonant bottom-out
    playTransientClick(ctx, 3100 * jitter, 0.28 * vol, 0.022);
    playTone(ctx, {
      type: "triangle",
      startFreq: 195 * jitter,
      endFreq: 64,
      duration: 0.048,
      gain: 0.21 * vol,
    });
    playTone(ctx, {
      type: "sine",
      startFreq: 520 * jitter,
      endFreq: 210,
      duration: 0.026,
      gain: 0.08 * vol,
    });
    return;
  }

  if (key === "Backspace" || key === "Delete") {
    // Backspace: tighter, slightly hollow return snap
    playTransientClick(ctx, 2350 * jitter, 0.24 * vol, 0.02);
    playTone(ctx, {
      type: "triangle",
      startFreq: 230 * jitter,
      endFreq: 86,
      duration: 0.038,
      gain: 0.17 * vol,
    });
    return;
  }

  // Standard alphanumeric mechanical switch: crisp leaf click + warm PBT keycap thock
  playTransientClick(ctx, 3350 * jitter, 0.25 * vol, 0.017);
  playTone(ctx, {
    type: "triangle",
    startFreq: 260 * jitter,
    endFreq: 82,
    duration: 0.036,
    gain: 0.18 * vol,
  });
  playTone(ctx, {
    type: "sine",
    startFreq: 680 * jitter,
    endFreq: 280,
    duration: 0.018,
    gain: 0.065 * vol,
  });
}
