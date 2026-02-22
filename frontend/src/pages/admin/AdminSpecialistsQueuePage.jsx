import { AdminAssignmentQueuePage } from "../../components/admin/AdminAssignmentQueuePage";
import { ADMIN_QUEUE_TYPES } from "../../lib/api";

const assignmentFields = [
  {
    key: "detective_id",
    label: "Detective",
    roleKeywords: ["detective"],
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
      title="Detective / Judge Queue"
      description="Cases missing detective assignment, judge assignment, or both."
      queueType={ADMIN_QUEUE_TYPES.SPECIALISTS_UNASSIGNED}
      assignmentFields={assignmentFields}
      emptyMessage="All active cases already have both detective and judge assigned."
    />
  );
}
