import { Card } from "@/components/ui/Card";

export function PaymentDisclosure({
  photographer,
  totalAmount,
  payingLabel,
  payingAmount,
}: {
  photographer: {
    businessName: string;
    representativeName: string;
    businessRegNo: string;
    activeRegions: string[];
  };
  totalAmount: number;
  payingLabel: string;
  payingAmount: number;
}) {
  return (
    <Card className="mb-3 p-4 text-sm">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            촬영 서비스 제공자 (판매자)
          </p>
          <p className="text-foreground">{photographer.businessName}</p>
          <p className="text-muted-foreground">
            대표자 {photographer.representativeName} · 사업자등록번호{" "}
            {photographer.businessRegNo}
          </p>
          <p className="text-muted-foreground">
            활동지역 {photographer.activeRegions.join(", ")}
          </p>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            플랫폼 운영자 (통신판매중개자)
          </p>
          <p className="text-foreground">씬파인더(SceneFinder)</p>
          <p className="text-muted-foreground">사업자등록번호·통신판매신고 준비중</p>
          <p className="text-muted-foreground">고객센터: 마이페이지 &gt; 고객센터 1:1 문의</p>
        </div>
      </div>
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex justify-between text-muted-foreground">
          <span>총 촬영금액</span>
          <span>{totalAmount.toLocaleString()}원</span>
        </div>
        <div className="mt-1 flex justify-between font-medium text-foreground">
          <span>{payingLabel}</span>
          <span>{payingAmount.toLocaleString()}원</span>
        </div>
      </div>
      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
        본 촬영 서비스의 판매자 및 실제 제공자는 위에 표시된 사진작가입니다. 플랫폼은
        거래를 중개하고 예약·결제·정산·고객상담 및 분쟁처리 서비스를 제공합니다.
      </p>
    </Card>
  );
}
