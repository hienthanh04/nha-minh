import { DataError } from "@/components/data-status";
import { requireAdmin } from "@/lib/auth/session";
import { getFood } from "@/lib/food/queries";
import { foodPage } from "@/lib/food/rules";
import { Card, PageHeading } from "@/components/ui";
import { HouseholdEditor, FoodInitializer, FoodCorrectionEditor } from "@/components/food/admin-editor";
import { FoodBatchDetails, FoodPagination } from "@/components/food/views";

export default async function FoodAdminPage({ searchParams }: { searchParams: Promise<{ foodPage?: string }> }) {
  await requireAdmin();
  const data = await getFood(foodPage((await searchParams).foodPage));
  return <>
    <PageHeading eyebrow="Quản trị gia đình" title="Lượt gửi đồ ăn" description="Chỉ chuyển lượt khi đã nhận hoặc đã dùng hết đồ." />
    {data.error ? <Card><DataError message={data.error ?? "Không thể tải dữ liệu lúc này."} /></Card> : <div className="space-y-4">
      <Card><h2 className="mb-4 text-lg font-bold">Các nhà gửi đồ và thứ tự</h2>
        <HouseholdEditor key={data.households.map(h => h.updated_at).join("|")} households={data.households} />
      </Card>
      {!data.current && data.page === 0 && !data.batches.length && <Card>
        <h2 className="mb-4 text-lg font-bold">Bắt đầu lượt đầu tiên</h2>
        <FoodInitializer households={data.households} />
      </Card>}
      <Card><h2 className="mb-3 text-lg font-bold">Ghi chú và sửa bản ghi nhầm</h2>
        {!data.batches.length && <p className="text-sm text-muted">Chưa có đợt đồ ăn trong trang này.</p>}
        {data.batches.map(batch => <details key={batch.id} className="border-b border-slate-100 py-3">
          <summary>{data.households.find(h => h.id === batch.household_id)?.name ?? "Chưa đọc được tên nhà"}</summary>
          <FoodBatchDetails batch={batch} />
          <div className="mt-3"><FoodCorrectionEditor key={batch.updated_at} batch={batch} successor={data.current?.previous_batch_id === batch.id ? data.current : null} /></div>
        </details>)}
        <FoodPagination data={data} path="/khac/quan-tri/do-an" />
      </Card>
    </div>}
  </>;
}
