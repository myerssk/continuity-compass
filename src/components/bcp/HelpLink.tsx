import { Link } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HelpLink({ topic, label = "Learn more" }: { topic: string; label?: string }) {
  return <Button asChild variant="ghost" size="sm"><Link to="/help/$topic" params={{ topic }}><CircleHelp aria-hidden="true" />{label}</Link></Button>;
}