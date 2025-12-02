import React, { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { CSVLink } from "react-csv";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExportableTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  title?: string;
  exportFileName?: string;
  onRowClick?: (row: TData) => void;
  totalCount?: number;
  totalPages?: number;
  initialPageIndex?: number;
  initialPageSize?: number;
  onPaginationChange?: (pageIndex: number, pageSize: number) => void;
  pageOptions?: number[];
  initialSorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  manualPagination?: boolean;
  manualSorting?: boolean;
  emptyStateMessage?: string;
  isLoading?: boolean;
}

export function ExportableTable<TData>({
  data,
  columns,
  title = "Data Table",
  exportFileName = "export-data",
  onRowClick,
  totalCount = 0,
  totalPages = 1,
  initialPageIndex = 0,
  initialPageSize = 10,
  onPaginationChange,
  pageOptions = [10, 20, 50, 100],
  initialSorting = [],
  onSortingChange,
  manualPagination = false,
  manualSorting = false,
  emptyStateMessage = "No data available",
  isLoading = false,
}: ExportableTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });

  const currentDate = format(new Date(), "yyyy-MM-dd");
  const exportFilename = `${exportFileName}-${currentDate}.csv`;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    onSortingChange: (newSorting) => {
      setSorting(newSorting);
      if (onSortingChange) {
        onSortingChange(newSorting as SortingState);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (newPagination) => {
      setPagination(newPagination);
      if (onPaginationChange) {
        onPaginationChange(newPagination.pageIndex, newPagination.pageSize);
      }
    },
    manualPagination,
    manualSorting,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination,
    },
    pageCount: manualPagination ? totalPages : undefined,
  });

  function prepareCsvData() {
    // Extract headers
    const headers = columns
      .filter((column) => column.id !== "actions" && !columnVisibility[column.id!] === false)
      .map((column) => {
        // Use accessorKey if available, otherwise use the id
        return (column as any).accessorKey || column.id || "";
      });

    // Extract data
    const csvData = data.map((row) => {
      const rowData: Record<string, any> = {};
      headers.forEach((header) => {
        if (header) {
          // Use bracket notation to access potentially nested properties
          rowData[header] = (row as any)[header];
        }
      });
      return rowData;
    });

    return csvData;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SlidersHorizontalIcon className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <CSVLink
            data={prepareCsvData()}
            filename={exportFilename}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
            Export CSV
          </CSVLink>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table className="whitespace-nowrap">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`loading-${i}`} className="animate-pulse">
                    {Array.from({ length: columns.length }).map((_, j) => (
                      <TableCell key={`loading-cell-${i}-${j}`}>
                        <div className="h-4 bg-muted rounded"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    onClick={() => onRowClick && onRowClick(row.original)}
                    className={onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    {emptyStateMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          {totalCount > 0 && (
            <>
              Showing{" "}
              <strong>
                {pagination.pageIndex * pagination.pageSize + 1}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  totalCount
                )}
              </strong>{" "}
              of <strong>{totalCount}</strong> results
            </>
          )}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {pageOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {pagination.pageIndex + 1} of{" "}
            {manualPagination
              ? totalPages
              : Math.max(1, Math.ceil(totalCount / pagination.pageSize))}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronLeftIcon className="h-4 w-4" />
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronRightIcon className="h-4 w-4" />
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export default ExportableTable;