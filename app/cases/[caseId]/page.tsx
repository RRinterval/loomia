import { notFound } from "next/navigation";
import { CaseApp } from "@/components/case/CaseApp";
import { canAccessCase, requireUser } from "@/lib/auth";
import { loadCaseData } from "@/lib/data";
import { isValidObjectId } from "mongoose";

export default async function CasePage({ params }: PageProps<"/cases/[caseId]">) {
  const { caseId } = await params;
  const user = await requireUser();
  if (!isValidObjectId(caseId) || !canAccessCase(user, caseId)) notFound();

  const data = await loadCaseData(user, caseId);
  if (!data) notFound();

  return (
    <CaseApp
      viewer={{ id: user.id, name: user.name, role: user.role }}
      hasMultipleCases={user.role !== "admin" && user.caseIds.length > 1}
      data={data}
    />
  );
}
