export interface MoodboardMini {
  moodboardId: number,
  moodboardName: string,
  thumbnail?: string,
}

export interface Moodboard {
  moodboardId: number,
  moodboardName: string,
  moodboardData: object,
  ownerId?: number;
  thumbnail?: string,
}

let db : IDBDatabase | null;

export function addMoodboard(moodboard: Moodboard) {
  if (db === null) {
    return null;
  }
  const transaction = db.transaction("moodboard");
  const moodboards = transaction.objectStore("moodboards");

  const moodboardObject = {
    moodboardId: -1,
    moodboardName: moodboard.moodboardName,
    moodboardData: moodboard.moodboardData,
    ownerId: -1,
    thumbnail: moodboard.thumbnail
  }

  const request = moodboards.add(moodboardObject);

  return new Promise(function(resolve, reject) {
    request.onsuccess = function() {
      resolve(request.result);
    }
    request.onerror = function(event) {
      db = null;
      reject();
    };
  });
}

export function getMoodboard(moodboardId: number) {
  if (db === null) {
    return null;
  }
  const transaction = db.transaction("moodboard");
  const moodboards = transaction.objectStore("moodboards");

  const request = moodboards.get(moodboardId);

  return new Promise(function(resolve, reject) {
    request.onsuccess = function() {
      resolve(request.result);
    }
    request.onerror = function(event) {
      db = null;
      reject();
    };
  });
}

export function getAllMoodboards() {
  if (db === null) {
    return null;
  }
  const transaction = db.transaction("moodboard");
  const moodboards = transaction.objectStore("moodboards");

  const request = moodboards.getAll();

  return new Promise(function(resolve, reject) {
    request.onsuccess = function() {
      resolve(request.result);
    }
    request.onerror = function(event) {
      db = null;
      reject();
    };
  });
}

export function updateMoodboard(moodboardId: string, moodboard: Moodboard) {
  if (db === null) {
    return null;
  }
  const transaction = db.transaction("moodboard");
  const moodboards = transaction.objectStore("moodboards");

  const moodboardObject = {
    moodboardId: moodboardId,
    moodboardName: moodboard.moodboardName,
    moodboardData: moodboard.moodboardData,
    ownerId: -1,
    thumbnail: moodboard.thumbnail
  }

  const request = moodboards.put(moodboardObject);

  return new Promise(function(resolve, reject) {
    request.onsuccess = function() {
      resolve(request.result);
    }
    request.onerror = function(event) {
      db = null;
      reject();
    };
  });
}

export function deleteMoodboard(moodboardId: string) {
  if (db === null) {
    return null;
  }
  const transaction = db.transaction("moodboard");
  const moodboards = transaction.objectStore("moodboards");

  const request = moodboards.delete(moodboardId);

  return new Promise(function(resolve, reject) {
    request.onsuccess = function() {
      resolve(request.result);
    }
    request.onerror = function(event) {
      db = null;
      reject();
    };
  });
}

export function clearDb() {
  const deleteRequest = indexedDB.deleteDatabase("moodboardStore");
}

export async function initDb() {
  const openRequest = indexedDB.open("moodboardStore", 1);
  
  openRequest.onupgradeneeded = function(event) {
    db = openRequest.result;

    switch(event.oldVersion) {
      case 0:
        db.createObjectStore("moodboards", {keyPath: "moodboardId", autoIncrement: true});
    }
  };
  
  return new Promise(function(resolve, reject) {
    openRequest.onsuccess = function() {
      db = openRequest.result;
      resolve(db);
    }
    openRequest.onerror = function(event) {
      db = null;
      reject();
    };
  });
}
