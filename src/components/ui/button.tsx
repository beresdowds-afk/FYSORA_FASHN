import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-[2px] active:shadow-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_4px_0_0_hsl(43,65%,38%),0_6px_12px_-2px_hsl(43,65%,52%,0.3)] hover:shadow-[0_3px_0_0_hsl(43,65%,38%),0_4px_8px_-2px_hsl(43,65%,52%,0.3)] hover:translate-y-[1px]",
        destructive: "bg-destructive text-destructive-foreground shadow-[0_4px_0_0_hsl(5,75%,35%),0_6px_12px_-2px_hsl(5,75%,49%,0.3)] hover:shadow-[0_3px_0_0_hsl(5,75%,35%),0_4px_8px_-2px_hsl(5,75%,49%,0.3)] hover:translate-y-[1px]",
        outline: "border border-input bg-background shadow-[0_3px_0_0_hsl(36,20%,75%),0_4px_8px_-2px_hsl(0,0%,0%,0.08)] hover:bg-accent hover:text-accent-foreground hover:shadow-[0_2px_0_0_hsl(36,20%,75%),0_3px_6px_-2px_hsl(0,0%,0%,0.08)] hover:translate-y-[1px]",
        secondary: "bg-secondary text-secondary-foreground shadow-[0_4px_0_0_hsl(152,100%,18%),0_6px_12px_-2px_hsl(152,100%,26%,0.3)] hover:shadow-[0_3px_0_0_hsl(152,100%,18%),0_4px_8px_-2px_hsl(152,100%,26%,0.3)] hover:translate-y-[1px]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-brand text-primary-foreground font-heading font-semibold shadow-[0_5px_0_0_hsl(152,100%,18%),0_8px_20px_-4px_hsl(43,65%,52%,0.35)] hover:shadow-[0_3px_0_0_hsl(152,100%,18%),0_6px_14px_-4px_hsl(43,65%,52%,0.35)] hover:translate-y-[2px] hover:scale-[1.02] transition-all duration-200",
        heroOutline: "border-2 border-primary text-primary shadow-[0_4px_0_0_hsl(43,65%,38%,0.4),0_6px_12px_-2px_hsl(43,65%,52%,0.15)] hover:bg-primary hover:text-primary-foreground font-heading font-semibold hover:shadow-[0_3px_0_0_hsl(43,65%,38%,0.4),0_4px_8px_-2px_hsl(43,65%,52%,0.15)] hover:translate-y-[1px] transition-all duration-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
