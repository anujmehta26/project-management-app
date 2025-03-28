'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'

export function DatePicker({
  selected,
  onSelect,
  disabled,
  className,
  placeholderText = "Pick a date",
  ...props
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, 'PPP') : placeholderText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          initialFocus
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
} 