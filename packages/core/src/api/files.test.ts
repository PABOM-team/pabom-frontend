import { afterEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
vi.mock("./client", () => ({ api: { post: (...args: unknown[]) => post(...args) } }));

const { filesApi } = await import("./endpoints");

/** React Native 의 FormData 처럼 append·getAll·getParts 만 있고 set 은 없는 구현 */
class NativeLikeFormData {
  parts: [string, unknown][] = [];
  append(key: string, value: unknown) {
    this.parts.push([key, value]);
  }
  getAll(key: string) {
    return this.parts.filter(([k]) => k === key).map(([, v]) => v);
  }
}

describe("filesApi.upload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    post.mockReset();
  });

  it("set 이 없는 앱(React Native) FormData 로도 사진을 올린다 (QA T08-10)", async () => {
    vi.stubGlobal("FormData", NativeLikeFormData);
    post.mockReturnValue({
      json: (schema: { parse: (v: unknown) => unknown }) =>
        Promise.resolve(
          schema.parse({
            resultType: "SUCCESS",
            success: { data: { id: 7, url: "https://x/7.jpg" } },
          }),
        ),
    });
    const file = {
      uri: "file:///photo.jpg",
      name: "photo.jpg",
      type: "image/jpeg",
    } as unknown as Blob;

    await expect(filesApi.upload(file, "record")).resolves.toEqual({
      id: "7",
      url: "https://x/7.jpg",
    });

    const [, options] = post.mock.calls[0] as [string, { body: NativeLikeFormData }];
    expect(options.body.getAll("file")).toEqual([file]);
    expect(options.body.getAll("purpose")).toEqual(["RECORD_PHOTO"]);
  });
});
