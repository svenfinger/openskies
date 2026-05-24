export type ColorBucket = 'orange' | 'blue' | 'gray';

export interface Photo {
  id: string;
  width: number;
  height: number;
  aspect: number;
  colorBucket: ColorBucket;
}
