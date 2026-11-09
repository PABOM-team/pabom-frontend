import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/** 올리기 전에 사진을 줄인다 (FE-C09): 긴 변 1600px · JPEG 품질 0.85. 다시 저장하면서 EXIF 위치 정보도 사라진다 */
export async function resizeImage(
  asset: { uri: string; width: number; height: number },
  maxSide = 1600,
  quality = 0.85,
) {
  const scale = Math.min(1, maxSide / Math.max(asset.width, asset.height));
  const result = await manipulateAsync(
    asset.uri,
    scale < 1
      ? [
          {
            resize: {
              width: Math.round(asset.width * scale),
              height: Math.round(asset.height * scale),
            },
          },
        ]
      : [],
    { compress: quality, format: SaveFormat.JPEG },
  );
  return result.uri;
}

/**
 * React Native fetch 의 FormData 는 {uri, name, type} 꼴 파일을 받는다.
 * 공용 API(filesApi.upload)는 Blob 타입을 요구하므로 모양만 맞춘다
 */
export function toUploadFile(uri: string, name = "photo.jpg") {
  return { uri, name, type: "image/jpeg" } as unknown as Blob;
}
