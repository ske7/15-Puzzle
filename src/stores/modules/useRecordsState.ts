import { ref, computed, type Ref } from 'vue';
import { type PersonalBest } from '@/types';
import { type RecordKind, recordCodeWord, recordStorageKey, encodeRecord, decodeRecord } from '../recordCodec';
import { displayedTime } from '../../utils';

export function useRecordsState(marathonMode: Ref<boolean>, numLines: Ref<number>) {
  const timeRecord = ref(0);
  const movesRecord = ref(0);
  const fmcBlitzMovesRecord = ref(0);
  const timeRecordMoves = ref(0);
  const movesRecordTime = ref(0);
  const newMovesRecord = ref(false);
  const newFMCBlitzMovesRecord = ref(false);
  const newTimeRecord = ref(false);
  const newPlaygroundMovesRecord = ref(false);
  const newPlaygroundTimeRecord = ref(false);

  function storeRecord(kind: RecordKind, primary: number, secondary: number, puzzleSize: number, marathonMode: boolean) {
    localStorage.setItem(
      recordStorageKey(kind, puzzleSize, marathonMode),
      encodeRecord(primary, secondary, recordCodeWord(kind))
    );
  }

  function setTimeRecord(record: number, moves: number, puzzleSize: number,
    marathonMode: boolean, onlySetToStorage = false) {
    if (record === timeRecord.value && moves >= timeRecordMoves.value) {
      return;
    }
    timeRecord.value = record;
    timeRecordMoves.value = moves;
    storeRecord('time', record, moves, puzzleSize, marathonMode);
    if (!onlySetToStorage) {
      newTimeRecord.value = true;
    }
  }

  function setMovesRecord(record: number, time: number, puzzleSize: number,
    marathonMode: boolean, onlySetToStorage = false) {
    if (record === movesRecord.value && time >= movesRecordTime.value) {
      return;
    }
    movesRecord.value = record;
    movesRecordTime.value = time;
    storeRecord('moves', record, time, puzzleSize, marathonMode);
    if (!onlySetToStorage) {
      newMovesRecord.value = true;
    }
  }

  function setFMCBlitzRecord(record: number, time: number, puzzleSize: number, onlySetToStorage = false) {
    if (record === fmcBlitzMovesRecord.value) {
      return;
    }
    fmcBlitzMovesRecord.value = record;
    storeRecord('fmcBlitz', record, time, puzzleSize, false);
    if (!onlySetToStorage) {
      newFMCBlitzMovesRecord.value = true;
    }
  }

  function loadRecordFromLocalStorage(kind: RecordKind, puzzleSize: number, marathonMode: boolean): PersonalBest {
    const key = recordStorageKey(kind, puzzleSize, marathonMode);
    const decoded = decodeRecord(localStorage.getItem(key), recordCodeWord(kind));
    if (!decoded.corrupt) {
      return decoded.best;
    }
    if (kind === 'time') {
      setTimeRecord(0, 0, puzzleSize, marathonMode, true);
    } else if (kind === 'fmcBlitz') {
      setFMCBlitzRecord(0, 0, puzzleSize, true);
    } else {
      setMovesRecord(0, 0, puzzleSize, marathonMode, true);
    }
    return { record: 0, adding: 0 };
  }

  function safeLoadRecord(kind: RecordKind, puzzleSize: number, marathonMode: boolean): PersonalBest {
    try {
      return loadRecordFromLocalStorage(kind, puzzleSize, marathonMode);
    } catch {
      return { record: 0, adding: 0 };
    }
  }

  function loadTimeRecord(marathonMode: boolean, puzzleSize: number): PersonalBest {
    return safeLoadRecord('time', puzzleSize, marathonMode);
  }

  function loadMovesRecord(marathonMode: boolean, puzzleSize: number): PersonalBest {
    return safeLoadRecord('moves', puzzleSize, marathonMode);
  }

  function loadFMCBlitzMovesRecord(puzzleSize: number): PersonalBest {
    return safeLoadRecord('fmcBlitz', puzzleSize, false);
  }

  function setRecords() {
    if (localStorage.getItem('recordVer') === null) {
      if (localStorage.getItem('timeRecord') !== null || localStorage.getItem('timeMRecord') !== null) {
        // fix for previous format (first load and resave standard records, then the same for marathon)
        if (localStorage.getItem('timeRecord') !== null) {
          timeRecord.value = loadTimeRecord(false, numLines.value).record;
          movesRecord.value = loadMovesRecord(false, numLines.value).record;
          timeRecordMoves.value = movesRecord.value;
          movesRecordTime.value = timeRecord.value;
          setTimeRecord(timeRecord.value, movesRecord.value, numLines.value, false, true);
          setMovesRecord(movesRecord.value, timeRecord.value, numLines.value, false, true);
        }
        if (localStorage.getItem('timeMRecord') !== null) {
          timeRecord.value = loadTimeRecord(true, numLines.value).record;
          movesRecord.value = loadMovesRecord(true, numLines.value).record;
          timeRecordMoves.value = movesRecord.value;
          movesRecordTime.value = timeRecord.value;
          setTimeRecord(timeRecord.value, movesRecord.value, numLines.value, true, true);
          setMovesRecord(movesRecord.value, timeRecord.value, numLines.value, true, true);
        }
      }
      localStorage.setItem('recordVer', '1');
    }
    const { record, adding } = loadTimeRecord(marathonMode.value, numLines.value);
    timeRecord.value = record;
    timeRecordMoves.value = adding;
    const { record: recordM, adding: addingM } = loadMovesRecord(marathonMode.value, numLines.value);
    movesRecord.value = recordM;
    movesRecordTime.value = addingM;
    const { record: recordF } = loadFMCBlitzMovesRecord(numLines.value);
    fmcBlitzMovesRecord.value = recordF;
  }

  const timeMRecord = computed((): string => {
    return displayedTime(timeRecord.value);
  });

  return {
    timeRecord,
    movesRecord,
    fmcBlitzMovesRecord,
    timeRecordMoves,
    movesRecordTime,
    newMovesRecord,
    newTimeRecord,
    newFMCBlitzMovesRecord,
    newPlaygroundMovesRecord,
    newPlaygroundTimeRecord,
    storeRecord,
    setTimeRecord,
    setMovesRecord,
    setFMCBlitzRecord,
    loadRecordFromLocalStorage,
    safeLoadRecord,
    loadTimeRecord,
    loadMovesRecord,
    loadFMCBlitzMovesRecord,
    setRecords,
    timeMRecord
  };
}
