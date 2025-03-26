
export interface Vector2 {
  x: number;
  y: number;
}

export interface ImageSerial {
  data: string;
  width: number;
  height: number;
  position: Vector2;
  scale: Vector2;
}

export interface MoodboardSerial {
  images: ImageSerial[],
  id: number,
  name: string,
  ownerId: number,
  thumbnail: ImageSerial,
  cameraPosition: Vector2,
  cameraScale: Vector2,
  zoomLinear: number,
}

export interface Mouse {
  position: Vector2;
  delta: Vector2;
  isDown: boolean;
}

export interface MoodboardData {
  moodboardId: number,
  moodboardName: string,
  ownerId: number,
  thumbnail?: HTMLImageElement | null,
}