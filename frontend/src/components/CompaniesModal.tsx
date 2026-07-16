import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Company } from "@/types/models";

interface CompaniesModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Company[];
  title: string;
  isLoading?: boolean;
}

export function CompaniesModal({
  isOpen,
  onClose,
  companies,
  title,
  isLoading,
}: CompaniesModalProps) {
  if (!isOpen) return null;

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "escalated":
        return "text-red-600";
      case "review":
        return "text-yellow-600";
      case "monitored":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-xl font-semibold">{title}</h2>
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
              <p className="text-muted-foreground">Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No companies found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      {company.legal_name}
                    </TableCell>
                    <TableCell>{company.jurisdiction || "N/A"}</TableCell>
                    <TableCell>
                      <Badge className={getRiskColor(company.risk_level)}>
                        {company.risk_level.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-medium ${getStatusColor(company.monitoring_status)}`}>
                        {company.monitoring_status.replace("_", " ").toUpperCase()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
