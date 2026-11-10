import { notFound } from "next/navigation";
import { employees, getEmployee } from "@/data/employees";
import { DMView } from "@/components/chat/DMView";

export function generateStaticParams() {
  return employees.map((e) => ({ id: e.id }));
}

export default async function DMPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getEmployee(id)) notFound();
  return <DMView employeeId={id} />;
}
