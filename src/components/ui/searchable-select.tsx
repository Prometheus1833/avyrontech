import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
export type SearchOption = {
  value: string;
  label: string;
  description?: string;
  group?: string;
};
/** Local searchable picker: keyboard navigation and focus return use existing Radix/cmdk primitives. */
export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Selectează…",
  emptyLabel,
  disabled = false,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const chosen = options.find((option) => option.value === value);
  const groups = useMemo(
    () => [...new Set(options.map((option) => option.group || ""))],
    [options],
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-required={required}
          disabled={disabled}
          className="min-h-11 w-full min-w-0 justify-between gap-2 rounded-xl border-white/15 bg-white/[.035] px-3 text-left font-normal text-slate-100 hover:border-violet-400/40 hover:bg-violet-500/10"
        >
          <span className="min-w-0 truncate">
            {chosen?.label ||
              (value ? "Selecție indisponibilă" : emptyLabel || placeholder)}
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-violet-300" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[70] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border-white/15 bg-[#10162a] p-1 shadow-2xl"
      >
        <Command className="bg-transparent text-slate-100">
          <CommandInput
            className="text-base sm:text-sm"
            aria-label={`Caută · ${label}`}
            placeholder="Scrie pentru a căuta…"
          />
          <CommandList className="max-h-64 overscroll-contain">
            <CommandEmpty>Niciun rezultat.</CommandEmpty>
            {emptyLabel && (
              <CommandItem
                value={`empty ${emptyLabel}`}
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check
                  className={`mr-2 size-4 ${value ? "opacity-0" : "text-violet-300"}`}
                />
                {emptyLabel}
              </CommandItem>
            )}
            {groups.map((group) => (
              <CommandGroup key={group} heading={group || undefined}>
                {options
                  .filter((option) => (option.group || "") === group)
                  .map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.description || ""} ${option.value}`}
                      onSelect={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className="min-h-11 items-start gap-2 rounded-lg py-2.5"
                    >
                      <Check
                        className={`mt-0.5 size-4 shrink-0 ${value === option.value ? "text-violet-300" : "opacity-0"}`}
                      />
                      <span className="min-w-0">
                        <span className="block break-words text-sm">
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="mt-0.5 block break-words text-xs text-slate-400">
                            {option.description}
                          </span>
                        )}
                      </span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
