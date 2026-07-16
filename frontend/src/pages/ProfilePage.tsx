import { Mail, ShieldCheck, UserRound } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ErrorState } from "@/components/ErrorState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/useAuth";
import { userInitials } from "@/lib/utils";

export function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Profile" description="Your account details." />

      <Card>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="size-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ) : isError || !user ? (
            <ErrorState message="Could not load your profile." onRetry={() => refetch()} />
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="size-16">
                  <AvatarFallback className="text-lg">
                    {userInitials(user.full_name || user.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {user.full_name || "—"}
                  </p>
                  {user.role ? (
                    <Badge variant="outline" className="mt-1 capitalize">
                      {user.role}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <Separator />

              <dl className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Email</dt>
                    <dd className="text-sm font-medium text-foreground">{user.email}</dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserRound className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Role</dt>
                    <dd className="text-sm font-medium capitalize text-foreground">
                      {user.role || "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-4 shrink-0 text-muted-foreground" />
                  <div>
                    <dt className="text-xs text-muted-foreground">Status</dt>
                    <dd className="text-sm font-medium text-foreground">
                      {user.is_active === undefined ? "—" : user.is_active ? "Active" : "Inactive"}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
