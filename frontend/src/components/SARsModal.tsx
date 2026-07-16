import { X, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SarStatusBadge } from "@/components/status-badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SARReport, Company } from "@/types/models";

interface SARsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sars: SARReport[];
  companies: Company[];
  isLoading?: boolean;
}

export function SARsModal({
  isOpen,
  onClose,
  sars,
  companies,
  isLoading,
}: SARsModalProps) {
  if (!isOpen) return null;

  const getCompanyName = (companyId: string) => {
    const company = companies.find((c) => c.id === companyId);
    return company?.legal_name || companyId.slice(0, 8);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div className="flex items-center gap-2">
            <FileText className="size-5" />
            <h2 className="text-xl font-semibold">SARs Awaiting Review</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading SARs...</p>
            </div>
          ) : sars.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No SARs awaiting review.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sars.map((sar) => (
                  <TableRow key={sar.id} className="transition-colors hover:bg-muted/40">
                    <TableCell className="font-mono text-sm">
                      {sar.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getCompanyName(sar.company_id)}
                    </TableCell>
                    <TableCell>
                      <SarStatusBadge status={sar.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground text-right">
                      {new Date(sar.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/sar/${sar.id}`}>
                        <Button size="sm" variant="outline">
                          Review
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-end gap-2">
          <Link to="/reviews">
            <Button variant="default">
              View All SARs
            </Button>
          </Link>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
