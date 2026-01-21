/**
 * Content Moderation Service
 * MAXIMUM STRICTNESS: All abuse and sexual words blocked in ALL rooms
 */

export enum ModerationLevel {
  STRICT = 'strict',      // All rooms now use this level
  MODERATE = 'moderate',  // (kept for compatibility but all use strict)
  RELAXED = 'relaxed',    // (kept for compatibility but all use strict)
}

// 🔴 ABUSE WORDS - BLOCKED IN ALL ROOMS
const ABUSE_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'hell',
  'idiot', 'stupid', 'dumb', 'retard', 'moron', 'loser',
  'cunt', 'dick', 'cock', 'pussy', 'whore', 'slut',
  // Add Hindi/local abusive words
  'madarchod', 'bhenchod', 'chutiya', 'gandu', 'chod', 'randi',
  'saala', 'kutte', 'kutta', 'harami', 'kamina',
];

// 🔴 SEXUAL WORDS - BLOCKED IN ALL ROOMS
const SEXUAL_WORDS = [
  'sex', 'porn', 'nude', 'naked', 'boobs', 'tits', 'ass',
  'penis', 'vagina', 'masturbat', 'orgasm', 'horny',
  'rape', 'molest', 'seduce', 'erotic', 'xxx',
  // Add Hindi/local sexual words
  'chuchi', 'gand', 'lund', 'chut', 'boob', 'sexi',
];

// Room-based strictness mapping
const ROOM_MODERATION_LEVELS: Record<string, ModerationLevel> = {
  'confession': ModerationLevel.STRICT,
  'hostel': ModerationLevel.RELAXED,
  'matchday': ModerationLevel.RELAXED,
  'city': ModerationLevel.MODERATE,
  'exam': ModerationLevel.MODERATE,
  'latenight': ModerationLevel.MODERATE,
  'morning': ModerationLevel.MODERATE,
};

interface ModerationResult {
  isAllowed: boolean;
  reason?: string;
  detectedWords?: string[];
}

export class ContentModerationService {
  /**
   * Normalize text for checking
   * - Convert to lowercase
   * - Remove extra spaces
   * - Remove repeated letters (e.g., "shiiiiit" → "shit")
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .replace(/(.)\1{2,}/g, '$1$1'); // Repeated letters to max 2 (e.g., "shiiit" → "shiit")
  }

  /**
   * Check if text contains banned words
   * ALL WORDS BLOCKED IN ALL ROOMS - Maximum strictness
   */
  private containsBannedWords(
    normalizedText: string,
    level: ModerationLevel,
  ): { found: boolean; words: string[] } {
    const detectedWords: string[] = [];
    const words = normalizedText.split(/\s+/);
    
    // 🔴 STRICT POLICY: Block ALL abuse + sexual words in ALL rooms
    const allBannedWords = [...ABUSE_WORDS, ...SEXUAL_WORDS];

    // Check each word
    for (const word of words) {
      for (const banned of allBannedWords) {
        // Check if word contains or is the banned word
        if (word.includes(banned) || banned.includes(word) && word.length > 3) {
          detectedWords.push(banned);
          break;
        }
      }
    }

    // Also check the full text for multi-word phrases
    for (const banned of allBannedWords) {
      if (normalizedText.includes(banned) && !detectedWords.includes(banned)) {
        detectedWords.push(banned);
      }
    }

    return {
      found: detectedWords.length > 0,
      words: detectedWords,
    };
  }

  /**
   * Get moderation level for a room type
   */
  private getModerationLevel(roomType?: string): ModerationLevel {
    if (!roomType) return ModerationLevel.MODERATE;
    
    const level = ROOM_MODERATION_LEVELS[roomType.toLowerCase()];
    return level || ModerationLevel.MODERATE;
  }

  /**
   * Main moderation check
   * Returns whether message is allowed and why
   */
  public checkMessage(
    message: string,
    roomType?: string,
  ): ModerationResult {
    // Normalize the message
    const normalized = this.normalizeText(message);
    
    // Get room's moderation level
    const level = this.getModerationLevel(roomType);
    
    // Check for banned words
    const { found, words } = this.containsBannedWords(normalized, level);
    
    if (found) {
      return {
        isAllowed: false,
        reason: 'Message contains inappropriate content',
        detectedWords: words,
      };
    }
    
    return {
      isAllowed: true,
    };
  }

  /**
   * Get user-friendly warning message
   */
  public getWarningMessage(level: ModerationLevel): string {
    // All rooms now use same strict message
    return 'Message not sent. Please keep it respectful and appropriate.';
  }
}

// Export singleton instance
export const contentModeration = new ContentModerationService();
