import { DataError } from "@/components/data-status";
import Link from "next/link";
import { CookingPot } from "lucide-react";
import { Card, CardHeading } from "@/components/ui";
import { dateText, timeText, vietnamToday } from "@/lib/date-format";
import { foodStatus, nextHousehold, type FoodBatch } from "@/lib/food/rules";
import type { FoodData } from "@/lib/food/queries";
import { FoodControls } from "./controls";

export function FoodHome({ data, admin }: { data: FoodData; admin: boolean }) {
  const batch = data.current;
  const name = data.households.find(h => h.id === batch?.household_id)?.name ?? "Chưa đọc được tên nhà";
  const next = batch ? nextHousehold(data.households, batch.household_id) : null;
  return <Card>
    <CardHeading icon={CookingPot} title="Gửi đồ ăn" />
    {data.error ? <DataError message={data.error ?? "Không thể tải dữ liệu lúc này."} /> : !batch ? <>
      <p>Chưa thiết lập lượt gửi đồ ăn.</p>
      <p className="mt-2 text-sm text-muted">{data.batches.length ? "Chưa có đợt hiện tại. Hãy nhờ quản trị viên kiểm tra lịch sử." : "Quản trị viên cần chọn các nhà và khởi tạo lượt chờ đầu tiên."}</p>
    </> : <>
      <p className="text-sm text-muted">{batch.status === "active" ? "Đang dùng:" : "Đang chờ đồ từ:"}</p>
      <p className="mt-1 text-lg font-bold">{name}</p>
      {batch.start_date && <p className="mt-1 text-sm text-muted">Bắt đầu: {dateText(batch.start_date)}</p>}
      <p className="mt-2 text-sm">Tiếp theo: {next?.name ?? "Chưa có nhà đang tham gia"}</p>
      {batch.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">{batch.note}</p>}
      <FoodControls key={batch.id} batch={batch} household={name} />
    </>}
    {admin && <Link className="text-button mt-3 inline-flex items-center" href="/khac/quan-tri/do-an">Thiết lập / sửa lượt gửi đồ</Link>}
  </Card>;
}
export function FoodBatchDetails({ batch }: { batch: FoodBatch }) {
  return <>
    <p className="mt-1 text-sm">{batch.status === "finished" ? "✅ " : ""}{foodStatus(batch.status)}</p>
    {batch.start_date && <p className="mt-1 text-sm text-muted">Nhận: {dateText(batch.start_date)}</p>}
    {batch.finished_at && <p className="mt-1 text-sm text-muted">Hết: {dateText(vietnamToday(new Date(batch.finished_at)))} · {timeText(batch.finished_at)}</p>}
    {batch.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{batch.note}</p>}
  </>;
}
export function FoodPagination({ data, path, week }: { data: FoodData; path: string; week?: string }) {
  function href(page: number) {
    const params = new URLSearchParams({ foodPage: String(page) });
    if (week) params.set("week", week);
    return `${path}?${params}`;
  }
  return <div className="mt-3 flex flex-wrap gap-2">
    {data.page > 0 && <Link className="button button-secondary" href={href(data.page - 1)}>Đợt mới hơn</Link>}
    {data.hasMore && <Link className="button button-secondary" href={href(data.page + 1)}>Đợt cũ hơn</Link>}
  </div>;
}
export function FoodHistory({ data, week }: { data: FoodData; week: string }) {
  return <Card>
    <CardHeading icon={CookingPot} title="Những đợt đồ ăn" />
    <p className="mb-3 text-xs text-muted">Theo thời điểm tạo đợt, mới nhất trước · Không lọc theo tuần</p>
    {data.error ? <DataError message={data.error ?? "Không thể tải dữ liệu lúc này."} /> : !data.batches.length ? <p className="text-sm text-muted">Chưa có đợt đồ ăn trong trang này.</p> :
      <ul className="space-y-3">{data.batches.map(batch => <li key={batch.id} className="rounded-xl bg-slate-50 p-3">
        <p className="font-semibold">{data.households.find(h => h.id === batch.household_id)?.name ?? "Chưa đọc được tên nhà"}</p>
        <FoodBatchDetails batch={batch} />
      </li>)}</ul>}
    <FoodPagination data={data} path="/lich-su" week={week} />
  </Card>;
}
