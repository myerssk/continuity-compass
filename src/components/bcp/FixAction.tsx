import { Link } from "@tanstack/react-router";
import { ArrowRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FixAction as Fix } from "@/lib/bcp/actions";
import { useDb } from "@/lib/bcp/store";
import { EntityForm } from "./EntityForm";

/** Edit actions open the exact record's focused edit in place; others go to the record's relevant tab. */
export function FixAction({ fix, size = "sm" }: { fix: Fix; size?: "sm" | "xs" }) {
  const db = useDb();
  const rec = db[fix.table].find((r) => r.id === fix.id);
  const cls = size === "xs" ? "h-6 px-2 text-[11px]" : "h-7 px-2.5 text-xs";
  if (fix.edit?.length && rec)
    return <EntityForm table={fix.table} record={rec} focus={fix.edit} trigger={<Button size="sm" variant="teal" className={cls} data-fix={fix.label}><Pencil className="h-3 w-3" />{fix.label}</Button>} />;
  return (
    <Button asChild size="sm" variant="outline" className={cls}>
      <Link to="/$type/$id" params={{ type: fix.table, id: fix.id }} search={{ tab: fix.tab }} data-fix={fix.label}>{fix.label}<ArrowRight className="h-3 w-3" /></Link>
    </Button>
  );
}