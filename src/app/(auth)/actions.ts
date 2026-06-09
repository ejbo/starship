"use server";

import { redirect } from "next/navigation";
import { login, register } from "@/lib/auth-service";
import { clearSession } from "@/lib/session";

export interface AuthState {
  error?: string;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const handle = String(formData.get("handle") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await login(handle, password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "登录失败" };
  }
  redirect("/");
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const handle = String(formData.get("handle") ?? "");
  const name = String(formData.get("name") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    await register(handle, name, password);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "注册失败" };
  }
  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
