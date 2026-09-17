import { addDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Field, FieldLabel } from "../ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

type DateRangePickerProps = {
  /** 제어 모드 선택 값. onChange와 함께 주면 제어 컴포넌트로 동작합니다. */
  value?: DateRange;
  /** 값 변경 콜백. 주어지면 제어 모드(내부 상태 미사용). */
  onChange?: (range: DateRange | undefined) => void;
  /** 라벨 문구. */
  label?: string;
};

export default function DateRangePicker({
  value,
  onChange,
  label = "기간 선택",
}: DateRangePickerProps = {}) {
  // onChange가 없으면(기존 사용처) 내부 상태로 동작하는 비제어 모드.
  const [internal, setInternal] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 20),
    to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
  });
  const controlled = onChange !== undefined;
  const date = controlled ? value : internal;
  const setDate = controlled ? onChange : setInternal;

  return (
    <Field className="w-56">
      <FieldLabel htmlFor="date-picker-range">{label}</FieldLabel>
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="date-picker-range"
              aria-label="기간 선택"
              className="w-full justify-between gap-2 px-2.5 font-normal"
            >
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "yyyy.MM.dd", { locale: ko })} –{" "}
                  {format(date.to, "yyyy.MM.dd", { locale: ko })}
                </>
              ) : (
                format(date.from, "yyyy.MM.dd", { locale: ko })
              )
            ) : (
              <span>기간 선택</span>
            )}
            <CalendarIcon
              data-icon="inline-end"
              className="text-muted-foreground"
            />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
          numberOfMonths={2}
          locale={ko}
        />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
