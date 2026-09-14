import { describe, expect, it } from 'vitest';
import {
  type RecordKind, decodeRecord, encodeRecord, recordCodeWord, recordStorageKey
} from '../recordCodec';

const KINDS: RecordKind[] = ['time', 'moves', 'fmcBlitz'];

describe('recordCodec', () => {
  describe('recordStorageKey', () => {
    // These exact names are what existing installs already hold, so they are a
    // compatibility contract, not an implementation detail.
    it.each([
      { kind: 'time' as const, size: 4, marathon: false, key: 'timeRecord' },
      { kind: 'time' as const, size: 4, marathon: true, key: 'timeMRecord' },
      { kind: 'time' as const, size: 6, marathon: false, key: 'timeRecord6' },
      { kind: 'time' as const, size: 6, marathon: true, key: 'timeMRecord6' },
      { kind: 'moves' as const, size: 4, marathon: false, key: 'movesRecord' },
      { kind: 'moves' as const, size: 4, marathon: true, key: 'movesMRecord' },
      { kind: 'moves' as const, size: 8, marathon: false, key: 'movesRecord8' },
      { kind: 'fmcBlitz' as const, size: 4, marathon: false, key: 'fmcBlitzMovesRecord' },
      { kind: 'fmcBlitz' as const, size: 3, marathon: false, key: 'fmcBlitzMovesRecord3' }
    ])('$kind size $size marathon=$marathon -> $key', ({ kind, size, marathon, key }) => {
      expect(recordStorageKey(kind, size, marathon)).toBe(key);
    });

    it('has no separate marathon key for FMC blitz, which has no marathon variant', () => {
      expect(recordStorageKey('fmcBlitz', 5, true)).toBe(recordStorageKey('fmcBlitz', 5, false));
    });
  });

  describe('recordCodeWord', () => {
    it('gives every kind its own codeword, so one kind cannot decode another', () => {
      const words = KINDS.map(recordCodeWord);
      expect(new Set(words).size).toBe(KINDS.length);
    });
  });

  describe('encode/decode round trip', () => {
    it.each(KINDS)('round-trips both values for %s', (kind) => {
      const encoded = encodeRecord(12345, 678, recordCodeWord(kind));
      expect(decodeRecord(encoded, recordCodeWord(kind)))
        .toEqual({ corrupt: false, best: { record: 12345, adding: 678 } });
    });

    it('zero-pads so a small value survives the fixed-width slices', () => {
      const encoded = encodeRecord(7, 1, 'heh7');
      expect(decodeRecord(encoded, 'heh7')).toEqual({ corrupt: false, best: { record: 7, adding: 1 } });
    });

    it('varies the encoded string run to run but decodes to the same values', () => {
      const a = encodeRecord(500, 60, 'heh7');
      const b = encodeRecord(500, 60, 'heh7');
      // The 4-digit header is random, so collisions are possible but the payload must match.
      expect(decodeRecord(a, 'heh7')).toEqual(decodeRecord(b, 'heh7'));
    });
  });

  describe('decodeRecord', () => {
    it('reads a missing value as "no record yet" rather than corrupt', () => {
      expect(decodeRecord(null, 'heh7')).toEqual({ corrupt: false, best: { record: 0, adding: 0 } });
    });

    it('reports a wrong codeword as corrupt, so the caller can repair it', () => {
      expect(decodeRecord(btoa('1234123456123456XXXX'), 'heh7')).toEqual({ corrupt: true });
    });

    it('rejects a value encoded under a different kind', () => {
      const asMoves = encodeRecord(10, 20, recordCodeWord('moves'));
      expect(decodeRecord(asMoves, recordCodeWord('time'))).toEqual({ corrupt: true });
    });

    it('tolerates the legacy y/h codeword typo but still rejects that payload', () => {
      // 'hey7' passes the lenient y/h-tolerant match against 'heh7' (String.replace only
      // swaps the first 'y'), so it is not corrupt - but its third character is not 'h',
      // so the payload itself is not trusted either.
      expect(decodeRecord(btoa('1234123456123456hey7'), 'heh7'))
        .toEqual({ corrupt: false, best: { record: 0, adding: 0 } });
    });

    it('throws on a value that is not base64, which the store catches as "no record"', () => {
      expect(() => decodeRecord('***not-base64***', 'heh7')).toThrow();
    });
  });
});
