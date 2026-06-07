import { cn } from "@/lib/utils";

interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function NeoCard({ className, hover = false, children, ...props }: NeoCardProps) {
  return (
    <div
      className={cn(
        "neo-card",
        hover && "neo-card-hover cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
