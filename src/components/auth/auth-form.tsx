"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthState } from "@/app/(auth)/actions";

const initial: AuthState = {};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white">
          港
        </span>
        <h1 className="text-xl font-bold">{mode === "login" ? "登录星港" : "创建账号"}</h1>
        <p className="mt-1 text-sm text-dim">
          {mode === "login" ? "欢迎回来" : "加入星港，开始探索 AI 应用生态"}
        </p>
      </div>

      <form action={formAction} className="capsule space-y-3 p-5">
        <label className="block space-y-1">
          <span className="text-xs text-dim">用户名</span>
          <input
            name="handle"
            required
            autoComplete="username"
            placeholder="3–20 位小写字母/数字/下划线"
            className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        {mode === "register" && (
          <label className="block space-y-1">
            <span className="text-xs text-dim">昵称</span>
            <input
              name="name"
              placeholder="显示名（可留空）"
              className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs text-dim">密码</span>
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="至少 6 位"
            className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        {state.error && <p className="text-sm text-danger">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep disabled:opacity-50"
        >
          {pending ? "请稍候…" : mode === "login" ? "登录" : "注册并登录"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-dim">
        {mode === "login" ? (
          <>
            还没有账号？{" "}
            <Link href="/register" className="font-medium text-accent hover:underline">
              注册
            </Link>
          </>
        ) : (
          <>
            已有账号？{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              登录
            </Link>
          </>
        )}
      </p>

      {mode === "login" && (
        <p className="mt-3 text-center text-xs text-mute">演示账号：me / starport123</p>
      )}
    </div>
  );
}
