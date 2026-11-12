import { useId, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { ro } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import type { DayContentProps } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { bucharestDay } from "@/shared/futureLeads";

function ContactCalendarDay({ date }: DayContentProps) {
  return (
    <>
      <span aria-hidden="true">{date.getDate()}</span>
      <span className="sr-only">{format(date, "d MMMM yyyy", { locale: ro })}</span>
    </>
  );
}

export default function ContactDateField({
  value,
  originalDate,
  disabled,
  onChange,
}: {
  value: string;
  originalDate?: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const calendarId = useId();
  const hintId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const today = bucharestDay();
  const selected = value ? parseISO(value) : undefined;
  const min = value === originalDate && value < today ? value : today;

  return (
    <div className="grid gap-2 rounded-xl border border-primary/25 bg-primary/5 p-3">
      <label htmlFor={inputId} className="text-sm font-semibold">
        Data contactării / inițierii *
      </label>
      <div className="grid items-center gap-2 min-[480px]:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          id={inputId}
          type="date"
          value={value}
          min={min}
          max="2099-12-31"
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={hintId}
          className="min-w-0"
          required
        />
        {!disabled && (
          <Button
            ref={toggle}
            type="button"
            variant="outline"
            aria-controls={open ? calendarId : undefined}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="gap-2"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            {open ? "Închide calendarul" : "Alege din calendar"}
          </Button>
        )}
      </div>
      <p id={hintId} className="text-xs text-muted-foreground">
        Alege ziua contactării sau a începerii proiectului.
      </p>
      {open && !disabled && (
        <div id={calendarId} className="rounded-lg border bg-background p-1">
          <Calendar
            mode="single"
            required
            locale={ro}
            today={parseISO(today)}
            selected={selected}
            defaultMonth={selected ?? parseISO(today)}
            fromDate={parseISO(min)}
            toDate={parseISO("2099-12-31")}
            disabled={(day) => {
              const key = format(day, "yyyy-MM-dd");
              return key < today && key !== originalDate;
            }}
            onSelect={(day) => {
              if (!day) return;
              onChange(format(day, "yyyy-MM-dd"));
              setOpen(false);
              toggle.current?.focus();
            }}
            labels={{
              labelPrevious: () => "Luna anterioară",
              labelNext: () => "Luna următoare",
            }}
            components={{ DayContent: ContactCalendarDay }}
            initialFocus
            showOutsideDays={false}
            className="mx-auto w-fit max-w-full p-0"
            classNames={{
              head_cell: "w-8 text-center text-xs text-muted-foreground",
              cell: "relative size-8 p-0 text-center",
              day: "size-8 rounded-md p-0 text-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
            }}
          />
        </div>
      )}
    </div>
  );
}
