import { CalendarIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** yyyy-MM → yyyy.MM 표시. */
const fmt = (m: string) => m.replace("-", ".");

type MonthRangePickerProps = {
  /** 선택 가능한 월 목록(yyyy-MM, 오름차순). */
  options: string[];
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
};

/**
 * 월 단위 기간 선택기.
 * 시작/종료 월 셀렉트를 각각 별도 박스로 두고, 폭은 내용에 맞춰(w-fit) 잘리지 않게 합니다.
 */
export default function MonthRangePicker({
  options,
  start,
  end,
  onChange,
}: MonthRangePickerProps) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      <Select value={start} onValueChange={(v) => onChange(v, end)}>
        <SelectTrigger aria-label="시작 월" className="h-8 w-fit bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((m) => (
              <SelectItem key={m} value={m} disabled={m > end}>
                {fmt(m)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <span className="shrink-0 text-muted-foreground">~</span>
      <Select value={end} onValueChange={(v) => onChange(start, v)}>
        <SelectTrigger aria-label="종료 월" className="h-8 w-fit bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((m) => (
              <SelectItem key={m} value={m} disabled={m < start}>
                {fmt(m)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
