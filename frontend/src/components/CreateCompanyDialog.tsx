import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCompany } from "@/hooks/useCompanies";
import type { Company } from "@/types/models";

export function CreateCompanyDialog({
  onCreated,
}: {
  onCreated?: (company: Company) => void;
}) {
  const [open, setOpen] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [industry, setIndustry] = useState("");

  const createCompany = useCreateCompany();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim()) return;

    createCompany.mutate(
      {
        legal_name: legalName,
        jurisdiction: jurisdiction || undefined,
        industry: industry || undefined,
      },
      {
        onSuccess: (company: Company) => {
          setOpen(false);
          setLegalName("");
          setJurisdiction("");
          setIndustry("");
          onCreated?.(company);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="shrink-0 gap-1.5" />}>
        <Plus className="size-4" />
        Add Company
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Company</DialogTitle>
          <DialogDescription>
            For entities not present in the sanctions dataset. The company is
            onboarded and screened immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="legalName">Legal Name *</Label>
            <Input
              id="legalName"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jurisdiction">Jurisdiction (Optional)</Label>
            <Input
              id="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g. United States"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry (Optional)</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Technology"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={!legalName.trim() || createCompany.isPending}
            >
              {createCompany.isPending ? "Adding..." : "Add & Onboard"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
