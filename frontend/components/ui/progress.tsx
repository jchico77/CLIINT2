"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"
import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const percentage = value || 0;
  const translateX = 100 - percentage;
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (indicatorRef.current) {
      // Establecer CSS variable sin usar style inline en JSX
      indicatorRef.current.style.setProperty('--progress-translate', `${translateX}%`);
    }
  }, [translateX]);
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        ref={indicatorRef}
        className="h-full w-full flex-1 bg-primary transition-all progress-indicator"
      />
    </ProgressPrimitive.Root>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

