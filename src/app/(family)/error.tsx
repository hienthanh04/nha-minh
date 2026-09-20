"use client";

export default function FamilyError({ reset }: { reset: () => void }) {
  return <section className="card space-y-3" role="alert">
    <h1 className="text-xl font-bold">Chưa tải được trang này</h1>
    <p>Kiểm tra kết nối rồi thử lại. Các thông tin đã lưu vẫn được giữ nguyên.</p>
    <button className="button button-primary" onClick={reset}>Thử lại</button>
  </section>;
}
