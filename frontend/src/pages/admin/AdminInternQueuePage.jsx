import { AdminAssignmentQueuePage } from "../../components/admin/AdminAssignmentQueuePage";
import { ADMIN_QUEUE_TYPES } from "../../lib/api";

const assignmentFields = [
  {
    key: "intern_id",
    label: "Cadet / Intern",
    roleKeywords: ["cadet", "intern"],
  },
];

export function AdminInternQueuePage() {
  return (
    <AdminAssignmentQueuePage
      title="Intern Assignment Queue"
      description="Cases that have not been forwarded to a cadet/intern yet."
      queueType={ADMIN_QUEUE_TYPES.INTERN_UNASSIGNED}
      assignmentFields={assignmentFields}
      emptyMessage="All active cases already have an intern assigned."
    />
  );
}
