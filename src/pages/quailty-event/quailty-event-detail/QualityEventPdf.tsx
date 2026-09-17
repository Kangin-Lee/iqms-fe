import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { QualityEvent } from "@/pages/quailty-event/quailty-event-list/columns";

// @react-pdf 기본 폰트는 한글을 렌더하지 못하므로 한글 폰트 등록.
// 외부 URL은 CORS로 차단되므로 public/ 의 로컬 폰트(같은 출처)를 사용.
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

// 상태 배지 색상
const STATUS_COLORS: Record<number, { bg: string; color: string }> = {
  1: { bg: "#eef1f5", color: "#5b6472" }, // 작성중
  2: { bg: "#e7f0fb", color: "#2f6fb3" }, // 검토중
  3: { bg: "#e6f4ea", color: "#2e7d46" }, // 종료
  4: { bg: "#fdeaea", color: "#c0392b" }, // 반려
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  /* 헤더 */
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
  eventNumber: { fontSize: 10, color: "#4b5563", marginBottom: 5 },
  divider: {
    marginTop: 12,
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: "#2b2f36",
  },

  /* 제목 */
  titleLabel: { fontSize: 8.5, color: "#9aa0aa", marginBottom: 2 },
  title: { fontSize: 16, fontWeight: "bold", color: "#1c1f24", marginBottom: 4 },

  /* 섹션 */
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

  /* 테이블 */
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

  /* 설명 박스 */
  descBox: {
    backgroundColor: "#f6f7f9",
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
    color: "#3f434b",
  },

  /* 배지 */
  badge: {
    alignSelf: "flex-start",
    borderRadius: 9,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 8, lineHeight: 1, textAlign: "center" },

  comment: { marginTop: 8, fontSize: 9, color: "#6b7280" },
});

function Badge({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function QualityEventPdf({ event }: { event: QualityEvent }) {
  const statusColor = STATUS_COLORS[event.status] ?? STATUS_COLORS[1];
  const w = (v: string | undefined) => v || "-";

  return (
    <Document title={event.eventNumber}>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.reportTitle}>품질 이벤트 보고서</Text>
            <Text style={styles.reportSubtitle}>Quality Event Report</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.eventNumber}>{event.eventNumber}</Text>
            <Badge
              label={event.statusName}
              bg={statusColor.bg}
              color={statusColor.color}
            />
          </View>
        </View>
        <View style={styles.divider} />

        {/* 제목 */}
        <Text style={styles.titleLabel}>이벤트 제목</Text>
        <Text style={styles.title}>{event.title}</Text>

        {/* 1. 기본 정보 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>1. 기본 정보</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>이벤트 유형</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>심각도</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {SEVERITY_LABEL[event.severity] ?? event.severity}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>등록자</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.registrant?.userName)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>등록부서</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.registrationDepartment)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>발생일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.occurrenceDate)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>발견일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.discoveryDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. 이벤트 내용 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>2. 이벤트 내용</Text>
          </View>
          <View style={styles.descBox}>
            <Text>{w(event.description)}</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 110 }]}>관련 프로젝트</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.relatedProject)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 110 }]}>관련 제품/서비스</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.relatedProduct)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 110 }]}>관련 업무/프로세스</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.relatedProcess)}
              </Text>
            </View>
          </View>

          {/* 첨부파일 (있을 때만) */}
          {event.files?.length ? (
            <View style={[styles.table, { marginTop: 8 }]}>
              <View style={styles.row}>
                <Text style={[styles.cellHead, { flex: 1 }]}>첨부파일</Text>
                <Text
                  style={[styles.cellHead, { width: 100, textAlign: "center" }]}
                >
                  크기
                </Text>
              </View>
              {event.files.map((file) => (
                <View style={styles.row} key={file.id}>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {file.name}
                  </Text>
                  <Text
                    style={[
                      styles.cellValue,
                      { width: 100, textAlign: "center" },
                    ]}
                  >
                    {formatSize(file.size)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {/* 3. 초기 영향 판단 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>3. 초기 영향 판단</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>고객 영향</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.customerImpact)}
              </Text>
              <Text style={[styles.cellLabel, { width: 90 }]}>업무/품질 영향</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(event.businessImpact)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>즉시 조치</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {event.immediateActionRequired === "예" ? "필요" : "불필요"} (
                {w(event.immediateActionRequired)})
                {event.immediateActionContent
                  ? ` · ${event.immediateActionContent}`
                  : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. 접수 처리 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>4. 접수 처리</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellHead, { flex: 1 }]}>검토자</Text>
              <Text style={[styles.cellHead, { flex: 1 }]}>부서</Text>
              <Text style={[styles.cellHead, { width: 110, textAlign: "center" }]}>
                검토 상태
              </Text>
            </View>
            {event.reviewers?.length ? (
              event.reviewers.map((r) => (
                <View style={styles.row} key={r.id}>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {r.name} {r.positionName}
                  </Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>{r.teamName}</Text>
                  <View
                    style={[
                      styles.cellValue,
                      { width: 110, alignItems: "center" },
                    ]}
                  >
                    {r.reviewed ? (
                      <Badge label="완료" bg="#e6f4ea" color="#2e7d46" />
                    ) : (
                      <Badge label="대기" bg="#eef1f5" color="#5b6472" />
                    )}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.row}>
                <Text style={[styles.cellValue, { flex: 1 }]}>-</Text>
              </View>
            )}
          </View>
          {event.registrationComment ? (
            <Text style={styles.comment}>
              등록 의견 · {event.registrationComment}
            </Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
