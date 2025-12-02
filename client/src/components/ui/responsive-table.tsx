import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ChevronDown, 
  ChevronRight, 
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableColumn {
  key: string;
  label: string;
  render?: (value: any, item: any) => React.ReactNode;
  sortable?: boolean;
  className?: string;
  hideOnMobile?: boolean;
}

interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (item: any) => void;
  variant?: 'default' | 'outline' | 'destructive';
  showInMobile?: boolean;
}

interface ResponsiveTableProps {
  data: any[];
  columns: TableColumn[];
  actions?: TableAction[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
}

export function ResponsiveTable({
  data,
  columns,
  actions,
  loading = false,
  emptyMessage = "No data available",
  className,
  mobileBreakpoint = 'md'
}: ResponsiveTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const mobileBreakpointClass = {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden'
  }[mobileBreakpoint];

  const desktopBreakpointClass = {
    sm: 'hidden sm:table',
    md: 'hidden md:table',
    lg: 'hidden lg:table'
  }[mobileBreakpoint];

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <p className="text-gray-500">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className={cn(desktopBreakpointClass, className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key} 
                  className={cn(
                    column.className,
                    column.hideOnMobile && `${mobileBreakpointClass}`
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
              {actions && actions.length > 0 && (
                <TableHead className="w-24">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow key={index} className="hover:bg-gray-50/50">
                {columns.map((column) => (
                  <TableCell 
                    key={column.key}
                    className={cn(
                      column.className,
                      column.hideOnMobile && `${mobileBreakpointClass}`
                    )}
                  >
                    {column.render 
                      ? column.render(item[column.key], item)
                      : item[column.key]
                    }
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {actions.slice(0, 2).map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          variant={action.variant || 'outline'}
                          size="sm"
                          onClick={() => action.onClick(item)}
                          className="h-8 w-8 p-0"
                        >
                          {action.icon || <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      ))}
                      {actions.length > 2 && (
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className={cn(mobileBreakpointClass, "space-y-3", className)}>
        {data.map((item, index) => {
          const isExpanded = expandedRows.has(index);
          const primaryColumn = columns.find(col => !col.hideOnMobile) || columns[0];
          const secondaryColumns = columns.filter(col => col.key !== primaryColumn.key);
          
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {/* Primary Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start space-x-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 break-words">
                          {primaryColumn.render 
                            ? primaryColumn.render(item[primaryColumn.key], item)
                            : item[primaryColumn.key]
                          }
                        </p>
                      </div>
                      {secondaryColumns.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpansion(index)}
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    
                    {/* Show first few important fields */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {secondaryColumns.slice(0, 2).map((column) => {
                        const value = item[column.key];
                        if (!value) return null;
                        
                        return (
                          <span key={column.key} className="text-sm text-gray-600 break-words">
                            {column.render ? column.render(value, item) : value}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  {actions && actions.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 sm:gap-2 flex-shrink-0">
                      {actions.filter(action => action.showInMobile !== false).slice(0, 2).map((action, actionIndex) => (
                        <Button
                          key={actionIndex}
                          variant={action.variant || 'outline'}
                          size="sm"
                          onClick={() => action.onClick(item)}
                          className="h-8 w-8 sm:w-auto sm:px-3 p-0 sm:p-2"
                        >
                          {action.icon || <MoreHorizontal className="h-4 w-4" />}
                          <span className="sr-only sm:not-sr-only sm:ml-2">{action.label}</span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded Content */}
                {isExpanded && secondaryColumns.length > 0 && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    {secondaryColumns.slice(2).map((column) => {
                      const value = item[column.key];
                      if (!value) return null;
                      
                      return (
                        <div key={column.key} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            {column.label}:
                          </span>
                          <span className="text-sm text-gray-900">
                            {column.render ? column.render(value, item) : value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

export default ResponsiveTable;