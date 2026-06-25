"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/lib/components/ui/select"
import { Label } from "@/lib/components/ui/label"
import { cn } from "@/lib/utils"
import type { SelectOption } from "@/lib/types"

type OptionSelectProps = {
  label: string
  placeholder: string
  options: SelectOption[] | string[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  loading?: boolean
  className?: string
  layout?: "stacked" | "inline"
  triggerClassName?: string
}

function normalizeOptions(options: SelectOption[] | string[]): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { id: option, label: option } : option
  )
}

export function OptionSelect({
  label,
  placeholder,
  options,
  value,
  onValueChange,
  disabled = false,
  className,
  layout = "stacked",
  triggerClassName,
  loading = false
}: OptionSelectProps) {
  const items = normalizeOptions(options)
  const selectItems = items.map((option) => ({
    value: option.id,
    label: option.label
  }))

  const select = (
    <Select
      value={value || null}
      items={selectItems}
      onValueChange={(next) => {
        if (next) onValueChange(next)
      }}
    >
      <SelectTrigger
        className={cn(layout === "inline" ? "w-18" : "w-full", triggerClassName)}
        disabled={disabled}
      >
        {!loading && <SelectValue placeholder={placeholder} />}
        {loading && "Loading..."}
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )

  if (layout === "inline") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Label className="text-muted-foreground shrink-0 text-sm font-normal">{label}</Label>
        {select}
      </div>
    )
  }

  return (
    <div className={cn("flex min-w-48 flex-1 flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {select}
    </div>
  )
}
