"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addToPipelineAction } from "@/actions/prospects";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AddToPipelineButton({ siren }: { siren: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const res = await addToPipelineAction(siren);
      if (res.success) {
        toast.success("Ajouté au pipeline");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Button onClick={onClick} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Plus className="mr-2 h-4 w-4" />
      )}
      Ajouter au pipeline
    </Button>
  );
}
