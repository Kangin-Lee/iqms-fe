import z from "zod";

/** 비밀번호: 영문 + 숫자 + 특수문자를 각각 1자 이상 포함, 8자 이상. */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
/** 전화번호: 010-1234-5678 형태(하이픈 유무 허용). */
const PHONE_REGEX = /^01[0-9]-?\d{3,4}-?\d{4}$/;

/** 프로필 수정: 이름·전화번호·부서(이메일은 계정 식별자라 수정 불가). */
export const profileSchema = z.object({
  name: z
    .string()
    .min(1, "이름을 입력해 주세요.")
    .max(10, "이름은 10자 이하로 입력해 주세요."),
  phone: z
    .string()
    .min(1, "전화번호를 입력해 주세요.")
    .regex(PHONE_REGEX, "올바른 전화번호가 아닙니다. (예: 010-1234-5678)"),
  department: z.string().min(1, "부서를 선택해 주세요."),
});
export type ProfileValues = z.infer<typeof profileSchema>;

/** 비밀번호 변경: 현재 비밀번호 확인 + 새 비밀번호(복잡도·일치·기존과 상이). */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해 주세요."),
    newPassword: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .regex(
        PASSWORD_REGEX,
        "영문·숫자·특수문자를 모두 포함해 8자 이상 입력해 주세요."
      ),
    newPasswordConfirm: z.string().min(1, "비밀번호를 다시 입력해 주세요."),
  })
  // 교차 검증은 superRefine 하나로 처리해 각 필드에 에러가 정확히 매핑되게 합니다.
  // (.refine을 여러 개 체인하면 두 번째 이후 에러가 필드로 붙지 않는 이슈가 있음)
  .superRefine((v, ctx) => {
    if (v.newPassword !== v.newPasswordConfirm) {
      ctx.addIssue({
        code: "custom",
        path: ["newPasswordConfirm"],
        message: "비밀번호가 일치하지 않습니다.",
      });
    }
    if (v.newPassword && v.currentPassword === v.newPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "기존 비밀번호와 다른 비밀번호를 사용해 주세요.",
      });
    }
  });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
