import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, SaveIcon } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { currentUser } from "@/mock/currentUser";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  findQualityEvent,
  qualityEventKeys,
  saveQualityEvent,
  type QualityEvent,
} from "../queries";
import BasicInfoCard from "./components/BasicInfoCard";
import EventContentCard from "./components/EventContentCard";
import ImpactCard from "./components/ImpactCard";
import ReceiptCard from "./components/ReceiptCard";
import { registerSchema, type RegisterValues } from "./schema";

/** 저장 코드 심각도 → 등록 폼 심각도. */
const CODE_TO_SEVERITY: Record<string, string> = {
  HIGH: "중대",
  MEDIUM: "보통",
  LOW: "경미",
};

/** 신규 등록 기본값. */
function emptyDefaults(): RegisterValues {
  return {
    discoveryDate: new Date(),
    occurrenceDate: new Date(),
    title: "",
    eventType: "",
    registrant: currentUser.name,
    registrationDepartment: currentUser.department,
    description: "",
    relatedProject: "",
    relatedProduct: "",
    relatedProcess: "",
    attachments: [],
    businessImpact: "없음",
    severity: "경미",
    immediateActionRequired: "아니오",
    reviewers: [],
    registrationComment: "",
  };
}

/** 수정 대상 이벤트를 폼 값으로 변환합니다(첨부는 복원 불가라 비웁니다). */
function toDefaults(event: QualityEvent): RegisterValues {
  return {
    discoveryDate: new Date(event.discoveryDate),
    occurrenceDate: new Date(event.occurrenceDate),
    title: event.title,
    eventType: event.eventType,
    registrant: event.registrant.userName,
    registrationDepartment: event.registrationDepartment,
    description: event.description,
    relatedProject: event.relatedProject,
    relatedProduct: event.relatedProduct,
    relatedProcess: event.relatedProcess,
    attachments: [],
    businessImpact: event.businessImpact,
    severity: CODE_TO_SEVERITY[event.severity] ?? event.severity,
    immediateActionRequired: event.immediateActionRequired,
    reviewers: event.reviewers.map((r) => r.id),
    registrationComment: event.registrationComment,
  };
}

export default function QualityEventRegister() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  // 수정 모드: 작성중(status 1) 이벤트만 편집할 수 있습니다.
  const editId = id ? Number(id) : undefined;
  const editEvent = editId != null ? findQualityEvent(editId) : undefined;
  const isEditable = editEvent != null && editEvent.status === 1;

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues:
      editId != null && isEditable && editEvent
        ? toDefaults(editEvent)
        : emptyDefaults(),
  });

  // 잘못된 수정 진입(없는 이벤트 / 작성중이 아님)은 목록으로 돌려보냅니다.
  if (editId != null && !isEditable) {
    toast.add({
      title: "수정할 수 없습니다",
      description: "작성중 상태의 이벤트만 수정할 수 있습니다.",
      type: "error",
    });
    navigate("/quality-events/list", { replace: true });
    return null;
  }

  function persist(status: number) {
    const event = saveQualityEvent(form.getValues(), status, editId);
    queryClient.invalidateQueries({ queryKey: qualityEventKeys.all });
    return event;
  }

  // 임시저장: 검증 없이 작성중(status 1)으로 저장합니다.
  function handleDraftSave() {
    persist(1);
    toast.add({
      title: "임시저장",
      description: "작성중 상태로 저장했습니다. 목록에서 이어서 수정할 수 있습니다.",
      type: "success",
    });
    navigate("/quality-events/my");
  }

  // 최종 등록: 전체 검증 후 검토중(status 2)으로 저장합니다.
  function onRegister() {
    const event = persist(2);
    toast.add({
      title: editId != null ? "등록 완료" : "등록 완료",
      description: "품질 이벤트를 등록했습니다.",
      type: "success",
    });
    navigate(`/quality-events/detail/${event.id}`);
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onRegister)}
        noValidate
        className="mx-auto flex w-full max-w-4xl flex-col gap-4"
      >
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {editId != null ? "품질 이벤트 수정" : "품질 이벤트 등록"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {editId != null
              ? "작성중인 품질 이벤트를 이어서 작성합니다."
              : "새로운 품질 이벤트를 등록합니다. 임시저장하면 작성중 상태로 보관됩니다."}
          </p>
        </div>

        {/* 기본 정보 */}
        <BasicInfoCard />

        {/* 이벤트 내용 */}
        <EventContentCard />

        {/* 초기 영향 판단 */}
        <ImpactCard />

        {/* 접수 처리 */}
        <ReceiptCard />

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
            뒤로가기
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleDraftSave}>
              <SaveIcon />
              임시저장
            </Button>
            <Button type="submit">등록</Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
