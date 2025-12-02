import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { CSVLink } from 'react-csv';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FilterIcon,
  Search,
  TableIcon,
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import DriverLayout from '@/components/layouts/driver-layout';
import { LoadingTable } from '@/components/ui/loading-skeletons';
import RetryableError from '@/components/ui/retryable-error';

interface Ride {
  id: number;
  referenceNumber: string;
  riderId: number;
  driverId: number;
  status: string;
  scheduledTime: string;
  pickupLocation: string;
  dropoffLocation: string;
  finalPrice: number;
  vehicleType: string;
  isRoundTrip: boolean;
  createdAt: string;
}

const RideStatusBadge = ({ status }: { status: string }) => {
  let badgeVariant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
  
  switch (status) {
    case 'completed':
      badgeVariant = 'default';
      break;
    case 'cancelled':
      badgeVariant = 'destructive';
      break;
    case 'in_progress':
    case 'en_route':
    case 'arrived':
      badgeVariant = 'secondary';
      break;
    default:
      badgeVariant = 'outline';
  }
  
  return (
    <Badge variant={badgeVariant}>
      {status.replace('_', ' ')}
    </Badge>
  );
};

const DriverReports: React.FC = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  // Fetch ride history data
  const {
    data: ridesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      '/api/analytics/driver/rides',
      pagination.pageIndex + 1,
      pagination.pageSize,
      statusFilter,
      dateRange.startDate,
      dateRange.endDate,
      sorting,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }

      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }

      if (sorting.length > 0) {
        params.append('sortBy', sorting[0].id);
        params.append('sortOrder', sorting[0].desc ? 'desc' : 'asc');
      } else {
        params.append('sortBy', 'scheduledTime');
        params.append('sortOrder', 'desc');
      }

      const response = await fetch(`/api/analytics/driver/rides?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ride history');
      }
      return response.json();
    },
  });

  const columns = [
    {
      accessorKey: 'referenceNumber',
      header: 'Reference',
      cell: ({ row }) => <span className="font-medium">{row.original.referenceNumber}</span>,
    },
    {
      accessorKey: 'scheduledTime',
      header: 'Date & Time',
      cell: ({ row }) => (
        <span>
          {format(new Date(row.original.scheduledTime), 'MM/dd/yyyy h:mm a')}
        </span>
      ),
    },
    {
      accessorKey: 'pickupLocation',
      header: 'Pickup',
      cell: ({ row }) => (
        <div className="max-w-[180px] truncate" title={row.original.pickupLocation}>
          {row.original.pickupLocation}
        </div>
      ),
    },
    {
      accessorKey: 'dropoffLocation',
      header: 'Dropoff',
      cell: ({ row }) => (
        <div className="max-w-[180px] truncate" title={row.original.dropoffLocation}>
          {row.original.dropoffLocation}
        </div>
      ),
    },
    {
      accessorKey: 'finalPrice',
      header: 'Earnings',
      cell: ({ row }) => (
        <span className="font-medium">
          ${row.original.finalPrice?.toFixed(2) || "0.00"}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <RideStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'actions',
      header: '',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/driver/rides/${row.original.id}`}>View</Link>
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data: ridesData?.rides || [],
    columns,
    state: {
      sorting,
      pagination,
    },
    pageCount: ridesData?.totalPages || 0,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  const exportToCsv = () => {
    const csvData = (ridesData?.rides || []).map(ride => ({
      'Reference': ride.referenceNumber,
      'Date': format(new Date(ride.scheduledTime), 'MM/dd/yyyy'),
      'Time': format(new Date(ride.scheduledTime), 'h:mm a'),
      'Pickup': ride.pickupLocation,
      'Dropoff': ride.dropoffLocation,
      'Price': `$${ride.finalPrice?.toFixed(2) || "0.00"}`,
      'Status': ride.status,
      'Vehicle Type': ride.vehicleType,
      'Round Trip': ride.isRoundTrip ? 'Yes' : 'No'
    }));

    return csvData;
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPagination({ ...pagination, pageIndex: 0 });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange({ ...dateRange, [field]: value });
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setSearchTerm('');
    setDateRange({ startDate: '', endDate: '' });
    setPagination({ ...pagination, pageIndex: 0 });
  };

  if (isLoading) {
    return (
      <DriverLayout>
        <LoadingTable />
      </DriverLayout>
    );
  }

  if (error) {
    return (
      <DriverLayout>
        <RetryableError
          title="Could not load ride reports"
          description="We couldn't load your ride history data at this time. Please try again."
          onRetry={refetch}
        />
      </DriverLayout>
    );
  }

  return (
    <DriverLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Ride Reports</h2>
            <p className="text-muted-foreground">
              Detailed history of your rides and earnings
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/driver/analytics">
                <ChevronLeftIcon className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            
            <CSVLink
              data={exportToCsv()}
              filename={`ride-history-${format(new Date(), 'yyyy-MM-dd')}.csv`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
            >
              <FileSpreadsheetIcon className="mr-2 h-4 w-4" />
              Export to CSV
            </CSVLink>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter and search your ride history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="w-full max-w-xs">
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="en_route">En Route</SelectItem>
                    <SelectItem value="arrived">Arrived</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full sm:w-auto">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="date"
                    placeholder="Start Date"
                    className="sm:w-[130px]"
                    value={dateRange.startDate}
                    onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="End Date"
                    className="sm:w-[130px]"
                    value={dateRange.endDate}
                    onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="w-full sm:w-auto sm:flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by reference, location..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
              
              <Button variant="outline" size="icon" onClick={clearFilters} title="Clear filters">
                <FilterIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Ride History</CardTitle>
              <div className="text-sm text-muted-foreground">
                {ridesData?.totalCount || 0} rides found
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
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
                        No rides found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex items-center justify-between py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              Showing{" "}
              <strong>
                {Math.min(
                  pagination.pageIndex * pagination.pageSize + 1,
                  ridesData?.totalCount || 0
                )}
              </strong>{" "}
              to{" "}
              <strong>
                {Math.min(
                  (pagination.pageIndex + 1) * pagination.pageSize,
                  ridesData?.totalCount || 0
                )}
              </strong>{" "}
              of <strong>{ridesData?.totalCount || 0}</strong> rides
            </div>
            <div className="flex items-center space-x-6 lg:space-x-8">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Rows per page</p>
                <Select
                  value={pagination.pageSize.toString()}
                  onValueChange={(value) => {
                    table.setPageSize(Number(value));
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue placeholder={pagination.pageSize} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={pageSize.toString()}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {pagination.pageIndex + 1} of {Math.max(1, ridesData?.totalPages || 1)}
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
      </div>
    </DriverLayout>
  );
};

export default DriverReports;