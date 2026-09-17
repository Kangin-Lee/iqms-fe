import type { ReactNode } from "react";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { Nonconformity } from "../../../nonconformity-management/queries";
import { NONCONFORMITY_STATUS_NAME } from "../../../nonconformity-management/queries";
import {
  CAPA_ACTION_PRIORITY_NAME,
  CAPA_ACTION_STATUS_NAME,
  CAPA_PLAN_TYPE_NAME,
  CAPA_STATUS_NAME,
  EFFECTIVENESS_RESULT_NAME,
  RCA_METHOD_NAME,
  type CapaPlan,
  type CapaStatus,
} from "../../queries";

// @react-pdf 기본 폰트는 한글을 렌더하지 못하므로 한글 폰트 등록(같은 출처 로컬 폰트).
Font.register({
  family: "NanumGothic",
  fonts: [
    { src: "/fonts/NanumGothic-Regular.ttf" },
    { src: "/fonts/NanumGothic-Bold.ttf", fontWeight: "bold" },
  ],
});

const EVENT_TYPE_LABEL: Record<string, string> = {
  INTERNAL_ISSUE: "내부 이슈",
  PROCESS_DEVIATION: "프로세스 이탈",
  AUDIT_ISSUE: "심사 이슈",
  PRODUCT_SERVICE_DEFECT: "제품/서비스 결함",
  SUPPLIER_ISSUE: "공급업체 이슈",
  CUSTOMER_COMPLAINT: "고객 불만",
  IMPROVEMENT_OPPORTUNITY: "개선 기회",
  ETC: "기타",
};
const SEVERITY_LABEL: Record<string, string> = {
  HIGH: "높음",
  MEDIUM: "보통",
  LOW: "낮음",
};

/** 상태 배지 색상(화면 배지와 유사한 톤). */
const STATUS_COLORS: Record<CapaStatus, { bg: string; color: string }> = {
  root_cause_pending: { bg: "#fef3c7", color: "#b45309" },
  root_cause_done: { bg: "#ecfccb", color: "#4d7c0f" },
  in_action: { bg: "#dbeafe", color: "#1d4ed8" },
  effectiveness_pending: { bg: "#fee2e2", color: "#b91c1c" },
  effectiveness_ongoing: { bg: "#ede9fe", color: "#6d28d9" },
  effectiveness_done: { bg: "#ccfbf1", color: "#0f766e" },
  closed: { bg: "#dcfce7", color: "#15803d" },
  cancelled: { bg: "#f4f4f5", color: "#71717a" },
};

const ACCENT = "#3a5ba0";
const BORDER = "#e3e5ea";
const LABEL_BG = "#eef0f6";
const LABEL_COLOR = "#6b7280";

const styles = StyleSheet.create({
  page: {
    fontFamily: "NanumGothic",
    fontSize: 9.5,
    color: "#2b2f36",
    paddingHorizontal: 36,
    paddingVertical: 32,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1c1f24",
    lineHeight: 1.1,
  },
  reportSubtitle: { fontSize: 9, color: "#9aa0aa", marginTop: 6, lineHeight: 1 },
  headerRight: { alignItems: "flex-end" },
  capaNumber: { fontSize: 10, color: "#4b5563", marginBottom: 5 },
  divider: {
    marginTop: 12,
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: "#2b2f36",
  },
  titleLabel: { fontSize: 8.5, color: "#9aa0aa", marginBottom: 2 },
  title: { fontSize: 16, fontWeight: "bold", color: "#1c1f24", marginBottom: 4 },
  section: { marginTop: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 7 },
  sectionBar: {
    width: 3,
    height: 12,
    backgroundColor: ACCENT,
    borderRadius: 1,
    marginRight: 6,
  },
  sectionTitle: { fontSize: 11, fontWeight: "bold", color: "#1c1f24" },
  table: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: BORDER },
  row: { flexDirection: "row" },
  cellLabel: {
    backgroundColor: LABEL_BG,
    color: LABEL_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  cellValue: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  cellHead: {
    backgroundColor: LABEL_BG,
    color: LABEL_COLOR,
    fontWeight: "bold",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: BORDER,
  },
  descBox: {
    backgroundColor: "#f6f7f9",
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
    color: "#3f434b",
  },
  attach: { marginTop: 8, fontSize: 9, color: "#6b7280" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 9,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 8, lineHeight: 1, textAlign: "center" },
});

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export type CapaPdfStage = {
  name: string;
  status: string;
  owner?: string;
  completedAt?: string;
};

