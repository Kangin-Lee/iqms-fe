import { SearchIcon } from "lucide-react";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type SearchBarProps = {
  value?: string;
  onChange?: (value: string) => void;
  /** Enter 입력 시 호출 */
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
};

export default function SearchBar({
  value,
  onChange,
  onEnter,
  placeholder = "검색어를 입력해주세요.",
  className,
}: SearchBarProps) {
  return (
    <Field className={cn("w-56", className)}>
      <FieldLabel htmlFor="search-input">검색</FieldLabel>
      <InputGroup className="bg-card">
        <InputGroupInput
          id="search-input"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter?.();
          }}
        />
        <InputGroupAddon align="inline-end">
          <SearchIcon className="text-muted-foreground" />
        </InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
