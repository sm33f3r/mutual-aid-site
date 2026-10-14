/** Site-wide settings. Adding a language: add its code here and an i18n/<code>.json file. */
export const languages = ["en", "ko"] as const;
export type Lang = (typeof languages)[number];

export const defaultLanguage: Lang = "en";

/** Keep false until launch: pages get a noindex tag and robots.txt disallows everything. */
export const indexable = false;

/** The whitepaper route and nav link exist only while this is true. */
export const whitepaperEnabled = false;

/** Empty = no Telegram link is shown. */
export const telegramUrl = "";

/** Absolute site URL, e.g. https://example.org (no trailing slash). Optional. */
export const siteUrl: string | undefined = process.env.SITE_URL || undefined;

/** First path segments that city ids and listing ids must never use. */
export const reservedSegments = ["news", "faq", "log", "submit", "whitepaper", "archive"] as const;
