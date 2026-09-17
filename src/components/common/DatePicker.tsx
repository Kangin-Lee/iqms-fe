import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
};

/** 단일 날짜 선택기. RHF Controller의 field(value/onChange)와 바로 연결해 씁니다. */
export default function DatePicker({
  value,
  onChange,
  placeholder = "날짜 선택",
  id,
  disabled,
  invalid,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            id={id}
            disabled={disabled}
            aria-invalid={invalid}
            className={cn(
              "w-full justify-between gap-2 px-2.5 font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          >
            {value ? (
              format(value, "yyyy.MM.dd", { locale: ko })
            ) : (
              <span>{placeholder}</span>
            )}
            <CalendarIcon className="text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          defaultMonth={value}
          locale={ko}
        />
      </PopoverContent>
    </Popover>
  );
}
