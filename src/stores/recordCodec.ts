import { CORE_NUM } from '@/const';
import { generateRand } from '@/utils';
import { type PersonalBest } from '@/types';

export type RecordKind = 'time' | 'moves' | 'fmcBlitz';

const CODE_WORDS: Record<RecordKind, string> = {
  time: 'heh7',
  moves: 'heh9',
  fmcBlitz: 'heh8'
};

const KEY_STEMS: Record<RecordKind, { standard: string; marathon: string }> = {
  time: { standard: 'timeRecord', marathon: 'timeMRecord' },
  moves: { standard: 'movesRecord', marathon: 'movesMRecord' },
  fmcBlitz: { standard: 'fmcBlitzMovesRecord', marathon: 'fmcBlitzMovesRecord' }
};

export function recordCodeWord(kind: RecordKind): string {
  return CODE_WORDS[kind];
}

// CORE_NUM keys have no size suffix: records are already stored under those names.
export function recordStorageKey(kind: RecordKind, puzzleSize: number, marathonMode: boolean): string {
  const stems = KEY_STEMS[kind];
  const sizePart = puzzleSize === CORE_NUM ? '' : puzzleSize.toString();
  return `${marathonMode ? stems.marathon : stems.standard}${sizePart}`;
}

export function encodeRecord(primary: number, secondary: number, codeWord: string): string {
  const headerPart = generateRand().toString().slice(-4);
  const primaryPart = primary.toString().padStart(6, '0');
  const secondaryPart = secondary.toString().padStart(6, '0');
  return btoa(`${headerPart}${primaryPart}${secondaryPart}${codeWord}`);
}

export type DecodedRecord =
  | { corrupt: true }
  | { corrupt: false; best: PersonalBest };

const NO_RECORD: PersonalBest = { record: 0, adding: 0 };

export function decodeRecord(encoded: string | null, codeWord: string): DecodedRecord {
  if (encoded === null) {
    return { corrupt: false, best: NO_RECORD };
  }
  const decoded = atob(encoded);
  const lastPart = decoded.slice(-4);
  // The y/h comparison tolerates a legacy typo in previously-written codewords.
  if (lastPart !== codeWord && lastPart.replace('y', 'h') !== codeWord.replace('y', 'h')) {
    return { corrupt: true };
  }
  if (lastPart.slice(2, -1) !== 'h') {
    return { corrupt: false, best: NO_RECORD };
  }
  return {
    corrupt: false,
    best: { record: Number(decoded.slice(4, 10)), adding: Number(decoded.slice(10, 16)) }
  };
}
