"use client";

import { useMemo, useState } from "react";
import nafCodes from "@/lib/naf-codes.json";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NafCode {
  code: string;
  libelle: string;
}

const CODES: NafCode[] = nafCodes as NafCode[];

// Normalise : sans accents, minuscule — pour le matching fuzzy
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface Props {
  value: string[];
  onChange: (codes: string[]) => void;
  placeholder?: string;
  maxSelected?: number;
}

export function NafSelector({
  value,
  onChange,
  placeholder = "Choisir un ou plusieurs codes NAF...",
  maxSelected = 10,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedCodes = useMemo(() => {
    return CODES.filter((c) => value.includes(c.code));
  }, [value]);

  const filtered = useMemo(() => {
    if (!search.trim()) return CODES.slice(0, 100);
    const q = normalize(search);
    const scored = CODES.map((c) => {
      const libN = normalize(c.libelle);
      const codeN = c.code.toLowerCase();
      // Prio: exact code match → libellé commence par q → libellé contient q
      if (codeN.startsWith(q)) return { c, score: 0 };
      if (libN.startsWith(q)) return { c, score: 1 };
      if (libN.includes(q)) return { c, score: 2 };
      if (codeN.includes(q)) return { c, score: 3 };
      return null;
    }).filter((x): x is { c: NafCode; score: number } => x !== null);
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 50).map((x) => x.c);
  }, [search]);

  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
    } else if (value.length < maxSelected) {
      onChange([...value, code]);
    }
  };

  const remove = (code: string) => {
    onChange(value.filter((c) => c !== code));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full justify-between text-left font-normal"
            >
              <span className={cn("truncate", value.length === 0 && "text-muted-foreground")}>
                {value.length === 0
                  ? placeholder
                  : `${value.length} code${value.length > 1 ? "s" : ""} NAF sélectionné${value.length > 1 ? "s" : ""}`}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          }
        />
        <PopoverContent className="w-[28rem] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Rechercher par libellé ou code..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>Aucun code NAF trouvé.</CommandEmpty>
              <CommandGroup>
                {filtered.map((c) => {
                  const isSel = value.includes(c.code);
                  return (
                    <CommandItem
                      key={c.code}
                      value={c.code}
                      onSelect={() => toggle(c.code)}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSel ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
                        {c.code}
                      </span>
                      <span className="truncate text-sm">{c.libelle}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedCodes.map((c) => (
            <Badge
              key={c.code}
              variant="secondary"
              className="gap-1 pr-1 font-normal"
            >
              <span className="font-mono text-[10px]">{c.code}</span>
              <span className="max-w-[12rem] truncate text-[11px]">
                {c.libelle}
              </span>
              <button
                type="button"
                onClick={() => remove(c.code)}
                className="ml-0.5 rounded p-0.5 hover:bg-background/50"
                aria-label={`Retirer ${c.code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Export helper pour afficher un libellé depuis un code
export function getNafLabel(code: string | null | undefined): string {
  if (!code) return "—";
  const found = CODES.find((c) => c.code === code || c.code.replace(".", "") === code.replace(".", ""));
  return found ? `${found.code} — ${found.libelle}` : code;
}
