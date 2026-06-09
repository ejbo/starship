export interface ChatMessage {
  from: "me" | "friend";
  body: string;
  time: string;
}

/** 各好友的初始聊天记录（Phase 0.5 假数据，Phase 2 接真实消息） */
export const initialChats: Record<string, ChatMessage[]> = {
  linyuan: [
    { from: "friend", body: "你上次说的那个对比技巧，在 MultiLLM Chat 里怎么设置来着？", time: "昨天 21:34" },
    { from: "me", body: "新建会话时选「双栏」，左边固定 Claude 右边随便换", time: "昨天 21:40" },
    { from: "friend", body: "好使，今天写方案省了一半时间", time: "10:12" },
  ],
  bluewhale: [
    { from: "friend", body: "周五圆桌我把新驯的纪要 Agent 带上", time: "09:02" },
    { from: "friend", body: "它现在能区分结论和待办了，进步很大", time: "09:03" },
  ],
  azhi: [
    { from: "me", body: "读书会纪要发我一份？", time: "周一 14:20" },
    { from: "friend", body: "在圆桌的归档里，搜「盲视」就有", time: "周一 14:33" },
  ],
  oldcat: [{ from: "friend", body: "Nebula Coder 新版本支持 Rust 了，你不是一直在等这个", time: "上周" }],
  xiaoman: [{ from: "friend", body: "教程第 7 关卡了我一晚上，有提示吗 QAQ", time: "11:45" }],
  shanyue: [
    { from: "friend", body: "看下你的用量看板，你那个文献 Agent 又在夜跑了", time: "08:15" },
    { from: "me", body: "已经设了日限额，让它跑（", time: "08:30" },
  ],
};

/** 模拟对方回复（仅演示用） */
export const cannedReplies = [
  "收到～",
  "好，回头细聊",
  "哈哈哈可以",
  "等我忙完这把圆桌的",
  "👍",
];
