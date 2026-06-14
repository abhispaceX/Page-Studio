export default function Loading() {
  return (
    <main
      id="main"
      className="mx-auto max-w-3xl px-6 py-24"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-4 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-12 space-y-3">
        <div className="h-32 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    </main>
  );
}
