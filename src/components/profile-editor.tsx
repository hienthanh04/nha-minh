"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "./avatar";
import { ActionFeedback, RefreshButton } from "./data-status";
import { saveProfile, type ProfileResult } from "@/lib/profile/actions";
import type { FamilyProfile } from "@/lib/auth/profile";

async function shrinkPhoto(file: File) {
  if (file.size > 10 * 1024 * 1024) throw new Error("Ảnh tối đa 10 MB. Hãy chọn ảnh nhỏ hơn.");
  let image: ImageBitmap;
  try { image = await createImageBitmap(file); }
  catch { throw new Error("Không đọc được ảnh này. Hãy chọn JPG, PNG hoặc WebP; với ảnh HEIC, hãy đổi sang JPG trước."); }
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Không thể xử lý ảnh trên thiết bị này.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 512, 512);
    const side = Math.min(image.width, image.height);
    context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 512, 512);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Chưa xử lý được ảnh.")), "image/jpeg", 0.82));
    if (blob.size > 524288) throw new Error("Ảnh sau xử lý còn quá lớn. Hãy chọn ảnh khác.");
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } finally { image.close(); }
}

export function ProfileEditor({ profile, onboarding = false }: { profile: FamilyProfile; onboarding?: boolean }) {
  const [name, setName] = useState(profile.display_name);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ProfileResult | null>(null);
  const busy = useRef(false);
  const picker = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const disabled = processing || pending;
  return <form className="space-y-5" aria-busy={disabled} onSubmit={event => {
    event.preventDefault();
    if (busy.current || disabled) return;
    if (!navigator.onLine) { setResult({ ok: false, message: "Đang mất kết nối. Hồ sơ chưa được lưu." }); return; }
    const form = new FormData();
    form.set("name", name); form.set("expected", profile.updated_at ?? "");
    if (photo) form.set("avatar", photo);
    if (remove) form.set("remove", "yes");
    busy.current = true; setResult(null);
    startTransition(async () => {
      try {
        const response = await saveProfile(form); setResult(response);
        if (response.login) router.replace("/login");
        else if (response.ok) { if (onboarding) router.replace("/"); router.refresh(); }
      } catch { setResult({ ok: false, message: "Chưa xác nhận được kết quả lưu. Hãy tải lại để kiểm tra rồi thử lại." }); }
      finally { busy.current = false; }
    });
  }}>
    <div className="flex justify-center py-3"><Avatar id={profile.id} name={name} path={remove ? null : profile.avatar_path} preview={preview} large /></div>
    <label className="block font-semibold">Tên hiển thị
      <input className="auth-input mt-2" value={name} maxLength={60} required autoComplete="nickname" disabled={disabled} onChange={e => setName(e.target.value)} />
    </label>
    <div>
      <label className="block font-semibold" htmlFor="avatar-photo">Chọn ảnh từ điện thoại (không bắt buộc)</label>
      <input ref={picker} id="avatar-photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" disabled={disabled}
        className="auth-input mt-2 text-sm" onChange={async event => {
          const file = event.target.files?.[0];
          if (!file) return;
          setProcessing(true); setResult(null); setPhoto(null); setPreview(null);
          try { const image = await shrinkPhoto(file); setPhoto(image); setPreview(URL.createObjectURL(image)); setRemove(false); }
          catch (error) { setResult({ ok: false, message: error instanceof Error ? error.message : "Chưa đọc được ảnh." }); }
          finally { setProcessing(false); }
        }} />
      <p className="mt-2 text-sm text-muted">Ảnh được cắt vuông ở giữa và thu nhỏ. Không chọn ảnh thì dùng chữ cái đầu của tên.</p>
      {processing && <p role="status" className="mt-2 text-sm">Đang xử lý ảnh…</p>}
      {(photo || (profile.avatar_path && !remove)) && <button type="button" className="text-button" disabled={disabled} onClick={() => {
        setPhoto(null); setPreview(null); setRemove(true); if (picker.current) picker.current.value = "";
      }}>Bỏ ảnh, dùng chữ cái đầu</button>}
    </div>
    <button className="button button-primary w-full" disabled={disabled || !name.trim()}>{pending ? "Đang lưu…" : onboarding ? "Lưu và vào Gia tộc Trần Anh" : "Lưu hồ sơ"}</button>
    <ActionFeedback pending={pending} result={result} />
    {result && !result.ok && <RefreshButton />}
  </form>;
}
