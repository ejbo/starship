/**
 * MultiLLM · StarPort 版
 * 专为接入「星港 StarPort」做的精简多模型对比应用。
 * - 用星港账号登录（OAuth2 授权码）
 * - 所有 AI 调用走星港 Gateway，用「用户在星港配置的密钥」—— 本应用不存、不碰任何明文 key
 * 零第三方依赖：仅用 Node 内建模块，`node server.mjs` 一键启动。
 */
import http from "node:http";
import { URL } from "node:url";

const CFG = {
  port: Number(process.env.PORT || 4000),
  self: process.env.SELF_BASE || `http://localhost:${process.env.PORT || 4000}`,
  starport: process.env.STARPORT_BASE || "http://localhost:3000",
  clientId: process.env.CLIENT_ID || "app_multillm",
  clientSecret: process.env.CLIENT_SECRET || "sk_app_multillm_demo",
};

const MODELS = [
  { provider: "anthropic", label: "Claude", hue: 18 },
  { provider: "openai", label: "OpenAI GPT", hue: 160 },
  { provider: "google", label: "Gemini", hue: 210 },
  { provider: "xai", label: "Grok", hue: 280 },
];

// —— 小工具 ——
const parseCookies = (h = "") =>
  Object.fromEntries(h.split(";").map((c) => c.trim().split("=")).filter((x) => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
const readBody = (req) =>
  new Promise((resolve) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
  });
const json = (res, code, obj) => {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
};
const html = (res, body) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
};
const redirect = (res, to, cookie) => {
  const headers = { location: to };
  if (cookie) headers["set-cookie"] = cookie;
  res.writeHead(302, headers);
  res.end();
};

// —— 页面 ——
function loginPage() {
  return page(`
    <div class="center">
      <div class="card login">
        <div class="logo">⚓</div>
        <h1>MultiLLM · 星港版</h1>
        <p class="sub">一个问题，多个大模型并排作答。<br/>用星港账号登录，直接复用你在平台配置的密钥。</p>
        <a class="btn primary" href="/login">用星港账号登录</a>
        <p class="hint">登录后无需在本应用填任何 API Key —— 调用经星港 Gateway 用你的平台密钥，密钥不出平台。</p>
      </div>
    </div>`);
}

function appPage(me) {
  const cols = MODELS.map(
    (m) => `<label class="modeltoggle"><input type="checkbox" value="${m.provider}" ${m.provider === "anthropic" || m.provider === "openai" ? "checked" : ""}/><span style="--h:${m.hue}">${m.label}</span></label>`,
  ).join("");
  return page(`
    <header class="topbar">
      <div class="brand"><span class="logo sm">⚓</span> MultiLLM <span class="tag">星港版</span></div>
      <div class="me">
        <span class="avatar" style="--h:${me.avatarHue}">${me.name.slice(0, 1)}</span>
        <span>${me.name} · Lv.${me.level}</span>
        <a class="ghost" href="/logout">退出</a>
      </div>
    </header>
    <main class="wrap">
      <div class="banner">✅ 已用星港账号登录。AI 调用经平台 Gateway 用你配置的密钥（本应用接触不到明文 Key）。</div>
      <div class="composer">
        <textarea id="prompt" rows="2" placeholder="问点什么…… 多个模型会并排作答">用一句话解释什么是 Transformer。</textarea>
        <div class="row">
          <div class="models">${cols}</div>
          <button id="send" class="btn primary">并排发送</button>
        </div>
      </div>
      <div id="grid" class="grid"></div>
    </main>
    <script>${appScript()}</script>`);
}

function appScript() {
  return `
    const MODELS = ${JSON.stringify(MODELS)};
    const grid = document.getElementById('grid');
    const send = document.getElementById('send');
    const promptEl = document.getElementById('prompt');
    function selected(){ return [...document.querySelectorAll('.modeltoggle input:checked')].map(i=>i.value); }
    function colFor(p){ const m = MODELS.find(x=>x.provider===p); return m; }
    async function run(){
      const prompt = promptEl.value.trim();
      const providers = selected();
      if(!prompt || providers.length===0) return;
      send.disabled = true; send.textContent='调用中…';
      grid.style.gridTemplateColumns = 'repeat('+providers.length+', minmax(0,1fr))';
      grid.innerHTML = providers.map(p=>{ const m=colFor(p);
        return '<div class="col"><div class="colhead" style="--h:'+m.hue+'">'+m.label+'</div><div class="colbody" id="c-'+p+'"><div class="loading">思考中…</div></div></div>';
      }).join('');
      await Promise.all(providers.map(async p=>{
        const cell = document.getElementById('c-'+p);
        try{
          const r = await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt,provider:p})});
          const data = await r.json();
          if(data.reply){ cell.innerHTML = '<div class="reply"></div><div class="usage">'+(data.usage?('in '+data.usage.tokensIn+' / out '+data.usage.tokensOut+' tokens · '+(data.model||'')):'' )+'</div>'; cell.querySelector('.reply').textContent = data.reply; }
          else { cell.innerHTML = '<div class="err">'+(data.error_description||data.error||'调用失败')+'</div>'; }
        }catch(e){ cell.innerHTML = '<div class="err">网络错误：'+e.message+'</div>'; }
      }));
      send.disabled = false; send.textContent='并排发送';
    }
    send.addEventListener('click', run);
    promptEl.addEventListener('keydown', e=>{ if((e.metaKey||e.ctrlKey)&&e.key==='Enter') run(); });
  `;
}