export type CapaPdfHistoryRow = {
  atLabel: string;
  by: string;
  kind: string;
  from: string;
  to: string;
  note: string;
};

type CapaPdfProps = {
  plan: CapaPlan;
  delayed: boolean;
  nonconformity: Nonconformity | null;
  stages: CapaPdfStage[];
  history: CapaPdfHistoryRow[];
};

export default function CapaPdf({
  plan,
  delayed,
  nonconformity: nc,
  stages,
  history,
}: CapaPdfProps) {
  const event = nc?.event ?? null;
  const statusColor = STATUS_COLORS[plan.status];
  const w = (v: string | undefined) => v || "-";

  const rca = plan.rca;
  const actions = plan.actions ?? [];
  const eff = plan.effectiveness;
  const closure = plan.closure;

  // 진행 상태(=존재하는 데이터)에 따라 들어가는 섹션이 달라집니다.
  // 아래 배열에 있는 것만, 순서대로 번호를 매겨 렌더합니다.
  const sections: { title: string; body: ReactNode }[] = [];

  // 1. CAPA 기본 정보 (항상)
  sections.push({
    title: "CAPA 기본 정보",
    body: (
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cellLabel, { width: 90 }]}>CAPA 유형</Text>
          <Text style={[styles.cellValue, { flex: 1 }]}>
            {CAPA_PLAN_TYPE_NAME[plan.type]}
          </Text>
          <Text style={[styles.cellLabel, { width: 80 }]}>CAPA 상태</Text>
          <Text style={[styles.cellValue, { flex: 1 }]}>
            {CAPA_STATUS_NAME[plan.status]}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cellLabel, { width: 90 }]}>계획 시작일</Text>
          <Text style={[styles.cellValue, { flex: 1 }]}>
            {w(plan.startDateLabel)}
          </Text>
          <Text style={[styles.cellLabel, { width: 80 }]}>계획 완료일</Text>
          <Text style={[styles.cellValue, { flex: 1 }]}>
            {w(plan.dueDateLabel)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cellLabel, { width: 90 }]}>등록자</Text>
          <Text style={[styles.cellValue, { flex: 1 }]}>{w(plan.registrant)}</Text>
          <Text style={[styles.cellLabel, { width: 80 }]}>등록일</Text>
          <Text style={[styles.cellValue, { flex: 1 }]}>
            {w(plan.createdAtLabel)}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={[styles.cellLabel, { width: 90 }]}>담당자</Text>
          <Text style={[styles.cellValue, { flex: 1 }]}>{w(plan.assignee)}</Text>
          <Text style={[styles.cellLabel, { width: 80 }]}>지연 여부</Text>
          <Text style={[styles.cellValue, { flex: 1 }]}>
            {delayed ? "지연" : "정상"}
          </Text>
        </View>
      </View>
    ),
  });

  // 2. CAPA 계획 정보 (항상)
  sections.push({
    title: "CAPA 계획 정보",
    body: (
      <>
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.cellLabel, { width: 100 }]}>CAPA 필요 사유</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>{w(nc?.capaReason)}</Text>
          </View>
        </View>
        <View style={styles.descBox}>
          <Text>{w(plan.content)}</Text>
        </View>
        <Text style={styles.attach}>
          {plan.files.length
            ? `첨부파일 ${plan.files.length}건: ${plan.files
                .map((f) => f.name)
                .join(", ")}`
            : "첨부파일이 없습니다."}
        </Text>
      </>
    ),
  });

  // 3. 원인분석 정보 (원인분석이 등록된 경우에만)
  if (rca) {
    sections.push({
      title: "원인분석 정보",
      body: (
        <>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>분석 방법</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {RCA_METHOD_NAME[rca.method]}
              </Text>
              <Text style={[styles.cellLabel, { width: 80 }]}>분석자</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>{w(rca.analyst)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>분석일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(rca.analyzedAtLabel)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>직접 원인</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(rca.directCause)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>근본 원인</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(rca.rootCause)}
              </Text>
            </View>
          </View>
          <View style={styles.descBox}>
            <Text>{w(rca.content)}</Text>
          </View>
        </>
      ),
    });
  }

  // 4. 시정/예방조치 (조치가 등록된 경우에만)
  if (actions.length) {
    sections.push({
      title: "시정 / 예방조치",
      body: (
        <View>
          {actions.map((a, i) => (
            <View key={i} style={i ? { marginTop: 8 } : undefined}>
              <View style={styles.table}>
                <View style={styles.row}>
                  <Text style={[styles.cellLabel, { width: 90 }]}>조치 구분</Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {CAPA_PLAN_TYPE_NAME[a.type]}
                  </Text>
                  <Text style={[styles.cellLabel, { width: 80 }]}>조치 상태</Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {CAPA_ACTION_STATUS_NAME[a.status]}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.cellLabel, { width: 90 }]}>조치 제목</Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>{w(a.title)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.cellLabel, { width: 90 }]}>담당자</Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {a.department} · {a.assignee}
                  </Text>
                  <Text style={[styles.cellLabel, { width: 80 }]}>기한</Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {w(a.dueDateLabel)}
                  </Text>
                </View>
                <View style={styles.row}>
                  <Text style={[styles.cellLabel, { width: 90 }]}>우선순위</Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {CAPA_ACTION_PRIORITY_NAME[a.priority]}
                  </Text>
                  <Text style={[styles.cellLabel, { width: 80 }]}>완료일</Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {w(a.completedDateLabel)}
                  </Text>
                </View>
                {a.result ? (
                  <View style={styles.row}>
                    <Text style={[styles.cellLabel, { width: 90 }]}>조치 결과</Text>
                    <Text style={[styles.cellValue, { flex: 1 }]}>{a.result}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.descBox}>
                <Text>{w(a.actualContent || a.content)}</Text>
              </View>
            </View>
          ))}
        </View>
      ),
    });
  }

  // 5. 효과성 검증 (검증이 시작된 경우에만)
  if (eff) {
    sections.push({
      title: "효과성 검증",
      body: (
        <>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>검증 시작</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {[eff.startedBy, eff.startedAtLabel].filter(Boolean).join(" · ") ||
                  "-"}
              </Text>
            </View>
            {eff.result ? (
              <View style={styles.row}>
                <Text style={[styles.cellLabel, { width: 90 }]}>검증 결과</Text>
                <Text style={[styles.cellValue, { flex: 1 }]}>
                  {EFFECTIVENESS_RESULT_NAME[eff.result]}
                </Text>
                <Text style={[styles.cellLabel, { width: 80 }]}>검증일</Text>
                <Text style={[styles.cellValue, { flex: 1 }]}>
                  {w(eff.verifiedDateLabel)}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={styles.descBox}>
            <Text>검증 방법: {w(eff.method)}</Text>
          </View>
          <View style={styles.descBox}>
            <Text>검증 기준: {w(eff.criteria)}</Text>
          </View>
          {eff.opinion ? (
            <View style={styles.descBox}>
              <Text>검증 의견: {eff.opinion}</Text>
            </View>
          ) : null}
        </>
      ),
    });
  }

  // 6. CAPA 종료 정보 (종료된 경우에만)
  if (closure) {
    sections.push({
      title: "CAPA 종료 정보",
      body: (
        <>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>종료자</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(closure.closedBy)}
              </Text>
              <Text style={[styles.cellLabel, { width: 80 }]}>종료일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(closure.closedAtLabel)}
              </Text>
            </View>
          </View>
          <View style={styles.descBox}>
            <Text>{w(closure.comment)}</Text>
          </View>
        </>
      ),
    });
  }

  // 7. 연결 부적합 정보 (연결 부적합이 있을 때만)
  if (nc && event) {
    sections.push({
      title: "연결 부적합 정보",
      body: (
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.cellLabel, { width: 90 }]}>부적합 번호</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>{nc.ncNumber}</Text>
            <Text style={[styles.cellLabel, { width: 80 }]}>부적합 유형</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>
              {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cellLabel, { width: 90 }]}>부적합 상태</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>
              {NONCONFORMITY_STATUS_NAME[nc.statusCode]}
            </Text>
            <Text style={[styles.cellLabel, { width: 80 }]}>판정자</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>{w(nc.confirmedBy)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cellLabel, { width: 90 }]}>판정일시</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>
              {w(nc.confirmedAtLabel)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cellLabel, { width: 90 }]}>부적합 사유</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>{w(nc.reason)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.cellLabel, { width: 90 }]}>CAPA 판정 사유</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>{w(nc.capaReason)}</Text>
          </View>
        </View>
      ),
    });
  }

  // 8. 연결 품질 이벤트 요약 (연결 이벤트가 있을 때만)
  if (event) {
    sections.push({
      title: "연결 품질 이벤트 요약",
      body: (
        <>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>이벤트 번호</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {event.eventNumber}
              </Text>
              <Text style={[styles.cellLabel, { width: 80 }]}>심각도</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {SEVERITY_LABEL[event.severity] ?? event.severity}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>이벤트 제목</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>{event.title}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>이벤트 유형</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
              </Text>
              <Text style={[styles.cellLabel, { width: 80 }]}>고객 영향</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.customerImpact)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 90 }]}>등록자</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.registrant?.userName)}
              </Text>
              <Text style={[styles.cellLabel, { width: 80 }]}>등록일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.registerDate)}
              </Text>
            </View>
          </View>
          <View style={styles.descBox}>
            <Text>{w(event.description)}</Text>
          </View>
        </>
      ),
    });
  }

  // 9. 처리 이력 (항상)
  sections.push({
    title: "처리 이력",
    body: (
      <View style={styles.table}>
        <View style={styles.row}>
          <Text style={[styles.cellHead, { width: 95 }]}>처리일시</Text>
          <Text style={[styles.cellHead, { width: 50 }]}>처리자</Text>
          <Text style={[styles.cellHead, { width: 60 }]}>처리구분</Text>
          <Text style={[styles.cellHead, { width: 70 }]}>변경 전</Text>
          <Text style={[styles.cellHead, { width: 70 }]}>변경 후</Text>
          <Text style={[styles.cellHead, { flex: 1 }]}>처리 내용</Text>
        </View>
        {history.map((h, i) => (
          <View style={styles.row} key={i}>
            <Text style={[styles.cellValue, { width: 95 }]}>{h.atLabel}</Text>
            <Text style={[styles.cellValue, { width: 50 }]}>{h.by}</Text>
            <Text style={[styles.cellValue, { width: 60 }]}>{h.kind}</Text>
            <Text style={[styles.cellValue, { width: 70 }]}>{h.from}</Text>
            <Text style={[styles.cellValue, { width: 70 }]}>{h.to}</Text>
            <Text style={[styles.cellValue, { flex: 1 }]}>{h.note}</Text>
          </View>
        ))}
      </View>
    ),
  });

  return (
    <Document title={plan.capaNumber}>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.reportTitle}>CAPA 보고서</Text>
            <Text style={styles.reportSubtitle}>
              Corrective / Preventive Action Report
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.capaNumber}>{plan.capaNumber}</Text>
            <Badge
              label={CAPA_STATUS_NAME[plan.status]}
              bg={statusColor.bg}
              color={statusColor.color}
            />
          </View>
        </View>
        <View style={styles.divider} />

        {/* 제목 */}
        <Text style={styles.titleLabel}>CAPA 제목</Text>
        <Text style={styles.title}>{plan.title}</Text>

        {/* 단계별 진행 요약 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>단계별 진행 요약</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellHead, { flex: 1 }]}>단계</Text>
              <Text style={[styles.cellHead, { width: 70, textAlign: "center" }]}>
                상태
              </Text>
              <Text style={[styles.cellHead, { flex: 1.2 }]}>담당자 · 완료일</Text>
            </View>
            {stages.map((s, i) => (
              <View style={styles.row} key={i}>
                <Text style={[styles.cellValue, { flex: 1 }]}>{s.name}</Text>
                <Text
                  style={[styles.cellValue, { width: 70, textAlign: "center" }]}
                >
                  {s.status}
                </Text>
                <Text style={[styles.cellValue, { flex: 1.2 }]}>
                  {[s.owner, s.completedAt].filter(Boolean).join(" · ") || "-"}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {sections.map((s, i) => (
          <View style={styles.section} key={i}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBar} />
              <Text style={styles.sectionTitle}>
                {i + 1}. {s.title}
              </Text>
            </View>
            {s.body}
          </View>
        ))}
      </Page>
    </Document>
  );
}
