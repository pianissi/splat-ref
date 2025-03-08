
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
  images: ImageSerial[];
}

export interface Mouse {
  position: Vector2;
  delta: Vector2;
  isDown: boolean;
}