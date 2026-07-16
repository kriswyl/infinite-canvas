import type { AiConfig } from "@/stores/use-config-store";

export const klingVersionOptions = [
    { value: "kling-v1", label: "Kling V1" },
    { value: "kling-v1-5", label: "Kling V1.5" },
    { value: "kling-v1-6", label: "Kling V1.6" },
    { value: "kling-v2-master", label: "Kling V2 Master" },
    { value: "kling-v2-1", label: "Kling V2.1" },
    { value: "kling-v2-1-master", label: "Kling V2.1 Master" },
    { value: "kling-v2-5-turbo", label: "Kling V2.5 Turbo" },
    { value: "kling-v2-6", label: "Kling V2.6" },
    { value: "kling-v3", label: "Kling V3" },
] as const;

export const klingModeOptions = [
    { value: "std", label: "标准" },
    { value: "pro", label: "专业" },
] as const;

export const klingRatioOptions = [
    { value: "16:9", label: "横屏", width: 16, height: 9 },
    { value: "9:16", label: "竖屏", width: 9, height: 16 },
    { value: "1:1", label: "方形", width: 1, height: 1 },
] as const;

export const klingDurationOptions = [5, 10] as const;

export type KlingMode = "std" | "pro";
type KlingAudioSupport = "none" | "all" | "pro"; // none=不支持；all=两种模式都支持；pro=仅专业模式
type KlingDuration = { type: "fixed"; values: number[] } | { type: "range"; min: number; max: number };
export type KlingCapability = { modes: KlingMode[]; duration: KlingDuration; audio: KlingAudioSupport; voice: boolean };

const FIXED_5_10: KlingDuration = { type: "fixed", values: [5, 10] };

const KLING_CAPABILITIES: Record<string, KlingCapability> = {
    "kling-v1": { modes: ["std", "pro"], duration: FIXED_5_10, audio: "none", voice: false },
    "kling-v1-5": { modes: ["std", "pro"], duration: FIXED_5_10, audio: "none", voice: false },
    "kling-v1-6": { modes: ["std", "pro"], duration: FIXED_5_10, audio: "none", voice: false },
    "kling-v2-master": { modes: ["std"], duration: FIXED_5_10, audio: "none", voice: false },
    "kling-v2-1": { modes: ["std", "pro"], duration: FIXED_5_10, audio: "none", voice: false },
    "kling-v2-1-master": { modes: [], duration: FIXED_5_10, audio: "none", voice: false },
    "kling-v2-5-turbo": { modes: ["std", "pro"], duration: FIXED_5_10, audio: "none", voice: false },
    "kling-v2-6": { modes: ["std", "pro"], duration: FIXED_5_10, audio: "pro", voice: true },
    "kling-v3": { modes: ["std", "pro"], duration: { type: "range", min: 3, max: 15 }, audio: "all", voice: false },
};

export function isKlingVideoConfig(config: Pick<AiConfig, "apiFormat">) {
    return config.apiFormat === "kling";
}

export function normalizeKlingVersion(value: string) {
    const model = (value || "").trim();
    return klingVersionOptions.some((option) => option.value === model) ? model : "kling-v1";
}

export function klingCapability(version: string): KlingCapability {
    return KLING_CAPABILITIES[normalizeKlingVersion(version)];
}

export function normalizeKlingMode(value: string, version?: string) {
    const requested: KlingMode = value === "pro" ? "pro" : "std";
    if (!version) return requested;
    const { modes } = klingCapability(version);
    if (!modes.length) return requested; // 无 std/pro 区分的版本，保留原值仅用于占位
    return modes.includes(requested) ? requested : modes[0];
}

export function normalizeKlingRatio(value: string) {
    if (klingRatioOptions.some((option) => option.value === value)) return value as (typeof klingRatioOptions)[number]["value"];
    const dimensions = value.match(/^(\d+)x(\d+)$/);
    if (dimensions) {
        const ratio = Number(dimensions[1]) / Number(dimensions[2]);
        if (ratio < 0.8) return "9:16";
        if (ratio < 1.25) return "1:1";
    }
    return "16:9";
}

export function normalizeKlingDuration(value: string, version?: string) {
    const seconds = Number(value) || 5;
    const duration = version ? klingCapability(version).duration : FIXED_5_10;
    if (duration.type === "range") return String(Math.max(duration.min, Math.min(duration.max, Math.round(seconds))));
    return seconds <= 5 ? "5" : "10";
}

// 该版本 + 当前模式下是否支持音频开关
export function klingAudioAvailable(version: string, mode: KlingMode) {
    const { audio } = klingCapability(version);
    if (audio === "all") return true;
    if (audio === "pro") return mode === "pro";
    return false;
}

// 该版本 + 当前模式 + 音频开启时是否支持音色开关
export function klingVoiceAvailable(version: string, mode: KlingMode, audioOn: boolean) {
    return klingCapability(version).voice && mode === "pro" && audioOn;
}

export function klingHasModeSelector(version: string) {
    return klingCapability(version).modes.length > 1;
}
