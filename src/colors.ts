function colors3Size(tileNumber: number): string {
  if ([1, 2, 3].includes(tileNumber)) {
    return '#ff6767';
  } else if ([4, 7].includes(tileNumber)) {
    return '#fff054';
  } else if ([5, 6].includes(tileNumber)) {
    return '#7eff64';
  } else if ([8].includes(tileNumber)) {
    return '#89dcff';
  }
  return '#ffffff';
}
function colors4Size(tileNumber: number): string {
  if ([1, 2, 3, 4].includes(tileNumber)) {
    return '#ff6767';
  } else if ([5, 9, 13].includes(tileNumber)) {
    return '#fff054';
  } else if ([6, 7, 8].includes(tileNumber)) {
    return '#7eff64';
  } else if ([10, 14].includes(tileNumber)) {
    return '#7effde';
  } else if ([11, 12].includes(tileNumber)) {
    return '#8eb3fe';
  } else if ([15].includes(tileNumber)) {
    return '#cd88fe';
  }
  return '#ffffff';
}
function colors5Size(tileNumber: number): string {
  if ([1, 2, 3, 4, 5].includes(tileNumber)) {
    return '#ff6767';
  } else if ([6, 11, 16, 21].includes(tileNumber)) {
    return '#ffc74c';
  } else if ([7, 8, 9, 10].includes(tileNumber)) {
    return '#fff054';
  } else if ([12, 17, 22].includes(tileNumber)) {
    return '#7eff64';
  } else if ([13, 14, 15].includes(tileNumber)) {
    return '#7effde';
  } else if ([18, 23].includes(tileNumber)) {
    return '#84c8ff';
  } else if ([19, 20].includes(tileNumber)) {
    return '#9b95ff';
  } else if ([24].includes(tileNumber)) {
    return '#cd88fe';
  }
  return '#ffffff';
}
function colors6Size(tileNumber: number): string {
  if ([1, 2, 3, 4, 5, 6].includes(tileNumber)) {
    return '#ff6767';
  } else if ([7, 13, 19, 25, 31].includes(tileNumber)) {
    return '#ffb355';
  } else if ([8, 9, 10, 11, 12].includes(tileNumber)) {
    return '#eeff53';
  } else if ([14, 20, 26, 32].includes(tileNumber)) {
    return '#94ff5b';
  } else if ([15, 16, 17, 18].includes(tileNumber)) {
    return '#69ff87';
  } else if ([21, 27, 33].includes(tileNumber)) {
    return '#77ffdd';
  } else if ([22, 23, 24].includes(tileNumber)) {
    return '#83dadd';
  } else if ([28, 34].includes(tileNumber)) {
    return '#8b9cff';
  } else if ([29, 30].includes(tileNumber)) {
    return '#bb8dff';
  } else if ([35].includes(tileNumber)) {
    return '#f989ff';
  }
  return '#ffffff';
}
function colors7Size(tileNumber: number): string {
  if ([1, 2, 3, 4, 5, 6, 7].includes(tileNumber)) {
    return '#ff6767';
  } else if ([8, 15, 22, 29, 36, 43].includes(tileNumber)) {
    return '#ffa357';
  } else if ([9, 10, 11, 12, 13, 14].includes(tileNumber)) {
    return '#fff153';
  } else if ([16, 23, 30, 37, 44].includes(tileNumber)) {
    return '#c1ff57';
  } else if ([17, 18, 19, 20, 21].includes(tileNumber)) {
    return '#7bff61';
  } else if ([24, 31, 38, 45].includes(tileNumber)) {
    return '#6bff95';
  } else if ([25, 26, 27, 28].includes(tileNumber)) {
    return '#79ffde';
  } else if ([32, 39, 46].includes(tileNumber)) {
    return '#83e6ff';
  } else if ([33, 34, 35].includes(tileNumber)) {
    return '#8bb2ff';
  } else if ([40, 47].includes(tileNumber)) {
    return '#9a8dff';
  } else if ([41, 42].includes(tileNumber)) {
    return '#cf8dff';
  } else if ([48].includes(tileNumber)) {
    return '#ff85fb';
  }
  return '#ffffff';
}
function colors8Size(tileNumber: number): string {
  if ([1, 2, 3, 4, 5, 6, 7, 8].includes(tileNumber)) {
    return '#ff6767';
  } else if ([9, 17, 25, 33, 41, 49, 57].includes(tileNumber)) {
    return '#ff9959';
  } else if ([10, 11, 12, 13, 14, 15, 16].includes(tileNumber)) {
    return '#ffda53';
  } else if ([18, 26, 34, 42, 50, 58].includes(tileNumber)) {
    return '#e3ff55';
  } else if ([19, 20, 21, 22, 23, 24].includes(tileNumber)) {
    return '#a2ff5b';
  } else if ([27, 35, 43, 51, 59].includes(tileNumber)) {
    return '#6bff63';
  } else if ([28, 29, 30, 31, 32].includes(tileNumber)) {
    return '#6fffa1';
  } else if ([36, 44, 52, 60].includes(tileNumber)) {
    return '#79ffde';
  } else if ([37, 38, 39, 40].includes(tileNumber)) {
    return '#83eeff';
  } else if ([45, 53, 61].includes(tileNumber)) {
    return '#89c0ff';
  } else if ([46, 47, 48].includes(tileNumber)) {
    return '#8d97ff';
  } else if ([54, 62].includes(tileNumber)) {
    return '#b18dff';
  } else if ([55, 56].includes(tileNumber)) {
    return '#dc8bff';
  } else if ([63].includes(tileNumber)) {
    return '#ff83f3';
  }
  return '#ffffff';
}

export function getTileColor(puzzleSize: number, tileNumber: number): string {
  switch (puzzleSize) {
    case 3:
      return colors3Size(tileNumber);
    case 4:
      return colors4Size(tileNumber);
    case 5:
      return colors5Size(tileNumber);
    case 6:
      return colors6Size(tileNumber);
    case 7:
      return colors7Size(tileNumber);
    case 8:
      return colors8Size(tileNumber);
    default:
      return 'var(--square-bg-color)';
  }
}
