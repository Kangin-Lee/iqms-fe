import LoopingVideo from "@/components/common/LoopingVideo";
import LoginForm from "./components/LoginForm";
import PasswordResetDialog from "./components/PasswordResetDialog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export default function LoginPage() {
  return (
    <div className="flex h-svh w-full">
      {/* 좌측: 로그인 폼 */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-xs">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to IQMS</h1>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Please sign in or sign up below.
          </p>

          <LoginForm />
          
          <Button
            className="w-full my-2"
            variant="outline"
            nativeButton={false}
            render={<Link to="/auth/signup" />}
          >
            회원가입
          </Button>

          <div className="flex justify-end">
            <PasswordResetDialog />
          </div>
        </div>
      </div>

      {/* 우측: 반복 재생 영상 — 화면이 좁아지면 숨김 */}
      <LoopingVideo
        src="/images/login/login.mp4"
        className="hidden flex-1 lg:block"
        overlayClassName="flex flex-col justify-end p-12 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
      >
        <h2 className="text-xl font-semibold text-white">
          IQMS: Intelligent Quality Management System
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/80">
          IQMS는 데이터 기반 분석과 자동화 기능을 통해 품질경영 업무를 효율적으로
          지원하는 지능형 시스템입니다. <br />운영 데이터와의 연계를 바탕으로 표준 준수와
          지속적 개선 활동을 체계적으로 뒷받침합니다.
        </p>
      </LoopingVideo>
    </div>
  );
}
