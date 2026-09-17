import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { ChangeRequest } from "../queries";

// @react-pdf 기본 폰트는 한글을 렌더하지 못하므로 한글 폰트 등록.
// 외부 URL은 CORS로 차단되므로 public/ 의 로컬 폰트(같은 출처)를 사용.
Font.register({
  family: "NanumGothic",
  fonts: [
    { src: "/fonts/NanumGothic-Regular.ttf" },
    { src: "/fonts/NanumGothic-Bold.ttf", fontWeight: "bold" },
  ],
});

// 상태 배지 색상(화면 배지와 톤 통일).
const STATUS_COLORS: Record<number, { bg: string; color: string }> = {
  1: { bg: "#e0f2fe", color: "#0369a1" },
  2: { bg: "#dbeafe", color: "#1d4ed8" },
  3: { bg: "#fef3c7", color: "#b45309" },
  4: { bg: "#ffe4e6", color: "#be123c" },
  5: { bg: "#ede9fe", color: "#6d28d9" },
  6: { bg: "#e0e7ff", color: "#4338ca" },
  7: { bg: "#fee2e2", color: "#b91c1c" },
  8: { bg: "#cffafe", color: "#0e7490" },
  9: { bg: "#ccfbf1", color: "#0f766e" },
  10: { bg: "#ffedd5", color: "#c2410c" },
  11: { bg: "#d1fae5", color: "#047857" },
  12: { bg: "#e2e8f0", color: "#334155" },
  13: { bg: "#f4f4f5", color: "#71717a" },
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
  crNumber: { fontSize: 10, color: "#4b5563", marginBottom: 5 },
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
    marginBottom: 10,
    color: "#3f434b",
  },
  descLabel: { fontSize: 8.5, color: "#9aa0aa", marginBottom: 3 },
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

export default function ChangeRequestPdf({ cr }: { cr: ChangeRequest }) {
  const statusColor = STATUS_COLORS[cr.status] ?? STATUS_COLORS[1];
  const w = (v: string | undefined) => v || "-";

  return (
    <Document title={cr.crNumber}>
      <Page size="A4" style={styles.page}>
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.reportTitle}>형상변경요청서</Text>
            <Text style={styles.reportSubtitle}>Change Request</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.crNumber}>{cr.crNumber}</Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {cr.grade === "urgent" && (
                <Badge label="긴급" bg="#fee2e2" color="#b91c1c" />
              )}
              <Badge
                label={cr.statusName}
                bg={statusColor.bg}
                color={statusColor.color}
              />
            </View>
          </View>
        </View>
        <View style={styles.divider} />

        {/* 제목 */}
        <Text style={styles.titleLabel}>변경요청 제목</Text>
        <Text style={styles.title}>{cr.title}</Text>

        {/* 1. 기본 정보 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>1. 기본 정보</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>변경 구분</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.changeTypeName)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>긴급 여부</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {cr.grade === "urgent" ? "긴급" : "일반"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>요청자</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.requester)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>요청부서</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.requestDepartment)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>요청일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.requestDate)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>희망 완료일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.requestedApplyDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. 변경 대상 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>2. 변경 대상 (형상 항목)</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>대상 유형</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.targetTypeName)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>대상명</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.targetItem)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>리비전</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.currentRevision)} → {w(cr.targetRevision)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>관련 업무</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.relatedProcess)}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. 변경 내용 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>3. 변경 내용</Text>
          </View>
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>변경 요청 사유</Text>
            <Text>{w(cr.reason)}</Text>
          </View>
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>현재 문제점</Text>
            <Text>{w(cr.asIs)}</Text>
          </View>
          <View style={styles.descBox}>
            <Text style={styles.descLabel}>기대효과</Text>
            <Text>{w(cr.toBe)}</Text>
          </View>
        </View>

        {/* 4. 영향 분석 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>4. 영향 분석</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>영향 범위</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {cr.impactScope.length > 0 ? cr.impactScope.join(", ") : "-"}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>품질 영향</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.qualityImpact)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>일정 영향</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.scheduleImpact)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>원가 영향</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.costImpact)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>재검증·재인증</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.revalidationRequired)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>고객·규제 승인</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.customerApprovalRequired)}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. 적용·검증 계획 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>5. 적용·검증 계획</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>적용 담당자</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.applyAssignee)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>적용 예정일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.applyDate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.cellLabel, { width: 95 }]}>검증 담당자</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.verifyAssignee)}
              </Text>
              <Text style={[styles.cellLabel, { width: 75 }]}>검증 예정일</Text>
              <Text style={[styles.cellValue, { flex: 1 }]}>
                {w(cr.verifyDate)}
              </Text>
            </View>
          </View>
        </View>

        {/* 6. 검토·승인 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>6. 검토·승인</Text>
          </View>
          <View style={styles.table}>
            <View style={styles.row}>
              <Text style={[styles.cellHead, { flex: 1 }]}>구분</Text>
              <Text style={[styles.cellHead, { flex: 1 }]}>이름</Text>
              <Text style={[styles.cellHead, { flex: 1 }]}>부서</Text>
              <Text style={[styles.cellHead, { width: 90, textAlign: "center" }]}>
                상태
              </Text>
            </View>
            {[
              ...cr.reviewers.map((p) => ({ role: "검토자", p, done: "검토" })),
              ...cr.approvers.map((p) => ({ role: "승인자", p, done: "승인" })),
            ].length ? (
              [
                ...cr.reviewers.map((p) => ({ role: "검토자", p, done: "검토" })),
                ...cr.approvers.map((p) => ({ role: "승인자", p, done: "승인" })),
              ].map(({ role, p, done }) => (
                <View style={styles.row} key={`${role}-${p.id}`}>
                  <Text style={[styles.cellValue, { flex: 1 }]}>{role}</Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {p.name} {p.positionName}
                  </Text>
                  <Text style={[styles.cellValue, { flex: 1 }]}>
                    {p.teamName}
                  </Text>
                  <View
                    style={[styles.cellValue, { width: 90, alignItems: "center" }]}
                  >
                    {p.done ? (
                      <Badge label={done} bg="#e6f4ea" color="#2e7d46" />
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
          {cr.requestComment ? (
            <Text style={styles.comment}>접수 의견 · {cr.requestComment}</Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}
