import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { cn, userInitials } from "@/lib/utils";

interface UserMenuProps {
  variant?: "full" | "compact";
}

export function UserMenu({ variant = "full" }: UserMenuProps) {
  const navigate = useNavigate();
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();

  async function handleLogout() {
    await logout.mutateAsync().catch(() => undefined);
    navigate("/login");
  }

  const displayName = user?.full_name || user?.email || "Account";
  const displayRole = user?.role ?? "";

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5",
          variant === "full" && "w-full rounded-lg px-2 py-1.5"
        )}
      >
        <Skeleton className="size-8 shrink-0 rounded-full" />
        {variant === "full" ? (
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-muted",
          variant === "full" ? "w-full px-2 py-1.5" : "p-0.5"
        )}
      >
        <Avatar>
          <AvatarFallback>{user ? userInitials(displayName) : <UserIcon className="size-4" />}</AvatarFallback>
        </Avatar>
        {variant === "full" ? (
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            {displayRole ? (
              <p className="truncate text-xs capitalize text-muted-foreground">{displayRole}</p>
            ) : null}
          </div>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
          {user?.email ? (
            <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <UserIcon />
          View profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
