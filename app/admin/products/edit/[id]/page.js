
import { Suspense } from "react";
import ProductForm from "../../ProductForm";

function EditProductFallback() {
    return (
        <main className="min-h-screen bg-[#f7f8fa] p-8">
            <div className="mx-auto max-w-5xl animate-pulse">
                <div className="mb-6 h-8 w-48 rounded bg-gray-200" />
                <div className="h-96 rounded-2xl border border-gray-200 bg-white" />
            </div>
        </main>
    );
}

async function EditProductContent({ params }) {
    const { id } = await params;

    return (
        <ProductForm
            mode="edit"
            productId={id}
        />
    );
}

export default function EditProductPage({ params }) {
    return (
        <Suspense fallback={<EditProductFallback />}>
            <EditProductContent params={params} />
        </Suspense>
    );
}