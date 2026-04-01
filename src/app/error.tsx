"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-bold mb-2">Что-то пошло не так</h2>
        <p className="text-sm text-muted mb-6">{error.message}</p>
        <button onClick={reset} className="px-6 py-3 bg-foreground text-background rounded-full font-medium">
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
