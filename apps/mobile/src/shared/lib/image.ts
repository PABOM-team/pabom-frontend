import { File } from "expo-file-system";
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
 * 올릴 파일을 만든다. 앱의 전역 fetch·FormData 는 Expo 구현(expo/fetch)이라
 * React Native 식 {uri, name, type} 객체를 보내지 못하고 "Unsupported FormDataPart implementation"
 * 으로 요청 전에 실패한다 (QA T08-10). Blob 을 구현한 expo-file-system 의 File 로 넘긴다
 */
export function toUploadFile(uri: string): Blob {
  return new File(uri);
}
