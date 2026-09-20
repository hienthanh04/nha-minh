export function LoadingCard({ title }: { title: string }) {
  return <section className="card min-h-36" aria-busy="true">
    <h2 className="mb-4 text-lg font-bold">{title}</h2>
    <p role="status" className="text-sm text-muted">Đang tải…</p>
  </section>;
}
