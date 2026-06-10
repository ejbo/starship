/*!
 * Starport Platform SDK (guest side)
 * 由平台在沙箱 iframe 中注入的应用方接口。通过 postMessage 与宿主通信。
 * 应用拿不到用户的 API Key —— AI 调用经宿主 Gateway 代理。
 */
(function () {
  var pending = {};
  var seq = 0;

  function call(method, params) {
    return new Promise(function (resolve, reject) {
      var id = "rpc-" + ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      parent.postMessage({ source: "starport-sdk", id: id, method: method, params: params || {} }, "*");
    });
  }

  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || d.source !== "starport-host") return;
    var p = pending[d.id];
    if (!p) return;
    delete pending[d.id];
    if (d.error) p.reject(new Error(d.error));
    else p.resolve(d.result);
  });

  window.starport = {
    /** 与宿主握手，返回当前用户身份 */
    ready: function () {
      return call("ready");
    },
    /** 获取当前登录用户的公开身份 */
    getIdentity: function () {
      return call("identity.get");
    },
    ai: {
      /** 经平台 Gateway 代理的 LLM 调用 */
      chat: function (prompt) {
        return call("ai.chat", { prompt: prompt });
      },
    },
    storage: {
      get: function (key) {
        return call("storage.get", { key: key });
      },
      set: function (key, value) {
        return call("storage.set", { key: key, value: value });
      },
    },
    achievements: {
      /** 解锁成就（与开放 API achievements/unlock 等价） */
      unlock: function (key) {
        return call("achievements.unlock", { key: key });
      },
    },
  };
})();
