import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import { PaymentFilters } from "@/data/types"
import {
  ExportScope,
  exportFilename,
  parseExportColumns,
  parseExportScope,
  toCsv,
} from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

/**
 * Exports the payments table as CSV.
 *
 * `scope` is `filtered` (default, honors the active filters) or `all`.
 * `columns` is a comma-separated list checked against EXPORT_COLUMNS; when
 * absent, every column except the card last four is exported. Rows come from
 * the same query builder as `GET /api/payments`, unpaginated.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams

  const parsed = parseExportColumns(params.get("columns"))
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  const scope = parseExportScope(params.get("scope"))
  const filters = parseFilters(
    scope === "all" ? new URLSearchParams() : params,
  )
  const rows = sortPayments(
    filterPayments(filters),
    filters.sort,
    filters.direction,
  )

  return new Response(toCsv(rows, parsed.columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(
        new Date(),
        filenameLabel(scope, filters),
      )}"`,
    },
  })
}

/** Built only from validated values, so nothing raw reaches the filename. */
function filenameLabel(
  scope: ExportScope,
  filters: PaymentFilters,
): string | undefined {
  if (scope === "all") return "all"
  if (filters.status && filters.status !== "all") return filters.status
  if (filters.merchantId || filters.search || filters.from || filters.to) {
    return "filtered"
  }
  return undefined
}
