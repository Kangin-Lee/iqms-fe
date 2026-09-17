import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  Loader2Icon,
  SaveIcon,
  SparklesIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { currentUser } from "@/mock/currentUser";
import { geminiAssessChangeImpact } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  changeRequestKeys,
  changeRequestToValues,
  getChangeRequestById,
  saveChangeRequest,
  updateChangeRequest,
  type ChangeReviewOpinion,
} from "../queries";
import AiReviewPanel from "./components/AiReviewPanel";
import ApplyPlanCard from "./components/ApplyPlanCard";
import ApprovalCard from "./components/ApprovalCard";
import BasicInfoCard from "./components/BasicInfoCard";
import ContentCard from "./components/ContentCard";
import ImpactCard from "./components/ImpactCard";
import TargetCard from "./components/TargetCard";
import VerifyPlanCard from "./components/VerifyPlanCard";
import { changeRequestSchema, type ChangeRequestValues } from "./schema";

function emptyDefaults(): ChangeRequestValues {
  return {
    title: "",
    changeType: "",
    grade: "normal",
    requestDate: new Date(),
    requestedApplyDate: new Date(),
    requester: currentUser.name,
    requestDepartment: currentUser.department,
    targetType: "",
    targetItem: "",
    currentRevision: "",
    targetRevision: "",
    relatedProject: "",
    relatedProduct: "",
    relatedProcess: "",
    asIs: "",
    toBe: "",
    reason: "",
    linkedRef: "",
    impactScope: [],
    qualityImpact: "낮음",
    scheduleImpact: "낮음",
    costImpact: "낮음",
    revalidationRequired: "아니오",
    customerApprovalRequired: "아니오",
    urgent: "아니오",
    rollbackPlan: "",
    // 적용 계획
    applyAssignee: "",
    applyDate: new Date(),
    applyMethod: "",
    rollbackNeeded: "불필요",
    deployNeeded: "불필요",
    applyNote: "",
    // 검증 계획
    verifyAssignee: "",
    verifyDate: new Date(),
    verifyMethod: "",
    verifyCriteria: "",
    verifyEvidenceNeeded: "불필요",
    reviewers: [],
    approvers: [],
    requestComment: "",
  };
}

export default function ChangeRequestRegister() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  // 수정 모드: URL에 id가 있으면 해당 레코드를 불러와 편집합니다.
  const editId = id ? Number(id) : undefined;
  const isEdit = editId != null && Number.isFinite(editId);
  const [opinion, setOpinion] = useState<ChangeReviewOpinion | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // 화면을 벗어나면 진행 중인 AI 요청을 취소합니다.
  useEffect(() => () => abortRef.current?.abort(), []);

  const form = useForm<ChangeRequestValues>({
    resolver: zodResolver(changeRequestSchema),
    mode: "onTouched",
    defaultValues: emptyDefaults(),
  });

  // 수정 모드 진입 시 기존 값으로 폼을 채웁니다(최초 1회).
  const { reset } = form;
  useEffect(() => {
    if (!isEdit || editId == null) return;
    const record = getChangeRequestById(editId);
    if (record) reset(changeRequestToValues(record));
  }, [isEdit, editId, reset]);

  function persist(status: number) {
    const values = form.getValues();
    const cr =
      isEdit && editId != null
        ? updateChangeRequest(editId, values, status)
        : saveChangeRequest(values, status);
    queryClient.invalidateQueries({ queryKey: changeRequestKeys.all });
    return cr;
  }

  // 임시저장: 검증 없이 작성중(status 1)으로 저장합니다.
  function handleDraftSave() {
    persist(1);
    toast.add({
      title: "임시저장",
      description: "작성중 상태로 저장했습니다.",
      type: "success",
    });
    navigate("/configuration-changes/list");
  }

  // AI 검토 요청: 현재 입력값을 Gemini로 분석합니다(실패 시 규칙 기반 폴백).
  async function handleAiReview() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setReviewing(true);
    try {
      const result = await geminiAssessChangeImpact(
        form.getValues(),
        controller.signal
      );
      if (!controller.signal.aborted) setOpinion(result);
    } catch {
      // 취소 등으로 실패해도 조용히 무시합니다(폴백은 함수 내부에서 처리).
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setReviewing(false);
      }
    }
  }

  // 최종 등록: 전체 검증 후 검토중(status 2)으로 저장합니다.
  function onRegister() {
    persist(2);
    toast.add({
      title: isEdit ? "수정 완료" : "등록 완료",
      description: isEdit
        ? "형상변경요청을 수정했습니다."
        : "형상변경요청을 등록했습니다.",
      type: "success",
    });
    navigate(
      isEdit && editId != null
        ? `/configuration-changes/detail/${editId}`
        : "/configuration-changes/list"
    );
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
            {isEdit ? "형상변경요청 수정" : "형상변경요청 등록"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            형상 항목의 변경을 요청합니다. 등록 전 AI 검토 소견으로 누락·리스크를
            점검할 수 있습니다.
          </p>
        </div>

        <BasicInfoCard />
        <TargetCard />
        <ContentCard />
        <ImpactCard />
        <ApplyPlanCard />
        <VerifyPlanCard />
        <ApprovalCard />

        {/* AI 검토 소견 */}
        {opinion && <AiReviewPanel opinion={opinion} />}

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
            뒤로가기
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleAiReview}
              disabled={reviewing}
            >
              {reviewing ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SparklesIcon />
              )}
              {reviewing ? "분석 중…" : "AI 검토 요청"}
            </Button>
            <Button type="button" variant="outline" onClick={handleDraftSave}>
              <SaveIcon />
              임시저장
            </Button>
            <Button type="submit">{isEdit ? "수정" : "등록"}</Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
