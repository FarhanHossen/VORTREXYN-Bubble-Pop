import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Badges never wrap to a second line (whitespace-nowrap).
  // hover-elevate handles hover state via a shared utility class.
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          // Uses shadow-xs (lighter than default shadow); hover handled by hover-elevate
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          // No shadow — hover handled by hover-elevate
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          // Uses shadow-xs (lighter than default shadow); hover handled by hover-elevate
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
        // Outlined variant — uses the badge-outline CSS variable for border color
        outline: "text-foreground border [border-color:var(--badge-outline)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
