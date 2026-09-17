import z from "zod";

/** 회사 이메일 고정 도메인. 사용자는 앞부분(로컬 파트)만 입력합니다. */
export const EMAIL_DOMAIN = "i-ops.co.kr";

/** 비밀번호: 영문 + 숫자 + 특수문자를 각각 1자 이상 포함, 8자 이상. */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

/** 이메일 로컬 파트(앞부분) 허용 문자. */
const EMAIL_ID_REGEX = /^[A-Za-z0-9._%+-]+$/;

/** 전화번호: 010-1234-5678 형태(하이픈 유무 허용). */
const PHONE_REGEX = /^01[0-9]-?\d{3,4}-?\d{4}$/;

export type SignupValues = z.infer<typeof signupSchema>;

export const signupSchema = z
  .object({
    emailId: z
      .string()
      .min(1, "이메일을 입력해 주세요.")
      .regex(EMAIL_ID_REGEX, "이메일 형식이 올바르지 않습니다."),
    password: z
      .string()
      .min(8, "비밀번호는 8자 이상이어야 합니다.")
      .regex(
        PASSWORD_REGEX,
        "영문·숫자·특수문자를 모두 포함해 8자 이상 입력해 주세요."
      ),
    passwordConfirm: z.string().min(1, "비밀번호를 다시 입력해 주세요."),
    name: z
      .string()
      .min(1, "이름을 입력해 주세요.")
      .max(10, "이름은 10자 이하로 입력해 주세요."),
    phone: z
      .string()
      .min(1, "전화번호를 입력해 주세요.")
      .regex(PHONE_REGEX, "올바른 전화번호가 아닙니다. (예: 010-1234-5678)"),
    department: z.string().min(1, "부서를 선택해 주세요."),
  })
  // 비밀번호 재확인 일치 검증(에러는 재확인 필드에 표시).
  .refine((v) => v.password === v.passwordConfirm, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["passwordConfirm"],
  });

/** 부서 선택 옵션. */
export const DEPARTMENT_OPTIONS = [
  "품질관리실",
  "개발센터",
  "생산팀",
  "구매팀",
  "영업팀",
  "운영관리팀",
] as const;
