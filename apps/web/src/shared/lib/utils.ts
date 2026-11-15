import { createCn } from "cn/config";

/** 디자인 시스템 타이포 토큰(text-title-* · text-body-*)을 글자 크기로 알아보게 한 cn */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "title-xl",
            "title-lg",
            "title-md",
            "title-sm",
            "title-xs",
            "body-xl",
            "body-lg",
            "body-md",
            "body-sm",
          ],
        },
      ],
    },
  },
});
