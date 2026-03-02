import type { Config } from "tailwindcss";

const config = {
    darkMode: "class",
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        extend: {
            fontFamily: {
                sans: ["var(--font-dm-sans)", "sans-serif"],
                display: ["var(--font-syne)", "sans-serif"],
                mono: ["var(--font-berkeley-mono)", "monospace"],
            },
            colors: {
                border: "var(--border-default)",
                input: "var(--border-default)",
                ring: "var(--electric)",
                background: "var(--bg-void)",
                foreground: "var(--text-primary)",
                surface: "var(--bg-surface)",
                elevated: "var(--bg-elevated)",
                overlay: "var(--bg-overlay)",
                "border-dim": "var(--border-dim)",
                "border-bright": "var(--border-bright)",
                electric: {
                    DEFAULT: "var(--electric)",
                    dim: "var(--electric-dim)",
                },
                positive: {
                    DEFAULT: "var(--positive)",
                    dim: "var(--positive-dim)",
                },
                warning: {
                    DEFAULT: "var(--warning)",
                    dim: "var(--warning-dim)",
                },
                danger: {
                    DEFAULT: "var(--danger)",
                    dim: "var(--danger-dim)",
                },
                info: {
                    DEFAULT: "var(--info)",
                    dim: "var(--info-dim)",
                },
                text: {
                    primary: "var(--text-primary)",
                    secondary: "var(--text-secondary)",
                    muted: "var(--text-muted)",
                    data: "var(--text-data)",
                },
                status: {
                    active: "var(--status-active)",
                    paused: "var(--status-paused)",
                    escalated: "var(--status-escalated)",
                    closed: "var(--status-closed)",
                    expired: "var(--status-expired)",
                    cancelled: "var(--status-cancelled)",
                },
            },
            keyframes: {
                "pulse-highlight": {
                    "0%": { background: "var(--electric-dim)" },
                    "100%": { background: "transparent" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-400px 0" },
                    "100%": { backgroundPosition: "400px 0" },
                },
                "fade-up": {
                    "0%": { opacity: "0", transform: "translateY(12px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                shake: {
                    "0%, 100%": { transform: "translateX(0)" },
                    "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-2px)" },
                    "20%, 40%, 60%, 80%": { transform: "translateX(2px)" },
                },
            },
            animation: {
                "pulse-highlight": "pulse-highlight 1s ease-out",
                shimmer: "shimmer 1.5s infinite",
                "fade-up": "fade-up 0.4s ease-out forwards",
                shake: "shake 0.5s ease-in-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
} satisfies Config;

export default config;
