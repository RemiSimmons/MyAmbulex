import React, { memo, useMemo, useCallback } from 'react';

/**
 * Collection of optimization helpers for React components
 */

// Type for comparing props
type CompareFn<T> = (prev: T, next: T) => boolean;

/**
 * Creates a memoized component with custom comparison function
 * @param Component The component to memoize
 * @param compareProps Optional custom comparison function for props
 */
export function createMemoComponent<T>(
  Component: React.ComponentType<T>,
  compareProps?: CompareFn<T>
) {
  return memo(Component, compareProps);
}

/**
 * Default shallow compare function for arrays
 */
export function shallowArrayEqual<T>(arrA: T[], arrB: T[]): boolean {
  if (arrA === arrB) return true;
  if (arrA.length !== arrB.length) return false;
  
  return arrA.every((item, index) => item === arrB[index]);
}

/**
 * Default shallow compare function for objects
 */
export function shallowObjectEqual<T extends Record<string, any>>(
  objA: T,
  objB: T
): boolean {
  if (objA === objB) return true;
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    Object.prototype.hasOwnProperty.call(objB, key) && 
    objA[key] === objB[key]
  );
}

/**
 * HOC that wraps a component with optimization techniques
 * @param Component The component to optimize
 * @param options Optimization options
 */
export function withOptimization<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  options: {
    memoize?: boolean;
    compareProps?: CompareFn<T>;
    displayName?: string;
  } = {}
) {
  const { memoize = true, compareProps, displayName } = options;
  
  // Use type assertion to address type incompatibility
  let OptimizedComponent: React.ComponentType<T> = Component;
  
  if (memoize) {
    const MemoizedComponent = memo(Component, compareProps);
    // Use type assertion to ensure type compatibility
    OptimizedComponent = MemoizedComponent as unknown as React.ComponentType<T>;
  }
  
  if (displayName) {
    OptimizedComponent.displayName = displayName;
  }
  
  return OptimizedComponent;
}

/**
 * A memoized list renderer for more efficient list rendering
 */
interface MemoizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
  ListEmptyComponent?: React.ReactNode;
  className?: string;
  itemClassName?: string;
}

// Define the component function first
function MemoizedListComponent<T>({
  items,
  renderItem,
  keyExtractor,
  ListEmptyComponent,
  className = "",
  itemClassName = ""
}: MemoizedListProps<T>) {
  const memoizedItems = useMemo(() => {
    return items.map((item, index) => {
      const key = keyExtractor(item, index);
      return (
        <div key={key} className={itemClassName}>
          {renderItem(item, index)}
        </div>
      );
    });
  }, [items, renderItem, keyExtractor, itemClassName]);
  
  if (items.length === 0 && ListEmptyComponent) {
    return <>{ListEmptyComponent}</>;
  }
  
  return (
    <div className={className}>
      {memoizedItems}
    </div>
  );
}

// Then memoize it
export const MemoizedList = memo(MemoizedListComponent) as typeof MemoizedListComponent;

/**
 * A helper that prevents unnecessary re-renders for static content
 */
interface StaticContentProps {
  children: React.ReactNode;
}

export const StaticContent = memo(({ children }: StaticContentProps) => {
  return <>{children}</>;
});

StaticContent.displayName = 'StaticContent';

/**
 * HOC that memoizes a component and adds display name
 */
export function memoWithName<T>(
  Component: React.ComponentType<T>,
  displayName: string
) {
  const MemoizedComponent = memo(Component);
  MemoizedComponent.displayName = displayName;
  return MemoizedComponent;
}