"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "../../lib/utils"

const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative flex items-center">
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 dark:focus:ring-gray-600 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 dark:data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-600",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn("flex items-center justify-center text-white")}>
        <Check className="h-3 w-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  </div>
))
Checkbox.displayName = "Checkbox"

export { Checkbox } 