export enum RoomType {
  CONFESSION = 'confession',
  CITY = 'city',
  HOSTEL = 'hostel',
  EXAM = 'exam',
  LATE_NIGHT = 'latenight',
  MORNING = 'morning',
  MATCH_DAY = 'matchday',
  CORPORATE = 'corporate',
}

export interface RoomTypeConfig {
  type: RoomType;
  nameTemplate: string; // Can include {{city}} placeholder
  promptTemplate: string;
  expiryHours: number;
  activeHourStart?: number; // 0-23, undefined means always active
  activeHourEnd?: number; // 0-23, undefined means always active
  isTimeSensitive: boolean;
  radiusMeters: number; // Custom radius for each room type
}

export const ROOM_TYPE_CONFIGS: Record<RoomType, RoomTypeConfig> = {
  [RoomType.CONFESSION]: {
    type: RoomType.CONFESSION,
    nameTemplate: 'Confession Room',
    promptTemplate: 'Say something you never said out loud.',
    expiryHours: 24,
    activeHourStart: 16, // 4 PM
    activeHourEnd: 21, // 9 PM
    isTimeSensitive: true,
    radiusMeters: 5000, // 5km radius
  },
  [RoomType.CITY]: {
    type: RoomType.CITY,
    nameTemplate: 'City Talk: {{city}}',
    promptTemplate: 'What\'s on your mind about {{city}}? Share your thoughts, complaints, or pride about your city.',
    expiryHours: 24,
    activeHourStart: 9, // 9 AM
    activeHourEnd: 16, // 4 PM
    isTimeSensitive: true,
    radiusMeters: 20000, // 20km radius
  },
  [RoomType.HOSTEL]: {
    type: RoomType.HOSTEL,
    nameTemplate: 'Campus Life',
    promptTemplate: 'College life chaos! Share your hostel stories, humor, and madness.',
    expiryHours: 24,
    isTimeSensitive: false,
    radiusMeters: 1000, // 1km radius
  },
  [RoomType.EXAM]: {
    type: RoomType.EXAM,
    nameTemplate: 'Exam Hub',
    promptTemplate: 'Exam anxiety? Result day chaos? Post-exam reactions? Let it all out here.',
    expiryHours: 12,
    isTimeSensitive: false,
    radiusMeters: 5000, // 5km radius
  },
  [RoomType.LATE_NIGHT]: {
    type: RoomType.LATE_NIGHT,
    nameTemplate: 'After Hours',
    promptTemplate: 'Deep talks, loneliness, overthinking... It\'s okay. You\'re not alone.',
    expiryHours: 6,
    activeHourStart: 21, // 9 PM
    activeHourEnd: 3, // 3 AM (next day)
    isTimeSensitive: true,
    radiusMeters: 5000, // 5km radius
  },
  [RoomType.MORNING]: {
    type: RoomType.MORNING,
    nameTemplate: 'Morning Pulse',
    promptTemplate: 'Morning anxiety? Fresh thoughts? Share what\'s on your mind as you start your day.',
    expiryHours: 6,
    activeHourStart: 5, // 5 AM
    activeHourEnd: 9, // 9 AM
    isTimeSensitive: true,
    radiusMeters: 5000, // 5km radius
  },
  [RoomType.MATCH_DAY]: {
    type: RoomType.MATCH_DAY,
    nameTemplate: 'Live Sports Arena',
    promptTemplate: 'LIVE reactions during the match! Celebrate, rage, react!',
    expiryHours: 8,
    activeHourStart: 20, // 8 PM
    activeHourEnd: 0, // 12 AM (midnight)
    isTimeSensitive: true,
    radiusMeters: 5000, // 5km radius
  },
  [RoomType.CORPORATE]: {
    type: RoomType.CORPORATE,
    nameTemplate: 'Work & Career',
    promptTemplate: 'Office politics, work stress, career wins, or Monday blues? Share your corporate life here.',
    expiryHours: 24,
    activeHourStart: 12, // 12 PM
    activeHourEnd: 17, // 5 PM
    isTimeSensitive: true,
    radiusMeters: 5000, // 5km radius
  },
};

export function getRoomTypeConfig(type: RoomType): RoomTypeConfig {
  return ROOM_TYPE_CONFIGS[type];
}

export function isRoomActiveNow(config: RoomTypeConfig, userHour?: number): boolean {
  if (!config.isTimeSensitive) {
    return true;
  }

  // Use provided userHour if available, otherwise fall back to server time
  const currentHour = userHour !== undefined ? userHour : new Date().getHours();

  const start = config.activeHourStart!;
  const end = config.activeHourEnd!;

  // Handle time ranges that cross midnight
  if (start > end) {
    return currentHour >= start || currentHour < end;
  } else {
    return currentHour >= start && currentHour < end;
  }
}

export function formatRoomName(config: RoomTypeConfig, cityName?: string): string {
  let name = config.nameTemplate;
  if (cityName && config.type === RoomType.CITY) {
    name = name.replace('{{city}}', cityName);
  }
  return name;
}

export function formatRoomPrompt(config: RoomTypeConfig, cityName?: string): string {
  let prompt = config.promptTemplate;
  if (cityName && config.type === RoomType.CITY) {
    prompt = prompt.replace(/{{city}}/g, cityName);
  }
  return prompt;
}
