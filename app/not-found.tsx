import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or hasn&apos;t been
        published yet.
      </p>
      <p className="mt-6">
        <Link
          href="/"
          className="font-medium underline-offset-4 hover:underline"
        >
          &larr; Back to all pages
        </Link>
      </p>
    </main>
  );
}
