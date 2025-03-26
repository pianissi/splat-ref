import { ImageSerial } from '@/app/moodboard/[moodboardId]/types';
import { openDB, deleteDB, wrap, unwrap, DBSchema, IDBPDatabase } from 'idb';

export interface MoodboardMini {
  moodboardId: number,
  moodboardName: string,
  thumbnail?: ImageSerial,
  thumbnailUrl?: string,
}

export interface MoodboardObject {
  moodboardId?: number,
  moodboardName: string,
  moodboardData: string,
  ownerId?: number;
  thumbnail?: ImageSerial,
}

interface MoodboardDB extends DBSchema {
  "moodboards": {
    key: string;
    value: MoodboardObject;
  };
}

let db : IDBPDatabase<MoodboardDB> | null;

const DB_NAME = "moodboardStore"

export async function addMoodboard(moodboard: MoodboardObject) {
  if (db === null) {
    return null;
  }

  const moodboardObject = {
    moodboardName: moodboard.moodboardName,
    moodboardData: moodboard.moodboardData,
    ownerId: -1,
    thumbnail: moodboard.thumbnail
  }

  return await db.add("moodboards", moodboardObject);
}

export async function getMoodboard(moodboardId: number) {
  if (db === null) {
    return null;
  }
  return await db.get("moodboards", IDBKeyRange.only(moodboardId));
}

export async function getAllMoodboards() {
  if (db === null) {
    return null;
  }
  return await db.getAll("moodboards");
}

export async function updateMoodboard(moodboard: MoodboardObject) {
  if (db === null) {
    return null;
  }
  const moodboardObject : MoodboardObject = {
    moodboardId: moodboard.moodboardId,
    moodboardName: moodboard.moodboardName,
    moodboardData: moodboard.moodboardData,
    ownerId: -1,
    thumbnail: moodboard.thumbnail
  };

  return await db.put("moodboards", moodboardObject);
}

export async function deleteMoodboard(moodboardId: IDBKeyRange) {
  if (db === null) {
    return null;
  }
  return await db.delete("moodboards", moodboardId);
}

export async function clearDb() {
  await deleteDB(DB_NAME);
}

export async function initDb() {
  db = await openDB<MoodboardDB>(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore("moodboards", {keyPath: "moodboardId", autoIncrement: true});
    }
  });
}
