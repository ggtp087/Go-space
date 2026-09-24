/** Temporary body for a routed page that isn't built out yet — just its title. */
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="flex-1 p-10">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
    </div>
  )
}
