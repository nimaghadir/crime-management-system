import { AdminAssignmentQueuePage } from "../../components/admin/AdminAssignmentQueuePage";
import { ADMIN_QUEUE_TYPES } from "../../lib/api";

const assignmentFields = [
  {
    key: "detective_id",
    label: "Detective",
    roleKeywords: ["detective"],
  },
  {
    key: "coroner_id",
    label: "Coroner / Medical Examiner",
    roleKeywords: ["coroner", "doctor", "forensic"],
  },
  {
    key: "judge_id",
    label: "Judge",
    roleKeywords: ["judge"],
  },
];

export function AdminSpecialistsQueuePage() {
  return (
    <AdminAssignmentQueuePage
      title="Specialists Assignment Queue"
      description="Cases missing detective, coroner (doctor), or judge assignment."
      queueType={ADMIN_QUEUE_TYPES.SPECIALISTS_UNASSIGNED}
      assignmentFields={assignmentFields}
      emptyMessage="All active cases already have detective, coroner, and judge assigned."
    />
  );
}
