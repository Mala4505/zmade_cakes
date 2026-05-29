export default function AdminLoading() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <style>{`
        @keyframes shimmer {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .sk { animation: shimmer 1.5s ease-in-out infinite; }
      `}</style>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="sk rounded-xl p-5 h-24"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          />
        ))}
      </div>

      {/* Monthly stats block */}
      <div
        className="sk rounded-xl mb-6 h-48"
        style={{ backgroundColor: 'var(--color-surface-raised)' }}
      />

      {/* Two section cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="sk rounded-xl h-40"
            style={{ backgroundColor: 'var(--color-surface-raised)' }}
          />
        ))}
      </div>
    </div>
  )
}
