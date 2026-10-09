
import { Suspense } from "react";
import ViewProductClient from "./ViewProductClient";

function ViewProductFallback() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] p-8">
      <div className="mx-auto max-w-4xl animate-pulse">
        <div className="mb-6 h-8 w-48 rounded bg-gray-200" />
        <div className="h-96 rounded-2xl bg-white" />
      </div>
    </main>
  );
}

async function ViewProductContent({ params }) {
  const { id } = await params;

  return <ViewProductClient productId={id} />;
}

export default function ViewProductPage({ params }) {
  return (
    <Suspense fallback={<ViewProductFallback />}>
      <ViewProductContent params={params} />
    </Suspense>
  );
}