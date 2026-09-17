import { InfoIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CAPA_VERDICT_NAME,
  type Nonconformity,
} from "../../nonconformity-management/queries";

/** 라벨 + 값 한 칸. 값이 비면 "-"로 대체합니다. */
function InfoField({
  label,
  labelExtra,
  children,
}: {
  label: string;
  /** 라벨 옆 부가 요소(예: 안내 아이콘). */
  labelExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span>{label}</span>
        {labelExtra}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

/**
 * 부적합 상세 상단의 "부적합 정보" 아코디언.
 * 부적합 목록에서 진입했을 때 PDF 뷰어 위에 노출합니다.
 * CAPA 판정 전에는 "미판정"으로, 판정 후에는 결과·사유를 함께 보여줍니다.
 */
export default function NonconformityInfo({
  nonconformity,
}: {
  nonconformity: Nonconformity;
}) {
  const judged = Boolean(nonconformity.capaVerdict);

  return (
    <Accordion
      // 기본 펼침. 부적합 정보를 먼저 보여 준 뒤 접을 수 있게 합니다.
      defaultValue={["nonconformity-info"]}
      className="shrink-0 rounded-lg border bg-card px-4"
    >
      <AccordionItem value="nonconformity-info" className="border-b-0">
        <AccordionTrigger>부적합 정보</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoField label="부적합 번호">
              {nonconformity.ncNumber}
            </InfoField>
            <InfoField label="이벤트 번호">
              {nonconformity.event.eventNumber}
            </InfoField>

            <InfoField label="판정자">{nonconformity.confirmedBy}</InfoField>
            <InfoField label="판정일시">
              {nonconformity.confirmedAtLabel}
            </InfoField>

            <InfoField
              label="CAPA 판정"
              labelExtra={
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          aria-label="CAPA 판정 안내"
                          className="flex items-center text-muted-foreground/70 hover:text-muted-foreground"
                        />
                      }
                    >
                      <InfoIcon className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent>
                      부적합에 대한 시정·예방조치(CAPA) 필요 여부 판정입니다.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              }
            >
              {judged ? (
                <Badge
                  variant={
                    nonconformity.capaVerdict === "required"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {CAPA_VERDICT_NAME[nonconformity.capaVerdict!]}
                </Badge>
              ) : (
                <Badge variant="outline">미판정</Badge>
              )}
            </InfoField>
            <InfoField label="CAPA 판정 사유">
              {judged ? (
                <span className="whitespace-pre-line">
                  {nonconformity.capaReason?.trim() || "-"}
                </span>
              ) : (
                "-"
              )}
            </InfoField>

            <div className="sm:col-span-2">
              <InfoField label="부적합 사유">
                <span className="whitespace-pre-line">
                  {nonconformity.reason?.trim() || "-"}
                </span>
              </InfoField>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