function page(inner) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>MultiLLM · 星港版</title><style>
  *{box-sizing:border-box} body{margin:0;font-family:"PingFang SC",system-ui,sans-serif;background:#f3f5f8;color:#1c2433}
  a{color:inherit;text-decoration:none}
  .center{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e1e6ee;border-radius:14px;padding:32px;box-shadow:0 12px 40px -16px rgba(28,36,51,.18)}
  .login{max-width:380px;text-align:center}
  .logo{font-size:40px} .logo.sm{font-size:18px}
  h1{font-size:20px;margin:8px 0} .sub{color:#5a6474;font-size:14px;line-height:1.7;margin:0 0 18px}
  .hint{color:#98a1b3;font-size:12px;margin-top:14px;line-height:1.6}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer}
  .btn.primary{background:#2563eb;color:#fff} .btn.primary:hover{background:#1d4ed8} .btn:disabled{opacity:.6}
  .topbar{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:#fff;border-bottom:1px solid #e1e6ee;position:sticky;top:0;z-index:5}
  .brand{display:flex;align-items:center;gap:8px;font-weight:700}
  .tag{font-size:11px;background:#eef1f6;color:#5a6474;border-radius:6px;padding:2px 6px}
  .me{display:flex;align-items:center;gap:10px;font-size:13px;color:#5a6474}
  .avatar{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;background:hsl(var(--h) 45% 50%)}
  .ghost{font-size:12px;color:#98a1b3;border:1px solid #e1e6ee;border-radius:6px;padding:4px 10px} .ghost:hover{color:#d64545;border-color:#d6454540}
  .wrap{max-width:1200px;margin:0 auto;padding:20px}
  .banner{background:#eef6ff;border:1px solid #cfe0f6;color:#2563eb;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:16px}
  .composer{background:#fff;border:1px solid #e1e6ee;border-radius:12px;padding:14px}
  textarea{width:100%;border:1px solid #e1e6ee;border-radius:8px;padding:10px 12px;font:inherit;font-size:14px;resize:vertical}
  textarea:focus{outline:none;border-color:#2563eb}
  .row{display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap}
  .models{display:flex;gap:8px;flex-wrap:wrap}
  .modeltoggle{display:inline-flex;align-items:center;gap:6px;border:1px solid #e1e6ee;border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer}
  .modeltoggle input{accent-color:#2563eb} .modeltoggle span{color:hsl(var(--h) 45% 40%);font-weight:500}
  #send{margin-left:auto}
  .grid{display:grid;gap:14px;margin-top:18px}
  .col{background:#fff;border:1px solid #e1e6ee;border-radius:12px;overflow:hidden;min-height:120px;display:flex;flex-direction:column}
  .colhead{padding:8px 12px;font-size:13px;font-weight:600;color:hsl(var(--h) 45% 40%);background:hsl(var(--h) 60% 97%);border-bottom:1px solid #e1e6ee}
  .colbody{padding:12px;font-size:14px;line-height:1.7;flex:1}
  .reply{white-space:pre-wrap}
  .usage{margin-top:10px;font-size:11px;color:#98a1b3}
  .loading{color:#98a1b3;font-size:13px}
  .err{color:#b07d1e;font-size:13px;background:#fdf6e9;border:1px solid #f0e3c4;border-radius:8px;padding:10px}
  </style></head><body>${inner}</body></html>`;
}

// —— OAuth + 代理 ——
async function exchangeToken(code) {
  const r = await fetch(`${CFG.starport}/api/v1/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: CFG.clientId, client_secret: CFG.clientSecret, code }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || data.error || "token exchange failed");
  return data.access_token;
}
async function fetchMe(token) {
  const r = await fetch(`${CFG.starport}/api/v1/me`, { headers: { authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return r.json();
}
async function gatewayChat(token, provider, prompt) {
  const r = await fetch(`${CFG.starport}/api/v1/ai/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ provider, prompt }),
  });
  return { status: r.status, data: await r.json() };
}

// —— 服务器 ——
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, CFG.self);
  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.sp_token;

  try {
    if (u.pathname === "/login") {
      const redirectUri = `${CFG.self}/callback`;
      const authorize = `${CFG.starport}/oauth/authorize?client_id=${encodeURIComponent(CFG.clientId)}&scope=${encodeURIComponent("identity,gateway:llm")}&redirect_uri=${encodeURIComponent(redirectUri)}`;
      return redirect(res, authorize);
    }
    if (u.pathname === "/callback") {
      const code = u.searchParams.get("code");
      if (!code) return redirect(res, "/");
      const at = await exchangeToken(code);
      return redirect(res, "/", `sp_token=${encodeURIComponent(at)}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax`);
    }
    if (u.pathname === "/logout") {
      return redirect(res, "/", "sp_token=; HttpOnly; Path=/; Max-Age=0");
    }
    if (u.pathname === "/api/me") {
      if (!token) return json(res, 401, { error: "not_logged_in" });
      return json(res, 200, (await fetchMe(token)) || {});
    }
    if (u.pathname === "/api/chat" && req.method === "POST") {
      if (!token) return json(res, 401, { error: "not_logged_in" });
      const body = JSON.parse((await readBody(req)) || "{}");
      const { status, data } = await gatewayChat(token, body.provider || "anthropic", body.prompt || "");
      return json(res, status, data);
    }
    // 首页
    if (u.pathname === "/") {
      if (!token) return html(res, loginPage());
      const me = await fetchMe(token);
      if (!me || !me.handle) return html(res, loginPage()); // 令牌失效 → 重新登录
      return html(res, appPage(me));
    }
    res.writeHead(404); res.end("Not Found");
  } catch (e) {
    json(res, 500, { error: "server_error", error_description: String(e?.message || e) });
  }
});

server.listen(CFG.port, () => {
  console.log(`MultiLLM·星港版 运行于 ${CFG.self}`);
  console.log(`→ 星港地址 ${CFG.starport}  | client_id ${CFG.clientId}`);
});
