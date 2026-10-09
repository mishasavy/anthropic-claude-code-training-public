"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import {
  DEFAULT_EXPORT_COLUMNS,
  EXPORT_COLUMNS,
  ExportColumn,
  ExportScope,
} from "@/lib/csv"
import { Download } from "lucide-react"
import { useEffect, useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Date (UTC)",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last four",
  amount: "Amount",
  currency: "Currency",
}

const SCOPE_LABELS: Record<ExportScope, string> = {
  filtered: "Current filter",
  all: "All payments",
}

type Count =
  | { state: "loading" }
  | { state: "ready"; total: number }
  | { state: "error" }

/**
 * Export options for the payments table. The file is built on the server by
 * `GET /api/payments/export`; this only chooses what to ask for. The row count
 * comes from `GET /api/payments`, which uses the same query builder.
 */
export function ExportDialog({ query }: { query: string }) {
  const [open, setOpen] = useState(false)
  const [columns, setColumns] = useState<ExportColumn[]>([
    ...DEFAULT_EXPORT_COLUMNS,
  ])
  const [scope, setScope] = useState<ExportScope>("filtered")
  const [count, setCount] = useState<Count>({ state: "loading" })

  const filterParams = new URLSearchParams(scope === "all" ? "" : query)
  filterParams.delete("page")

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setCount({ state: "loading" })
    fetch(`/api/payments?${filterParams.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<{ total: number }>
      })
      .then(({ total }) => setCount({ state: "ready", total }))
      .catch(() => {
        if (!controller.signal.aborted) setCount({ state: "error" })
      })
    return () => controller.abort()
    // filterParams is derived from query and scope.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, scope])

  const toggle = (column: ExportColumn, checked: boolean) =>
    setColumns((current) =>
      // Keep the canonical column order whatever order they were ticked in.
      EXPORT_COLUMNS.filter((c) =>
        c === column ? checked : current.includes(c),
      ),
    )

  const downloadParams = new URLSearchParams(filterParams)
  downloadParams.set("scope", scope)
  downloadParams.set("columns", columns.join(","))
  const downloadHref = `/api/payments/export?${downloadParams.toString()}`

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent className="sm:max-w-md">
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription className="text-sm">
            Choose what goes into the CSV. Card last four is off by default.
          </DrawerDescription>
        </DrawerHeader>

        <DrawerBody className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            {(Object.keys(SCOPE_LABELS) as ExportScope[]).map((value) => (
              <label
                key={value}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="radio"
                  name="export-scope"
                  value={value}
                  checked={scope === value}
                  onChange={() => setScope(value)}
                  className="size-4 accent-blue-600"
                />
                {SCOPE_LABELS[value]}
              </label>
            ))}
            <p
              className="mt-1 text-sm text-gray-500"
              aria-live="polite"
              data-testid="export-count"
            >
              {count.state === "loading" && "Counting payments…"}
              {count.state === "ready" &&
                `${count.total.toLocaleString()} ${
                  count.total === 1 ? "payment" : "payments"
                } will be exported.`}
              {count.state === "error" &&
                "Could not count payments. The export will still include every matching row."}
            </p>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EXPORT_COLUMNS.map((column) => (
                <label
                  key={column}
                  className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <input
                    type="checkbox"
                    name="export-columns"
                    value={column}
                    checked={columns.includes(column)}
                    onChange={(event) => toggle(column, event.target.checked)}
                    className="size-4 rounded accent-blue-600"
                  />
                  {COLUMN_LABELS[column]}
                </label>
              ))}
            </div>
            {columns.length === 0 && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                Choose at least one column to export.
              </p>
            )}
          </fieldset>
        </DrawerBody>

        <DrawerFooter className="gap-2 sm:gap-0">
          <DrawerClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DrawerClose>
          {columns.length === 0 ? (
            <Button disabled>Download CSV</Button>
          ) : (
            <Button asChild>
              <a href={downloadHref} onClick={() => setOpen(false)}>
                Download CSV
              </a>
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
