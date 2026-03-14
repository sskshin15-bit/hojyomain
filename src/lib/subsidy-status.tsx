import { Badge } from "@/components/ui/badge"
import { CircleDot, AlertTriangle, CheckCircle2, Archive } from "lucide-react"

const STATUS_CONFIG: Record<
  string,
  { label: string; short: string; icon: React.ElementType; className: string }
> = {
  draft: {
    label: "未確認",
    short: "未",
    icon: CircleDot,
    className: "bg-slate-100 text-slate-700 border-slate-300",
  },
  needs_review: {
    label: "要確認",
    short: "要",
    icon: AlertTriangle,
    className: "bg-amber-100 text-amber-800 border-amber-400",
  },
  published: {
    label: "公開中",
    short: "公",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 border-emerald-400",
  },
  archived: {
    label: "アーカイブ",
    short: "終",
    icon: Archive,
    className: "bg-slate-100 text-slate-600 border-slate-300",
  },
}

export function getSubsidyStatusLabel(status: string | null | undefined): string {
  if (!status) return "—"
  return STATUS_CONFIG[status]?.label ?? status
}

export function SubsidyStatusBadge({
  status,
  short = false,
  showIcon = true,
}: {
  status: string | null | undefined
  short?: boolean
  showIcon?: boolean
}) {
  if (!status) return <span className="text-slate-400">—</span>
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    short: status.slice(0, 1),
    icon: CircleDot,
    className: "bg-slate-100 text-slate-600 border-slate-300",
  }
  const Icon = config.icon
  const text = short ? config.short : config.label
  return (
    <Badge variant="outline" className={`shrink-0 text-xs font-medium ${config.className}`}>
      {showIcon && <Icon className="mr-0.5 h-3 w-3" />}
      {text}
    </Badge>
  )
}
