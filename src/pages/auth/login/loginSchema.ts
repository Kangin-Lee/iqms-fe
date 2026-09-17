import z from "zod";

// 로그인은 "기존 비밀번호"를 입력하는 화면이므로 복잡도 검증은 하지 않고
// 비어있지 않은지만 확인합니다. (복잡도 규칙은 회원가입 스키마에서 검증)

export type LoginValues = z.infer<typeof loginSchema>;

export const loginSchema = z.object({
    userId: z.string().min(1, "아이디를 입력해 주세요."),
    password: z.string().min(1, "비밀번호를 입력해 주세요."),
    keepSignedIn: z.boolean(),
  });