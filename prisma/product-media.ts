// 产品真实媒体映射（slug → 封面/banner/截图）。图片来自 Unsplash 直链（已验证可用），
// 科技/抽象/AI 主题。组件里渐变色块作兜底，加载失败不露白。
// seed.ts 与 apply-media.ts 共用本表。

const U = (id: string, w: number) => `https://images.unsplash.com/${id}?w=${w}&q=70&auto=format&fit=crop`;

const P = {
  code: "photo-1517694712202-14dd9538aa97",
  matrix: "photo-1526374965328-7f61d4dc18c5",
  render: "photo-1635070041078-e363dbe005cb",
  techblue: "photo-1633356122544-f134324a6cee",
  circuit: "photo-1518770660439-4636190af475",
  laptopcode: "photo-1488590528505-98d2b5aba04b",
  screens: "photo-1526498460520-4c246339dccb",
  earth: "photo-1451187580459-43490279c0fa",
  gradient: "photo-1620641788421-7a1c342ea42e",
  blueabs: "photo-1639762681485-074b7f938ba0",
  aiabs: "photo-1677442136019-21780ecad995",
  abstract2: "photo-1534723452862-4c874018d66d",
  lab: "photo-1581090464777-f3220bbe1b8b",
  green: "photo-1550751827-4bd374c3f58b",
  data: "photo-1591453089816-0fbb971b454c",
  codescreen: "photo-1542831371-29b0f74f9713",
  office: "photo-1497366216548-37526070297c",
  desk: "photo-1504384308090-c894fdcc538d",
  robot: "photo-1485827404703-89b55fcc595e",
  laptopcolor: "photo-1531297484001-80022131f5a1",
  workspace: "photo-1517245386807-bb43f82c33c4",
};

export interface ProductMedia {
  capsuleUrl: string;
  bannerUrl: string;
  screenshotUrls: string[];
}

function m(primary: string, ...shots: string[]): ProductMedia {
  return {
    bannerUrl: U(primary, 1600),
    capsuleUrl: U(primary, 800),
    screenshotUrls: shots.map((s) => U(s, 1280)),
  };
}

export const PRODUCT_MEDIA: Record<string, ProductMedia> = {
  "multillm-chat": m(P.code, P.matrix, P.codescreen, P.laptopcode),
  roundtable: m(P.office, P.desk, P.workspace, P.screens),
  "sdk-playground": m(P.codescreen, P.code, P.laptopcode, P.workspace),
  "galaxy-reader": m(P.earth, P.render, P.gradient, P.blueabs),
  tokenomics: m(P.techblue, P.circuit, P.data, P.lab),
  ppt: m(P.desk, P.office, P.workspace, P.screens),
  "claude-fable-5": m(P.aiabs, P.render, P.gradient, P.blueabs),
  "aurora-vision": m(P.blueabs, P.aiabs, P.render, P.abstract2),
  "nebula-coder": m(P.laptopcode, P.code, P.codescreen, P.matrix),
  "minute-master": m(P.office, P.desk, P.workspace, P.screens),
  "paper-pilot": m(P.lab, P.data, P.earth, P.circuit),
  "deep-research": m(P.data, P.lab, P.earth, P.techblue),
  "ppt-forge": m(P.desk, P.workspace, P.office, P.screens),
  "prompt-craft-101": m(P.workspace, P.desk, P.office, P.laptopcolor),
  "sdk-in-30": m(P.laptopcolor, P.code, P.laptopcode, P.codescreen),
  "agent-arena-finals": m(P.robot, P.aiabs, P.render, P.green),
};
