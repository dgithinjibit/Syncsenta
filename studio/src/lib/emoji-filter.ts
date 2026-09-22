/**
 * Emoji Filter Utility
 * Removes all Unicode emojis from text to maintain professional, accessible communication
 */

export interface EmojiFilterConfig {
  preserveTextEmoticons?: boolean; // e.g., :), :(
  logRemovals?: boolean;
}

/**
 * Comprehensive emoji regex pattern covering all Unicode emoji ranges
 * Includes: emoticons, symbols, pictographs, transport, flags, etc.
 */
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F200}-\u{1F2FF}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{2B55}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23EC}]|[\u{23F0}]|[\u{23F3}]|[\u{25FD}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2705}]|[\u{270A}-\u{270B}]|[\u{2728}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2795}-\u{2797}]|[\u{27B0}]|[\u{27BF}]|[\u{2B1B}-\u{2B1C}]|[\u{1F004}]|[\u{1F0CF}]|[\u{1F18E}]|[\u{1F191}-\u{1F19A}]|[\u{1F201}]|[\u{1F21A}]|[\u{1F22F}]|[\u{1F232}-\u{1F236}]|[\u{1F238}-\u{1F23A}]|[\u{1F250}-\u{1F251}]|[\u{1F300}-\u{1F320}]|[\u{1F32D}-\u{1F335}]|[\u{1F337}-\u{1F37C}]|[\u{1F37E}-\u{1F393}]|[\u{1F3A0}-\u{1F3CA}]|[\u{1F3CF}-\u{1F3D3}]|[\u{1F3E0}-\u{1F3F0}]|[\u{1F3F4}]|[\u{1F3F8}-\u{1F43E}]|[\u{1F440}]|[\u{1F442}-\u{1F4FC}]|[\u{1F4FF}-\u{1F53D}]|[\u{1F54B}-\u{1F54E}]|[\u{1F550}-\u{1F567}]|[\u{1F57A}]|[\u{1F595}-\u{1F596}]|[\u{1F5A4}]|[\u{1F5FB}-\u{1F64F}]|[\u{1F680}-\u{1F6C5}]|[\u{1F6CC}]|[\u{1F6D0}-\u{1F6D2}]|[\u{1F6D5}-\u{1F6D7}]|[\u{1F6EB}-\u{1F6EC}]|[\u{1F6F4}-\u{1F6FC}]|[\u{1F7E0}-\u{1F7EB}]|[\u{1F90C}-\u{1F93A}]|[\u{1F93C}-\u{1F945}]|[\u{1F947}-\u{1F978}]|[\u{1F97A}-\u{1F9CB}]|[\u{1F9CD}-\u{1F9FF}]|[\u{1FA70}-\u{1FA74}]|[\u{1FA78}-\u{1FA7A}]|[\u{1FA80}-\u{1FA86}]|[\u{1FA90}-\u{1FAA8}]|[\u{1FAB0}-\u{1FAB6}]|[\u{1FAC0}-\u{1FAC2}]|[\u{1FAD0}-\u{1FAD6}]/gu;

/**
 * Text emoticons that might be preserved
 */
const TEXT_EMOTICONS = [':)', ':(', ':D', ';)', ':P', ':/', ':|', 'XD', '^_^', '-_-', 'o_o'];

export class EmojiFilter {
  /**
   * Remove all Unicode emojis from text
   * @param text - Input text with potential emojis
   * @param config - Optional configuration
   * @returns Text with emojis removed
   */
  static strip(text: string, config?: EmojiFilterConfig): string {
    if (!text) return text;

    try {
      // Remove Unicode emojis
      let cleaned = text.replace(EMOJI_REGEX, '');

      // Clean up multiple spaces left by emoji removal
      cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

      // Log removals if configured
      if (config?.logRemovals && this.containsEmojis(text)) {
        const removed = this.extractEmojis(text);
        console.log(`[EmojiFilter] Removed ${removed.length} emoji(s):`, removed);
      }

      // If result is empty after stripping, return original
      if (!cleaned || cleaned.length === 0) {
        console.warn('[EmojiFilter] Stripping produced empty string, returning original');
        return text;
      }

      return cleaned;
    } catch (error) {
      console.error('[EmojiFilter] Error stripping emojis:', error);
      return text; // Return original on error
    }
  }

  /**
   * Check if text contains emojis
   * @param text - Text to check
   * @returns True if emojis are present
   */
  static containsEmojis(text: string): boolean {
    if (!text) return false;
    return EMOJI_REGEX.test(text);
  }

  /**
   * Extract all emojis from text
   * @param text - Text to extract from
   * @returns Array of emoji characters found
   */
  static extractEmojis(text: string): string[] {
    if (!text) return [];
    const matches = text.match(EMOJI_REGEX);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Strip emojis from an object's string fields recursively
   * @param obj - Object to clean
   * @returns Cleaned object
   */
  static stripFromObject<T extends Record<string, any>>(obj: T, config?: EmojiFilterConfig): T {
    if (!obj || typeof obj !== 'object') return obj;

    const cleaned = { ...obj };

    for (const key in cleaned) {
      const value = cleaned[key];

      if (typeof value === 'string') {
        cleaned[key] = this.strip(value, config) as any;
      } else if (typeof value === 'object' && value !== null) {
        cleaned[key] = this.stripFromObject(value, config);
      }
    }

    return cleaned;
  }

  /**
   * Strip emojis from array of strings
   * @param arr - Array of strings
   * @returns Cleaned array
   */
  static stripFromArray(arr: string[], config?: EmojiFilterConfig): string[] {
    if (!Array.isArray(arr)) return arr;
    return arr.map(item => this.strip(item, config));
  }
}
