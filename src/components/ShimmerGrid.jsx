export default function ShimmerGrid({ count = 10 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ui-panel ui-border rounded-2xl overflow-hidden">
          <div className="shimmer aspect-[2/3]" />
          <div className="p-3 space-y-2">
            <div className="shimmer h-3 rounded" />
            <div className="shimmer h-3 w-2/3 rounded" />
            <div className="shimmer h-2 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}